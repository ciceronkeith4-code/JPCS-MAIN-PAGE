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
      const q = query(collection(db, "users"), where("email", "==", normalizedEmail));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return { success: true, data: "not_registered", error: null };
      }
      const status: LoginEmailStatus = "verified";
      return { success: true, data: status, error: null };
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
      const userId = credential.user.uid;

      if (import.meta.env.DEV) console.debug("Authenticated user for profile load", { userId });

      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);

      let profile: User;

      if (!userSnap.exists()) {
        // Create profile document if it does not exist yet
        const newProfile: User = {
          id: userId,
          email: normalizedEmail,
          full_name: String(credential.user.displayName || normalizedEmail),
          student_number: "",
          course: "BSIT",
          year_level: "1",
          role: "student",
          verified: false,
        };
        await setDoc(userRef, newProfile);
        profile = newProfile;
      } else {
        profile = { id: userId, ...userSnap.data() } as User;
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
