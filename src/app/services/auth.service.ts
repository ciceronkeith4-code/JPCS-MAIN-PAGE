import { supabase } from "../supabase";
import type { ApiResponse } from "../config/app.config";
import type { User } from "../types";
import { PROFILE_TABLE } from "./profile.service";

export type LoginEmailStatus = "not_registered" | "unverified" | "verified";

export const AuthService = {
  async checkLoginEmail(email: string): Promise<ApiResponse<LoginEmailStatus>> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@")) {
      return { success: false, data: null, error: "Enter a valid email address." };
    }

    try {
      const { data, error } = await supabase.rpc("check_login_email", { login_email: normalizedEmail });
      if (error) {
        const checkerUnavailable = error.code === "PGRST202"
          || error.message.includes("check_login_email")
          || error.message.includes("schema cache");
        return {
          success: false,
          data: null,
          error: checkerUnavailable
            ? "Email checking is temporarily unavailable. The portal database update has not been applied yet."
            : error.message,
        };
      }
      if (data !== "not_registered" && data !== "unverified" && data !== "verified") {
        return { success: false, data: null, error: "The account status could not be confirmed." };
      }
      return { success: true, data, error: null };
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
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (authError || !authData.user) {
        return { success: false, data: null, error: authError?.message || "Invalid email or password." };
      }

      if (import.meta.env.DEV) console.debug("Authenticated user for profile load", { userId: authData.user.id });
      const { data: existingProfile, error: profileError } = await supabase
        .from(PROFILE_TABLE)
        .select("*")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (profileError) {
        await supabase.auth.signOut();
        return { success: false, data: null, error: "Your profile could not be loaded. Please contact an administrator." };
      }

      let profile = existingProfile;
      if (!profile) {
        const metadata = authData.user.user_metadata ?? {};
        const { data: createdProfile, error: createError } = await supabase
          .from(PROFILE_TABLE)
          .insert({
            id: authData.user.id,
            email: authData.user.email ?? normalizedEmail,
            full_name: String(metadata.full_name || authData.user.email || normalizedEmail),
            student_number: metadata.student_number ? String(metadata.student_number) : null,
            course: String(metadata.course || "BSIT"),
            year_level: String(metadata.year_level || "1"),
            role: "student",
            verified: false,
          })
          .select("*")
          .single();

        if (createError || !createdProfile) {
          if (createError) {
            console.error("Authenticated profile creation failed", {
              code: createError.code,
              message: createError.message,
              details: createError.details,
              hint: createError.hint,
            });
          }
          await supabase.auth.signOut();
          const diagnostic = import.meta.env.DEV && createError
            ? ` (${createError.code || "database error"}: ${createError.message})`
            : "";
          return {
            success: false,
            data: null,
            error: createError?.code === "23505"
              ? "Your account exists, but its profile is linked to an older login. Please ask an administrator to relink it."
              : `Your account was authenticated, but its profile could not be created. Please contact an administrator.${diagnostic}`,
          };
        }

        profile = createdProfile;
      }

      if (import.meta.env.DEV) console.debug("Profile loaded after sign-in", { profileId: profile.id });
      return { success: true, data: profile, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async logout(): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) return { success: false, data: null, error: error.message };
      return { success: true, data: null, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async sendPasswordResetEmail(email: string, redirectTo: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) return { success: false, data: null, error: error.message };
      return { success: true, data: null, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },
};
