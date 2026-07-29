import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
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
      // Check if email exists in verified users
      const q = query(collection(db, "users"), where("email", "==", normalizedEmail));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        // Look up pending profiles to see if they registered but are unverified
        const pendingQ = query(collection(db, "pending_profiles"), where("email", "==", normalizedEmail));
        const pendingSnap = await getDocs(pendingQ);
        if (pendingSnap.empty) {
          return { success: true, data: "not_registered", error: null };
        }
        return { success: true, data: "unverified", error: null };
      }
      // Email exists in DB — verified
      return { success: true, data: "verified", error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "Unable to check this email address." };
    }
  },

  async login(email: string, password: string): Promise<ApiResponse<import("firebase/auth").User>> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@")) {
      return { success: false, data: null, error: "Sign in with your registered email address." };
    }

    try {
      const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      const firebaseUser = credential.user;
      return { success: true, data: firebaseUser, error: null };
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
};
