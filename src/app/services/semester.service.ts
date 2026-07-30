import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where } from "firebase/firestore";
import { db } from "../../firebase/config";
import { auth } from "../../firebase/config";
import type { ApiResponse } from "../config/app.config";
import type { Semester } from "../types";

export const SemesterService = {
  async fetchAll(userId?: string): Promise<ApiResponse<Semester[]>> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, data: null, error: "No authenticated user found." };
      }
      const token = await currentUser.getIdTokenResult();
      const scopedUserId = token.claims.admin === true
        ? userId
        : currentUser.uid;

      let snap;
      if (scopedUserId) {
        const q = query(collection(db, "semesters"), where("user_id", "==", scopedUserId));
        snap = await getDocs(q);
      } else {
        snap = await getDocs(collection(db, "semesters"));
      }
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Semester[];
      return { success: true, data, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async add(semester: Semester): Promise<ApiResponse<Semester>> {
    try {
      // Merge keeps the existing record stable during repeated saves.
      await setDoc(doc(db, "semesters", semester.id), semester, { merge: true });
      return { success: true, data: semester, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async update(id: string, data: Partial<Semester>): Promise<ApiResponse<void>> {
    try {
      await updateDoc(doc(db, "semesters", id), data as Record<string, unknown>);
      return { success: true, data: null, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      await deleteDoc(doc(db, "semesters", id));
      return { success: true, data: null, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  }
};
