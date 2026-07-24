import { supabase } from "../supabase";
import type { ApiResponse } from "../config/app.config";
import type { Semester } from "../types";

export const SemesterService = {
  async fetchAll(userId?: string): Promise<ApiResponse<Semester[]>> {
    try {
      let query = supabase.from("semesters").select("*");
      if (userId) {
        query = query.eq("user_id", userId);
      }
      const { data, error } = await query;
      if (error) return { success: false, data: null, error: error.message };
      return { success: true, data: data || [], error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async add(semester: Semester): Promise<ApiResponse<Semester>> {
    try {
      const { data, error } = await supabase
        .from("semesters")
        .upsert(semester, { onConflict: "id", ignoreDuplicates: true })
        .select()
        .maybeSingle();

      if (error) return { success: false, data: null, error: error.message };
      return { success: true, data, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async update(id: string, data: Partial<Semester>): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.from("semesters").update(data).eq("id", id);
      if (error) return { success: false, data: null, error: error.message };
      return { success: true, data: null, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.from("semesters").delete().eq("id", id);
      if (error) return { success: false, data: null, error: error.message };
      return { success: true, data: null, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  }
};
