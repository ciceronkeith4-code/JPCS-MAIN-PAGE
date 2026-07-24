import { supabase } from "../supabase";
import type { ApiResponse } from "../config/app.config";
import type { Announcement } from "../types";

export const AnnouncementService = {
  async fetchAll(): Promise<ApiResponse<Announcement[]>> {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("publish_date", { ascending: false });

      if (error) return { success: false, data: null, error: error.message };
      return { success: true, data: data || [], error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async add(ann: Announcement): Promise<ApiResponse<Announcement>> {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .insert(ann)
        .select()
        .maybeSingle();

      if (error) return { success: false, data: null, error: error.message };
      return { success: true, data, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async update(id: string, data: Partial<Announcement>): Promise<ApiResponse<Announcement>> {
    try {
      const { data: updated, error } = await supabase
        .from("announcements")
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
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) return { success: false, data: null, error: error.message };
      return { success: true, data: null, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  }
};
