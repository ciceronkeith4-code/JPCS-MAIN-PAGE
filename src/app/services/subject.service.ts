import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where, writeBatch } from "firebase/firestore";
import { db } from "../../firebase/config";
import { auth } from "../../firebase/config";
import type { ApiResponse } from "../config/app.config";
import type { Subject } from "../types";

export const SubjectService = {
  async fetchAll(semesterId?: string): Promise<ApiResponse<Subject[]>> {
    try {
      if (semesterId) {
        const q = query(collection(db, "subjects"), where("semester_id", "==", semesterId));
        const snap = await getDocs(q);
        return {
          success: true,
          data: snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Subject[],
          error: null,
        };
      }

      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, data: null, error: "No authenticated user found." };
      }
      const token = await currentUser.getIdTokenResult();
      if (token.claims.admin === true) {
        const snap = await getDocs(collection(db, "subjects"));
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Subject[];
        return { success: true, data, error: null };
      }

      const semesterSnap = await getDocs(
        query(collection(db, "semesters"), where("user_id", "==", currentUser.uid)),
      );
      const subjectSnapshots = await Promise.all(
        semesterSnap.docs.map((semester) => getDocs(
          query(collection(db, "subjects"), where("semester_id", "==", semester.id)),
        )),
      );
      const data = subjectSnapshots.flatMap((snap) =>
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Subject)
      );
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
      // Use writeBatch for atomic multi-document updates.
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
