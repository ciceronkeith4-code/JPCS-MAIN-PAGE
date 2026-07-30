import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase/config";
import type { ApiResponse } from "../config/app.config";
import type { Announcement } from "../types";

export const AnnouncementService = {
  async fetchAll(): Promise<ApiResponse<Announcement[]>> {
    try {
      let snap;
      try {
        const q = query(collection(db, "announcements"), orderBy("publish_date", "desc"));
        snap = await getDocs(q);
      } catch {
        // Fallback if Firestore index is not yet created
        snap = await getDocs(collection(db, "announcements"));
      }
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Announcement[];
      return { success: true, data, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async add(ann: Announcement): Promise<ApiResponse<Announcement>> {
    try {
      await setDoc(doc(db, "announcements", ann.id), ann);
      return { success: true, data: ann, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async update(id: string, data: Partial<Announcement>): Promise<ApiResponse<Announcement>> {
    try {
      await updateDoc(doc(db, "announcements", id), data as Record<string, unknown>);
      return { success: true, data: { id, ...data } as Announcement, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      await deleteDoc(doc(db, "announcements", id));
      return { success: true, data: null, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  }
};
