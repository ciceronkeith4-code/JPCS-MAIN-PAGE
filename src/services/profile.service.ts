import { supabase } from "./supabase/supabaseClient";
import type { ApiResponse, User } from "../types";

export const PROFILE_TABLE = "profiles" as const;

export type StudentProfileUpdate = Pick<User, "full_name" | "student_number" | "course" | "year_level"> & Pick<Partial<User>, "profile_photo">;
export type AdminProfileUpdate = Pick<User, "full_name" | "student_number" | "course" | "year_level" | "officer_position" | "role" | "profile_photo" | "action_photo" | "status">;

function debug(message: string, data: Record<string, unknown>) {
  if (import.meta.env.DEV) console.debug(message, data);
}

export const ProfileService = {
  async fetchAll(): Promise<ApiResponse<User[]>> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        return { success: false, data: null, error: "No authenticated user found." };
      }

      // Check user role via profiles
      const { data: currentProfile, error: profileError } = await supabase
        .from(PROFILE_TABLE)
        .select("role")
        .eq("id", currentUser.id)
        .single();

      if (profileError || !currentProfile) {
        return { success: false, data: null, error: "Unable to verify admin status." };
      }

      if (currentProfile.role !== "admin") {
        const current = await this.fetchById(currentUser.id);
        return current.success && current.data
          ? { success: true, data: [current.data], error: null }
          : { success: false, data: null, error: current.error };
      }

      const { data, error } = await supabase
        .from(PROFILE_TABLE)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      debug("Admin profile list loaded", { count: data.length });
      return { success: true, data: data as User[], error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "Unable to load profiles." };
    }
  },

  async fetchById(id: string): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await supabase
        .from(PROFILE_TABLE)
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) return { success: false, data: null, error: "Profile not found." };
      debug("Profile row loaded", { profileId: data.id });
      return { success: true, data: data as User, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "Unable to load profile." };
    }
  },

  async fetchCurrent(): Promise<ApiResponse<User>> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, data: null, error: "No authenticated user found." };
    debug("Fetching current profile", { userId: user.id });
    return this.fetchById(user.id);
  },

  async updateCurrent(changes: StudentProfileUpdate): Promise<ApiResponse<User>> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, data: null, error: "No authenticated user found." };

    const payload = {
      full_name: changes.full_name.trim(),
      student_number: changes.student_number.trim(),
      course: changes.course,
      year_level: changes.year_level,
      ...(changes.profile_photo === undefined ? {} : { profile_photo: changes.profile_photo }),
      updated_at: new Date().toISOString(),
    };
    debug("Submitting student profile update", { userId: user.id, fields: Object.keys(payload) });

    try {
      const { error } = await supabase
        .from(PROFILE_TABLE)
        .update(payload)
        .eq("id", user.id);

      if (error) throw error;

      const { data, error: fetchErr } = await supabase
        .from(PROFILE_TABLE)
        .select("*")
        .eq("id", user.id)
        .single();

      if (fetchErr || !data) throw fetchErr || new Error("Profile not found after update.");
      debug("Student profile update completed", { profileId: data.id });
      return { success: true, data: data as User, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "Profile update failed." };
    }
  },

  async update(id: string, changes: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const { error } = await supabase
        .from(PROFILE_TABLE)
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      const { data, error: fetchErr } = await supabase
        .from(PROFILE_TABLE)
        .select("*")
        .eq("id", id)
        .single();

      if (fetchErr || !data) return { success: false, data: null, error: "Profile not found after update." };
      return { success: true, data: data as User, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "Unable to update profile." };
    }
  },

  async updateForAdmin(targetUserId: string, changes: AdminProfileUpdate): Promise<ApiResponse<User>> {
    debug("Submitting admin profile update", { targetUserId, fields: Object.keys(changes) });
    try {
      const { data: targetProfile, error: targetError } = await supabase
        .from(PROFILE_TABLE)
        .select("email")
        .eq("id", targetUserId)
        .single();

      if (targetError || !targetProfile) {
        return { success: false, data: null, error: "Profile not found." };
      }

      const { error } = await supabase
        .from(PROFILE_TABLE)
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq("id", targetUserId);

      if (error) throw error;

      const { data, error: fetchErr } = await supabase
        .from(PROFILE_TABLE)
        .select("*")
        .eq("id", targetUserId)
        .single();

      if (fetchErr || !data) return { success: false, data: null, error: "Profile not found after admin update." };
      debug("Admin profile update completed", { profileId: data.id });
      return { success: true, data: data as User, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "Admin profile update failed." };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from(PROFILE_TABLE)
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { success: true, data: null, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "Unable to delete profile." };
    }
  },

  subscribeToCurrent(userId: string, onUpdate: (profile: User) => void): () => void {
    const channel = supabase
      .channel(`profile-current-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            onUpdate(payload.new as User);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  },

  subscribeToAll(onUpdate: (profile: User) => void): () => void {
    const channel = supabase
      .channel("profiles-all")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          if (payload.new) {
            onUpdate(payload.new as User);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  },
};
