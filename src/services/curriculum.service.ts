import { supabase } from "./supabase/supabaseClient";
import type { ApiResponse, CurriculumItem } from "../types";

export const CurriculumService = {
  async fetchAll(): Promise<ApiResponse<CurriculumItem[]>> {
    try {
      const { data, error } = await supabase
        .from("curriculum")
        .select("*");

      if (error) throw error;
      return { success: true, data: data as CurriculumItem[], error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async add(item: CurriculumItem): Promise<ApiResponse<CurriculumItem>> {
    try {
      const { error } = await supabase
        .from("curriculum")
        .insert(item);

      if (error) throw error;
      return { success: true, data: item, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async update(id: string, data: Partial<CurriculumItem>): Promise<ApiResponse<CurriculumItem>> {
    try {
      const { error } = await supabase
        .from("curriculum")
        .update(data)
        .eq("id", id);

      if (error) throw error;

      const { data: updatedItem, error: fetchError } = await supabase
        .from("curriculum")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !updatedItem) return { success: false, data: null, error: "Curriculum item not found." };
      return { success: true, data: updatedItem as CurriculumItem, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from("curriculum")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { success: true, data: null, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  }
};
