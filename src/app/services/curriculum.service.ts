import { supabase } from "../supabase";
import type { ApiResponse } from "../config/app.config";
import type { CurriculumItem } from "../types";

export const CurriculumService = {
  async fetchAll(): Promise<ApiResponse<CurriculumItem[]>> {
    try {
      const { data, error } = await supabase.from("curriculum").select("*");
      if (error) return { success: false, data: null, error: error.message };
      return { success: true, data: data || [], error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async add(item: CurriculumItem): Promise<ApiResponse<CurriculumItem>> {
    try {
      const { data, error } = await supabase
        .from("curriculum")
        .insert(item)
        .select()
        .maybeSingle();

      if (error) return { success: false, data: null, error: error.message };
      return { success: true, data, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async update(id: string, data: Partial<CurriculumItem>): Promise<ApiResponse<CurriculumItem>> {
    try {
      const { data: updated, error } = await supabase
        .from("curriculum")
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
      const { error } = await supabase.from("curriculum").delete().eq("id", id);
      if (error) return { success: false, data: null, error: error.message };
      return { success: true, data: null, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  }
};
