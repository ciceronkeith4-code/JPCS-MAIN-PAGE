import {
  EmailAuthProvider,
  getIdTokenResult,
  reauthenticateWithCredential,
  reload,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "../../firebase/config";
import { clearSession, refreshSessionFromFirebase } from "../store";
import type { User } from "../types";

const AUTH_ERROR_STORAGE_KEY = "jpcs_auth_error";

export type AuthErrorCode =
  | "invalid_credentials"
  | "disabled_account"
  | "too_many_requests"
  | "network"
  | "configuration"
  | "unknown";

const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  invalid_credentials: "Invalid email or password. Please check your credentials and try again.",
  disabled_account: "This account has been disabled. Contact your administrator.",
  too_many_requests: "Too many login attempts. Please wait and try again later.",
  network: "The authentication service could not be reached. Check your connection and try again.",
  configuration: "Authentication is not configured yet. Please contact the administrator.",
  unknown: "Sign in could not be completed. Please try again.",
};

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message = AUTH_ERROR_MESSAGES[code]) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

export function rememberAuthError(code: AuthErrorCode) {
  try {
    sessionStorage.setItem(AUTH_ERROR_STORAGE_KEY, code);
  } catch {
    // Hardened browsers may disable session storage; the next login still works.
  }
}

export function consumeAuthError() {
  try {
    const code = sessionStorage.getItem(AUTH_ERROR_STORAGE_KEY) as AuthErrorCode | null;
    sessionStorage.removeItem(AUTH_ERROR_STORAGE_KEY);
    return code ? AUTH_ERROR_MESSAGES[code] || AUTH_ERROR_MESSAGES.unknown : null;
  } catch {
    return null;
  }
}

function isConfigured() {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY
    && import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
    && import.meta.env.VITE_FIREBASE_PROJECT_ID
    && import.meta.env.VITE_FIREBASE_APP_ID
    && import.meta.env.VITE_FIREBASE_API_KEY !== "placeholder-api-key",
  );
}

function mapFirebaseError(error: unknown): AuthError {
  const code = error && typeof error === "object" && "code" in error
    ? String((error as { code?: unknown }).code)
    : "";
  if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential" || code === "auth/invalid-email") {
    return new AuthError("invalid_credentials");
  }
  if (code === "auth/user-disabled") return new AuthError("disabled_account");
  if (code === "auth/too-many-requests") return new AuthError("too_many_requests");
  if (code === "auth/network-request-failed") return new AuthError("network");
  if (code === "auth/invalid-api-key" || code === "auth/configuration-not-found") {
    return new AuthError("configuration");
  }
  return new AuthError("unknown");
}

export async function validateFirebaseUser(firebaseUser: FirebaseUser, forceRefresh = true) {
  await reload(firebaseUser);
  if (!firebaseUser.email || !firebaseUser.emailVerified) {
    return false;
  }

  const tokenResult = await getIdTokenResult(firebaseUser, forceRefresh);
  return tokenResult.signInProvider === "password"
    && (tokenResult.claims.role === "student" || tokenResult.claims.role === "admin");
}

export async function ensureFirebaseProfile(firebaseUser: FirebaseUser, forceRefresh = true): Promise<User> {
  const valid = await validateFirebaseUser(firebaseUser, forceRefresh);
  if (!valid) {
    await signOut(auth).catch(() => undefined);
    clearSession();
    throw new AuthError("invalid_credentials");
  }

  const profile = await refreshSessionFromFirebase(firebaseUser);
  if (!profile) {
    await signOut(auth).catch(() => undefined);
    clearSession();
    throw new AuthError("invalid_credentials");
  }
  const tokenResult = await getIdTokenResult(firebaseUser);
  return {
    ...profile,
    role: tokenResult.claims.admin === true ? "admin" : "student",
  };
}

export async function startEmailLogin(email: string, password: string) {
  if (!isConfigured()) throw new AuthError("configuration");

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const result = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    return await ensureFirebaseProfile(result.user);
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw mapFirebaseError(error);
  }
}

export async function reauthenticatePassword(email: string, password: string, firebaseUser: FirebaseUser) {
  const credential = EmailAuthProvider.credential(email.trim().toLowerCase(), password);
  return reauthenticateWithCredential(firebaseUser, credential);
}

export async function changeUserPassword(currentPassword: string, newPassword: string) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new AuthError("invalid_credentials");
  await reauthenticatePassword(user.email, currentPassword, user);
  await updatePassword(user, newPassword);
}

export async function authorizeFirebaseUser(firebaseUser: FirebaseUser | null) {
  if (!firebaseUser) {
    clearSession();
    return null;
  }
  try {
    return await ensureFirebaseProfile(firebaseUser, false);
  } catch (error) {
    rememberAuthError(error instanceof AuthError ? error.code : "unknown");
    await signOut(auth).catch(() => undefined);
    clearSession();
    return null;
  }
}

export async function signOutEverywhere() {
  clearSession();
  await signOut(auth);
}
