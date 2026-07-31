import { supabase } from "./supabase/supabaseClient";
import type { AccountRequest } from "../types";

export class AccountRequestService {
  static async checkExistingPendingEmail(email: string): Promise<boolean> {
    const { data } = await supabase
      .from("account_requests")
      .select("requestId")
      .eq("email", email.trim().toLowerCase())
      .eq("status", "pending")
      .maybeSingle();
    return Boolean(data);
  }

  static async checkExistingPendingStudentNumber(studentNumber: string): Promise<boolean> {
    const { data } = await supabase
      .from("account_requests")
      .select("requestId")
      .eq("studentNumber", studentNumber.trim())
      .eq("status", "pending")
      .maybeSingle();
    return Boolean(data);
  }

  static async createAccountRequest(payload: {
    fullName: string;
    email: string;
    year: string;
    studentNumber: string;
  }): Promise<void> {
    const requestId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const { error } = await supabase.from("account_requests").insert({
      requestId,
      fullName: payload.fullName.trim(),
      email: payload.email.trim().toLowerCase(),
      year: payload.year,
      studentNumber: payload.studentNumber.trim(),
      status: "pending",
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (error) throw error;
  }

  static async getAllAccountRequests(): Promise<AccountRequest[]> {
    const { data, error } = await supabase
      .from("account_requests")
      .select("*")
      .order("submittedAt", { ascending: false });
    if (error) throw error;
    return (data as AccountRequest[]) || [];
  }

  static async updateRequestStatus(
    requestId: string,
    status: "approved" | "rejected",
    additionalData?: { rejectionReason?: string; reviewedBy?: string }
  ): Promise<void> {
    const { error } = await supabase
      .from("account_requests")
      .update({
        status,
        updatedAt: new Date().toISOString(),
        reviewedAt: new Date().toISOString(),
        ...additionalData,
      })
      .eq("requestId", requestId);
    if (error) throw error;
  }
}
