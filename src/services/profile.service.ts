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

      // Query profiles table
      const { data: profilesData } = await supabase
        .from(PROFILE_TABLE)
        .select("*");

      // Also query users table for complete cross-compatibility
      const { data: usersData } = await supabase
        .from("users")
        .select("*");

      const mergedMap = new Map<string, User>();

      if (usersData) {
        for (const row of usersData) {
          mergedMap.set(row.id, {
            id: row.id,
            uid: row.id,
            full_name: row.full_name || "",
            student_number: row.student_number || "",
            course: row.course || "BSIT",
            year_level: row.year_level || "1",
            role: (row.role === "admin" ? "admin" : "student") as "student" | "admin",
            email: row.email || "",
            status: row.status || "active",
          });
        }
      }

      if (profilesData) {
        for (const row of profilesData) {
          const existing = mergedMap.get(row.id);
          mergedMap.set(row.id, {
            id: row.id,
            uid: row.id,
            full_name: row.full_name || existing?.full_name || "",
            student_number: row.student_number || existing?.student_number || "",
            course: row.course || existing?.course || "BSIT",
            year_level: row.year_level || existing?.year_level || "1",
            role: (row.role === "admin" || existing?.role === "admin" ? "admin" : "student") as "student" | "admin",
            email: row.email || existing?.email || "",
            status: row.status || existing?.status || "active",
            profile_photo: row.profile_photo || existing?.profile_photo,
            action_photo: row.action_photo || existing?.action_photo,
            officer_position: row.officer_position || existing?.officer_position,
          });
        }
      }

      const result = Array.from(mergedMap.values());
      debug("Combined profile & user list loaded", { count: result.length });
      return { success: true, data: result, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "Unable to load profiles." };
    }
  },

  async fetchById(id: string): Promise<ApiResponse<User>> {
    try {
      const { data: profile } = await supabase
        .from(PROFILE_TABLE)
        .select("*")
        .eq("id", id)
        .maybeSingle();

      const { data: userRow } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!profile && !userRow) return { success: false, data: null, error: "Profile not found." };

      const merged: User = {
        id: id,
        uid: id,
        full_name: profile?.full_name || userRow?.full_name || "",
        student_number: profile?.student_number || userRow?.student_number || "",
        course: profile?.course || userRow?.course || "BSIT",
        year_level: profile?.year_level || userRow?.year_level || "1",
        role: profile?.role || userRow?.role || "student",
        email: profile?.email || userRow?.email || "",
        status: profile?.status || userRow?.status || "active",
        profile_photo: profile?.profile_photo,
        action_photo: profile?.action_photo,
        officer_position: profile?.officer_position,
      };

      return { success: true, data: merged, error: null };
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

      await supabase
        .from("users")
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq("id", id)
        .catch(() => undefined);

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
      const { error } = await supabase
        .from(PROFILE_TABLE)
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq("id", targetUserId);

      await supabase
        .from("users")
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq("id", targetUserId)
        .catch(() => undefined);

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
