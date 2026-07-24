import { supabase } from "../supabase";
import type { ApiResponse } from "../config/app.config";
import type { Subject } from "../types";

export const SubjectService = {
  async fetchAll(semesterId?: string): Promise<ApiResponse<Subject[]>> {
    try {
      let query = supabase.from("subjects").select("*");
      if (semesterId) {
        query = query.eq("semester_id", semesterId);
      }
      const { data, error } = await query;
      if (error) return { success: false, data: null, error: error.message };
      return { success: true, data: data || [], error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async add(subject: Subject): Promise<ApiResponse<Subject>> {
    try {
      const { data, error } = await supabase
        .from("subjects")
        .insert(subject)
        .select()
        .maybeSingle();

      if (error) return { success: false, data: null, error: error.message };
      return { success: true, data, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async bulkAdd(subjects: Subject[]): Promise<ApiResponse<Subject[]>> {
    try {
      const { data, error } = await supabase
        .from("subjects")
        .upsert(subjects, { onConflict: "id", ignoreDuplicates: true })
        .select();

      if (error) return { success: false, data: null, error: error.message };
      return { success: true, data: data || [], error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async update(id: string, data: Partial<Subject>): Promise<ApiResponse<Subject>> {
    try {
      const { data: updated, error } = await supabase
        .from("subjects")
        .update(data)
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) return { success: false, data: null, error: error.message };
      return { success: true, data: updated, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) return { success: false, data: null, error: error.message };
      return { success: true, data: null, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  }
};
