import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";
import { clearSession, refreshSessionFromSupabase } from "../store";
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
    // Hardened browsers may disable session storage
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

export function isConfigured() {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL
    && import.meta.env.VITE_SUPABASE_ANON_KEY
    && import.meta.env.VITE_SUPABASE_URL !== "https://your-supabase-project.supabase.co",
  );
}

function mapSupabaseError(error: any): AuthError {
  const message = error?.message || "";
  if (message.toLowerCase().includes("invalid login credentials")) {
    return new AuthError("invalid_credentials");
  }
  if (message.toLowerCase().includes("email not confirmed")) {
    return new AuthError("invalid_credentials"); // Map to credentials or unconfirmed
  }
  return new AuthError("unknown");
}

export async function validateSupabaseUser(supabaseUser: SupabaseUser) {
  if (!supabaseUser || !supabaseUser.email) {
    return false;
  }
  // Retrieve profile details to check role and status
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", supabaseUser.id)
    .single();

  if (error || !profile) {
    return false;
  }
  if (profile.status === "disabled") {
    return false;
  }
  return true;
}

export async function ensureSupabaseProfile(supabaseUser: SupabaseUser): Promise<User> {
  const profile = await refreshSessionFromSupabase(supabaseUser);
  if (!profile) {
    await supabase.auth.signOut();
    clearSession();
    throw new AuthError("invalid_credentials");
  }
  return profile;
}

export async function startEmailLogin(email: string, password: string) {
  if (!isConfigured()) throw new AuthError("configuration");

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) throw mapSupabaseError(error);
    if (!data.user) throw new AuthError("unknown");

    return await ensureSupabaseProfile(data.user);
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw mapSupabaseError(error);
  }
}

export async function reauthenticatePassword(email: string, password: string) {
  // Supabase manages sessions automatically. To reauthenticate, we can call signInWithPassword again
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw mapSupabaseError(error);
}

export async function changeUserPassword(currentPassword: string, newPassword: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) throw new AuthError("invalid_credentials");
  await reauthenticatePassword(user.email, currentPassword);
  
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) throw new Error(error.message);
}

export async function authorizeSupabaseUser(supabaseUser: SupabaseUser | null) {
  if (!supabaseUser) {
    clearSession();
    return null;
  }
  try {
    return await ensureSupabaseProfile(supabaseUser);
  } catch (error) {
    rememberAuthError(error instanceof AuthError ? error.code : "unknown");
    await supabase.auth.signOut();
    clearSession();
    return null;
  }
}

export async function signOutEverywhere() {
  clearSession();
  await supabase.auth.signOut();
}
