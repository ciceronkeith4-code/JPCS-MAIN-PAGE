import { supabase } from "../../lib/supabaseClient";
import type { ApiResponse } from "../config/app.config";
import type { Announcement } from "../types";

export const AnnouncementService = {
  async fetchAll(): Promise<ApiResponse<Announcement[]>> {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("publish_date", { ascending: false });

      if (error) throw error;
      return { success: true, data: data as Announcement[], error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async add(ann: Announcement): Promise<ApiResponse<Announcement>> {
    try {
      const { error } = await supabase
        .from("announcements")
        .insert(ann);

      if (error) throw error;
      return { success: true, data: ann, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async update(id: string, data: Partial<Announcement>): Promise<ApiResponse<Announcement>> {
    try {
      const { error } = await supabase
        .from("announcements")
        .update(data)
        .eq("id", id);

      if (error) throw error;
      return { success: true, data: { id, ...data } as Announcement, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { success: true, data: null, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  }
};
