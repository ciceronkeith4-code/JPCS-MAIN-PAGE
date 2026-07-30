import { supabase } from "../../lib/supabaseClient";
import type { ApiResponse } from "../config/app.config";
import type { Subject } from "../types";

export const SubjectService = {
  async fetchAll(semesterId?: string): Promise<ApiResponse<Subject[]>> {
    try {
      if (semesterId) {
        const { data, error } = await supabase
          .from("subjects")
          .select("*")
          .eq("semester_id", semesterId);

        if (error) throw error;
        return {
          success: true,
          data: data as Subject[],
          error: null,
        };
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        return { success: false, data: null, error: "No authenticated user found." };
      }

      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", currentUser.id)
        .single();

      if (profileErr || !profile) {
        return { success: false, data: null, error: "Unable to verify user role." };
      }

      if (profile.role === "admin") {
        const { data, error } = await supabase.from("subjects").select("*");
        if (error) throw error;
        return { success: true, data: data as Subject[], error: null };
      }

      const { data: semesters, error: semestersErr } = await supabase
        .from("semesters")
        .select("id")
        .eq("user_id", currentUser.id);

      if (semestersErr) throw semestersErr;
      if (!semesters || semesters.length === 0) {
        return { success: true, data: [], error: null };
      }

      const semesterIds = semesters.map((s) => s.id);
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .in("semester_id", semesterIds);

      if (error) throw error;
      return { success: true, data: data as Subject[], error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async add(subject: Subject): Promise<ApiResponse<Subject>> {
    try {
      const { error } = await supabase
        .from("subjects")
        .insert(subject);

      if (error) throw error;
      return { success: true, data: subject, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async bulkAdd(subjects: Subject[]): Promise<ApiResponse<Subject[]>> {
    try {
      const { error } = await supabase
        .from("subjects")
        .upsert(subjects);

      if (error) throw error;
      return { success: true, data: subjects, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async update(id: string, data: Partial<Subject>): Promise<ApiResponse<Subject>> {
    try {
      const { error } = await supabase
        .from("subjects")
        .update(data)
        .eq("id", id);

      if (error) throw error;
      return { success: true, data: { id, ...data } as Subject, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from("subjects")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { success: true, data: null, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  }
};
