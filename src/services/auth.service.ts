import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "./supabase/supabaseClient";
import type { User } from "../types";

export class AuthService {
  static async signIn(email: string, password: string): Promise<SupabaseUser> {
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) throw error;
    if (!data.user) throw new Error("User not found after sign in.");
    return data.user;
  }

  static async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  static async getActiveUser(): Promise<SupabaseUser | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  static async getActiveSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  static async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) throw new Error("Invalid session or missing user email.");

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email.trim().toLowerCase(),
      password: currentPassword,
    });
    if (reauthError) throw reauthError;

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (updateError) throw new Error(updateError.message);
  }
}
