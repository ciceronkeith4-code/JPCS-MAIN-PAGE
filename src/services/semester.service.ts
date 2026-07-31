import { supabase } from "./supabase/supabaseClient";
import type { ApiResponse, Semester } from "../types";

export const SemesterService = {
  async fetchAll(userId?: string): Promise<ApiResponse<Semester[]>> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        return { success: false, data: null, error: "No authenticated user found." };
      }

      // Check current user's role from profiles table
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", currentUser.id)
        .single();

      if (profileErr || !profile) {
        return { success: false, data: null, error: "Unable to verify user role." };
      }

      const scopedUserId = profile.role === "admin"
        ? userId
        : currentUser.id;

      let query = supabase.from("semesters").select("*");
      if (scopedUserId) {
        query = query.eq("user_id", scopedUserId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data: data as Semester[], error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async add(semester: Semester): Promise<ApiResponse<Semester>> {
    try {
      const { error } = await supabase
        .from("semesters")
        .upsert(semester);

      if (error) throw error;
      return { success: true, data: semester, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async update(id: string, data: Partial<Semester>): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from("semesters")
        .update(data)
        .eq("id", id);

      if (error) throw error;
      return { success: true, data: null, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from("semesters")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { success: true, data: null, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  }
};
