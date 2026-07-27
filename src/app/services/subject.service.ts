import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where, writeBatch } from "firebase/firestore";
import { db } from "../../firebase/config";
import type { ApiResponse } from "../config/app.config";
import type { Subject } from "../types";

export const SubjectService = {
  async fetchAll(semesterId?: string): Promise<ApiResponse<Subject[]>> {
    try {
      let snap;
      if (semesterId) {
        const q = query(collection(db, "subjects"), where("semester_id", "==", semesterId));
        snap = await getDocs(q);
      } else {
        snap = await getDocs(collection(db, "subjects"));
      }
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Subject[];
      return { success: true, data, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async add(subject: Subject): Promise<ApiResponse<Subject>> {
    try {
      await setDoc(doc(db, "subjects", subject.id), subject);
      return { success: true, data: subject, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async bulkAdd(subjects: Subject[]): Promise<ApiResponse<Subject[]>> {
    try {
      // Use writeBatch for atomic multi-doc upsert (mirrors Supabase upsert/ignoreDuplicates)
      const batch = writeBatch(db);
      subjects.forEach((subject) => {
        batch.set(doc(db, "subjects", subject.id), subject, { merge: true });
      });
      await batch.commit();
      return { success: true, data: subjects, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async update(id: string, data: Partial<Subject>): Promise<ApiResponse<Subject>> {
    try {
      await updateDoc(doc(db, "subjects", id), data as Record<string, unknown>);
      return { success: true, data: { id, ...data } as Subject, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      await deleteDoc(doc(db, "subjects", id));
      return { success: true, data: null, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred." };
    }
  }
};
