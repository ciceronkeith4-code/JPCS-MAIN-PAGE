import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import type { ApiResponse } from "../config/app.config";
import type { CurriculumItem } from "../types";

export const CurriculumService = {
  async fetchAll(): Promise<ApiResponse<CurriculumItem[]>> {
    try {
      const snap = await getDocs(collection(db, "curriculum"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as CurriculumItem[];
      return { success: true, data, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async add(item: CurriculumItem): Promise<ApiResponse<CurriculumItem>> {
    try {
      await setDoc(doc(db, "curriculum", item.id), item);
      return { success: true, data: item, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async update(id: string, data: Partial<CurriculumItem>): Promise<ApiResponse<CurriculumItem>> {
    try {
      const ref = doc(db, "curriculum", id);
      await updateDoc(ref, data as Record<string, unknown>);
      const snap = await getDoc(ref);
      if (!snap.exists()) return { success: false, data: null, error: "Curriculum item not found." };
      return { success: true, data: { id: snap.id, ...snap.data() } as CurriculumItem, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      await deleteDoc(doc(db, "curriculum", id));
      return { success: true, data: null, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  }
};
