import { supabase } from "../supabase";
import type { ApiResponse } from "../config/app.config";
import type { User } from "../types";

export const PROFILE_TABLE = "users" as const;

export type StudentProfileUpdate = Pick<User, "full_name" | "student_number" | "course" | "year_level"> & Pick<Partial<User>, "profile_photo">;
export type AdminProfileUpdate = Pick<User, "full_name" | "student_number" | "course" | "year_level" | "officer_position" | "role" | "profile_photo" | "action_photo" | "status">;

function debug(message: string, data: Record<string, unknown>) {
  if (import.meta.env.DEV) console.debug(message, data);
}

export const ProfileService = {
  async fetchAll(): Promise<ApiResponse<User[]>> {
    try {
      const { data, error } = await supabase.from(PROFILE_TABLE).select("*").order("created_at", { ascending: false });
      if (error) return { success: false, data: null, error: error.message };
      debug("Admin profile list loaded", { count: data?.length ?? 0 });
      return { success: true, data: data || [], error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "Unable to load profiles." };
    }
  },

  async fetchById(id: string): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await supabase.from(PROFILE_TABLE).select("*").eq("id", id).maybeSingle();
      if (error || !data) return { success: false, data: null, error: error?.message || "Profile not found." };
      debug("Profile row loaded", { profileId: data.id });
      return { success: true, data, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "Unable to load profile." };
    }
  },

  async fetchCurrent(): Promise<ApiResponse<User>> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, data: null, error: userError?.message || "No authenticated user found." };
    debug("Fetching current profile", { userId: user.id });
    return this.fetchById(user.id);
  },

  async updateCurrent(changes: StudentProfileUpdate): Promise<ApiResponse<User>> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, data: null, error: userError?.message || "No authenticated user found." };

    const payload: StudentProfileUpdate = {
      full_name: changes.full_name.trim(),
      student_number: changes.student_number.trim(),
      course: changes.course,
      year_level: changes.year_level,
      ...(changes.profile_photo === undefined ? {} : { profile_photo: changes.profile_photo }),
    };
    debug("Submitting student profile update", { userId: user.id, fields: Object.keys(payload) });

    const { data, error } = await supabase
      .from(PROFILE_TABLE)
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select()
      .single();

    if (error || !data) return { success: false, data: null, error: error?.message || "Profile update did not affect exactly one row." };
    debug("Student profile update completed", { profileId: data.id });
    return { success: true, data, error: null };
  },

  // Compatibility for legacy callers. New student and admin flows use the
  // explicit updateCurrent and updateForAdmin methods above.
  async update(id: string, changes: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await supabase
        .from(PROFILE_TABLE)
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error || !data) return { success: false, data: null, error: error?.message || "Profile update did not affect exactly one row." };
      return { success: true, data, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "Unable to update profile." };
    }
  },

  async updateForAdmin(targetUserId: string, changes: AdminProfileUpdate): Promise<ApiResponse<User>> {
    debug("Submitting admin profile update", { targetUserId, fields: Object.keys(changes) });
    const { data, error } = await supabase.rpc("admin_update_profile", {
      target_user_id: targetUserId,
      profile_changes: changes,
    });

    if (error || !data) return { success: false, data: null, error: error?.message || "Admin profile update did not affect exactly one row." };
    debug("Admin profile update completed", { profileId: data.id });
    return { success: true, data: data as User, error: null };
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.from(PROFILE_TABLE).delete().eq("id", id);
      if (error) return { success: false, data: null, error: error.message };
      return { success: true, data: null, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "Unable to delete profile." };
    }
  },

  subscribeToCurrent(userId: string, onUpdate: (profile: User) => void) {
    return supabase
      .channel(`profile-${userId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: PROFILE_TABLE, filter: `id=eq.${userId}` }, (payload) => onUpdate(payload.new as User))
      .subscribe();
  },

  subscribeToAll(onUpdate: (profile: User) => void) {
    return supabase
      .channel("admin-profile-updates")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: PROFILE_TABLE }, (payload) => onUpdate(payload.new as User))
      .subscribe();
  },
};
