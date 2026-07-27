import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail as firebaseSendPasswordReset,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import type { ApiResponse } from "../config/app.config";
import type { User } from "../types";

export type LoginEmailStatus = "not_registered" | "unverified" | "verified";

export const AuthService = {
  async checkLoginEmail(email: string): Promise<ApiResponse<LoginEmailStatus>> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@")) {
      return { success: false, data: null, error: "Enter a valid email address." };
    }

    try {
      // Only check if the email is registered — do NOT rely on the Firestore
      // 'verified' field (it can be stale from old Supabase migration data).
      // The authoritative verified check happens inside login() using Firebase Auth.
      const q = query(collection(db, "users"), where("email", "==", normalizedEmail));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return { success: true, data: "not_registered", error: null };
      }
      // Email exists in DB — treat as verified here; real check is in login()
      return { success: true, data: "verified", error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "Unable to check this email address." };
    }
  },

  async login(email: string, password: string): Promise<ApiResponse<User>> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@")) {
      return { success: false, data: null, error: "Sign in with your registered email address." };
    }

    try {
      const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      const firebaseUser = credential.user;

      // ── Email verification gate (Firebase Auth is the authoritative source) ──
      if (!firebaseUser.emailVerified) {
        await firebaseSignOut(auth);
        return {
          success: false,
          data: null,
          error: "Your email is not verified yet. Please check your inbox and click the verification link before signing in.",
        };
      }

      const userId = firebaseUser.uid;
      if (import.meta.env.DEV) console.debug("Authenticated user for profile load", { userId });

      // Find profile by UID first, then fall back to email (handles migrated accounts)
      let profile: User | null = null;
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        profile = { id: userId, ...userSnap.data() } as User;
      } else {
        // Migrated account: find by email and update document ID to Firebase UID
        const q = query(collection(db, "users"), where("email", "==", normalizedEmail));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const oldData = snapshot.docs[0].data();
          profile = { ...oldData, id: userId, verified: true } as User;
          await setDoc(userRef, profile);
        } else {
          // No profile at all — create a minimal one
          profile = {
            id: userId,
            email: normalizedEmail,
            full_name: String(firebaseUser.displayName || normalizedEmail),
            student_number: "",
            course: "BSIT",
            year_level: "1",
            role: "student",
            verified: true,
          };
          await setDoc(userRef, profile);
        }
      }

      if (import.meta.env.DEV) console.debug("Profile loaded after sign-in", { profileId: profile.id });
      return { success: true, data: profile, error: null };
    } catch (err: any) {
      const isCredentialError = err?.code === "auth/invalid-credential"
        || err?.code === "auth/wrong-password"
        || err?.code === "auth/user-not-found";
      const message = isCredentialError
        ? "Invalid email or password."
        : err?.message || "An unexpected error occurred.";
      return { success: false, data: null, error: message };
    }
  },

  async logout(): Promise<ApiResponse<void>> {
    try {
      await firebaseSignOut(auth);
      return { success: true, data: null, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async sendPasswordResetEmail(email: string, _redirectTo: string): Promise<ApiResponse<void>> {
    try {
      await firebaseSendPasswordReset(auth, email);
      return { success: true, data: null, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },
};
