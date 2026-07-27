import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { auth, db } from "../../firebase/config";
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
      let snap;
      try {
        const q = query(collection(db, PROFILE_TABLE), orderBy("created_at", "desc"));
        snap = await getDocs(q);
      } catch {
        // Fallback if index not yet created
        snap = await getDocs(collection(db, PROFILE_TABLE));
      }
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as User[];
      debug("Admin profile list loaded", { count: data.length });
      return { success: true, data, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "Unable to load profiles." };
    }
  },

  async fetchById(id: string): Promise<ApiResponse<User>> {
    try {
      const snap = await getDoc(doc(db, PROFILE_TABLE, id));
      if (!snap.exists()) return { success: false, data: null, error: "Profile not found." };
      const data = { id: snap.id, ...snap.data() } as User;
      debug("Profile row loaded", { profileId: data.id });
      return { success: true, data, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "Unable to load profile." };
    }
  },

  async fetchCurrent(): Promise<ApiResponse<User>> {
    const user = auth.currentUser;
    if (!user) return { success: false, data: null, error: "No authenticated user found." };
    debug("Fetching current profile", { userId: user.uid });
    return this.fetchById(user.uid);
  },

  async updateCurrent(changes: StudentProfileUpdate): Promise<ApiResponse<User>> {
    const user = auth.currentUser;
    if (!user) return { success: false, data: null, error: "No authenticated user found." };

    const payload: StudentProfileUpdate = {
      full_name: changes.full_name.trim(),
      student_number: changes.student_number.trim(),
      course: changes.course,
      year_level: changes.year_level,
      ...(changes.profile_photo === undefined ? {} : { profile_photo: changes.profile_photo }),
    };
    debug("Submitting student profile update", { userId: user.uid, fields: Object.keys(payload) });

    try {
      const userRef = doc(db, PROFILE_TABLE, user.uid);
      await updateDoc(userRef, { ...payload, updated_at: new Date().toISOString() });
      const snap = await getDoc(userRef);
      const data = { id: snap.id, ...snap.data() } as User;
      debug("Student profile update completed", { profileId: data.id });
      return { success: true, data, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "Profile update failed." };
    }
  },

  // Compatibility for legacy callers.
  async update(id: string, changes: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const userRef = doc(db, PROFILE_TABLE, id);
      await updateDoc(userRef, { ...changes, updated_at: new Date().toISOString() });
      const snap = await getDoc(userRef);
      if (!snap.exists()) return { success: false, data: null, error: "Profile not found after update." };
      const data = { id: snap.id, ...snap.data() } as User;
      return { success: true, data, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "Unable to update profile." };
    }
  },

  async updateForAdmin(targetUserId: string, changes: AdminProfileUpdate): Promise<ApiResponse<User>> {
    debug("Submitting admin profile update", { targetUserId, fields: Object.keys(changes) });
    try {
      const userRef = doc(db, PROFILE_TABLE, targetUserId);
      await updateDoc(userRef, { ...changes, updated_at: new Date().toISOString() });
      const snap = await getDoc(userRef);
      if (!snap.exists()) return { success: false, data: null, error: "Profile not found after admin update." };
      const data = { id: snap.id, ...snap.data() } as User;
      debug("Admin profile update completed", { profileId: data.id });
      return { success: true, data, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "Admin profile update failed." };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      await deleteDoc(doc(db, PROFILE_TABLE, id));
      return { success: true, data: null, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "Unable to delete profile." };
    }
  },

  // Returns an unsubscribe function (replaces Supabase channel)
  subscribeToCurrent(userId: string, onUpdate: (profile: User) => void): () => void {
    return onSnapshot(doc(db, PROFILE_TABLE, userId), (snap) => {
      if (snap.exists()) {
        onUpdate({ id: snap.id, ...snap.data() } as User);
      }
    });
  },

  subscribeToAll(onUpdate: (profile: User) => void): () => void {
    return onSnapshot(collection(db, PROFILE_TABLE), (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === "modified") {
          onUpdate({ id: change.doc.id, ...change.doc.data() } as User);
        }
      });
    });
  },
};
