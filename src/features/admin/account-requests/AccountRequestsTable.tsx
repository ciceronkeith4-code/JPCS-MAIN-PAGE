import React, { useState, useEffect, useMemo } from "react";
import { Card, Button, Modal, Input, PageHeader, Badge, SearchInput, EmptyState, Alert } from "../../../app/components/ui";
import { AccountRequestService } from "../../../services/accountRequest.service";
import type { AccountRequest } from "../../../types";

export function AccountRequestsTable() {
  const [requests, setRequests] = useState<AccountRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [acceptingReq, setAcceptingReq] = useState<AccountRequest | null>(null);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const [rejectingReq, setRejectingReq] = useState<AccountRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  const [viewReq, setViewReq] = useState<AccountRequest | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(handler);
  }, [search]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await AccountRequestService.getAllAccountRequests();
      setRequests(data);
    } catch (err: any) {
      console.error("Failed to load account requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, []);

  const handleApprove = async () => {
    if (!acceptingReq) return;
    setAcceptLoading(true);
    setAcceptError(null);
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const secondarySupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );

      const tempPassword = "gobaste123";
      const { data: signUpData, error: signUpErr } = await secondarySupabase.auth.signUp({
        email: acceptingReq.email.trim().toLowerCase(),
        password: tempPassword,
        options: { data: { full_name: acceptingReq.fullName.trim() } }
      });

      if (signUpErr) throw signUpErr;
      const createdUserUid = signUpData.user?.id;
      if (!createdUserUid) throw new Error("Could not create auth account for student.");

      const { supabase } = await import("../../../lib/supabaseClient");
      await supabase.from("profiles").update({
        full_name: acceptingReq.fullName.trim(),
        student_number: acceptingReq.studentNumber.trim(),
        course: "BSIT",
        year_level: acceptingReq.year,
        role: "student",
        status: "active",
        mustChangePassword: true,
      }).eq("id", createdUserUid);

      await AccountRequestService.updateRequestStatus(acceptingReq.requestId, "approved", {
        reviewedBy: "Admin",
      });

      setToast(`Account approved successfully for ${acceptingReq.fullName}!`);
      setAcceptingReq(null);
      await loadRequests();
      setTimeout(() => setToast(null), 3500);
    } catch (err: any) {
      setAcceptError(err?.message || "Failed to approve account request.");
    } finally {
      setAcceptLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingReq) return;
    if (!rejectionReason.trim()) {
      setRejectError("Please provide a rejection reason.");
      return;
    }
    setRejectLoading(true);
    setRejectError(null);
    try {
      await AccountRequestService.updateRequestStatus(rejectingReq.requestId, "rejected", {
        rejectionReason: rejectionReason.trim(),
        reviewedBy: "Admin",
      });
      setToast(`Account request rejected for ${rejectingReq.fullName}.`);
      setRejectingReq(null);
      setRejectionReason("");
      await loadRequests();
      setTimeout(() => setToast(null), 3500);
    } catch (err: any) {
      setRejectError(err?.message || "Failed to reject account request.");
    } finally {
      setRejectLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const matchesFilter = filter === "all" || r.status === filter;
      const matchesSearch = !debouncedSearch || [r.fullName, r.email, r.studentNumber, r.year].some((val) => (val || "").toLowerCase().includes(debouncedSearch.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  }, [requests, filter, debouncedSearch]);

  return (
    <div>
      <PageHeader title="Student Account Requests" subtitle="Review and approve student registration requests." />

      {toast && <Alert variant="success" className="mb-4">{toast}</Alert>}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full lg:max-w-md">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email, or student number..." />
        </div>

        <div className="grid w-full grid-cols-4 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 sm:w-auto">
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`min-w-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold capitalize transition-all ${
                filter === f ? "bg-white text-slate-900 shadow-2xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {f} ({requests.filter((r) => f === "all" || r.status === f).length})
            </button>
          ))}
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading requests...</div>
        ) : filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50/80">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Student</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Year / ID</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.requestId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-900">{r.fullName}</p>
                      <p className="text-xs text-slate-500 font-mono">{r.email}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-700">
                      <p className="font-semibold">{r.year}</p>
                      <p className="text-slate-500 font-mono">{r.studentNumber}</p>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <Badge variant={r.status === "approved" ? "success" : r.status === "rejected" ? "destructive" : "warning"}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="xs" onClick={() => setViewReq(r)}>Details</Button>
                        {r.status === "pending" && (
                          <>
                            <Button variant="primary" size="xs" onClick={() => { setAcceptError(null); setAcceptingReq(r); }}>
                              Accept
                            </Button>
                            <Button variant="ghost" size="xs" onClick={() => { setRejectError(null); setRejectionReason(""); setRejectingReq(r); }} className="text-rose-600 hover:bg-rose-50">
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No account requests" description="There are no account requests matching your filter." />
        )}
      </Card>

      {/* Accept Confirmation Dialog */}
      <Modal open={!!acceptingReq} onClose={() => setAcceptingReq(null)} title="Approve Account Request" size="md">
        {acceptingReq && (
          <div className="space-y-4">
            {acceptError && <Alert variant="error">{acceptError}</Alert>}
            <p className="text-xs text-slate-600">
              You are about to approve this student account request.
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5 text-xs font-medium text-slate-800">
              <p><strong>Full Name:</strong> {acceptingReq.fullName}</p>
              <p><strong>Email:</strong> {acceptingReq.email}</p>
              <p><strong>Year Level:</strong> {acceptingReq.year}</p>
              <p><strong>Student Number:</strong> {acceptingReq.studentNumber}</p>
              <p className="pt-2 text-amber-800 font-bold">
                The temporary password will be: <code className="bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 font-mono text-amber-950">gobaste123</code>
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setAcceptingReq(null)} disabled={acceptLoading}>Cancel</Button>
              <Button variant="primary" onClick={handleApprove} disabled={acceptLoading} className="font-bold">
                {acceptLoading ? "Creating Account..." : "Confirm & Approve"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal open={!!rejectingReq} onClose={() => setRejectingReq(null)} title="Reject Account Request" size="md">
        {rejectingReq && (
          <form onSubmit={handleReject} className="space-y-4">
            {rejectError && <Alert variant="error">{rejectError}</Alert>}
            <p className="text-xs text-slate-600">
              Provide a reason for rejecting the request for <strong className="text-slate-900">{rejectingReq.fullName}</strong>.
            </p>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Rejection Reason *</label>
              <Input
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Invalid student number or unverified enrollment record."
                required
                disabled={rejectLoading}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setRejectingReq(null)} disabled={rejectLoading}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={rejectLoading} className="bg-rose-600 hover:bg-rose-700 font-bold">
                {rejectLoading ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* View Details Modal */}
      <Modal open={!!viewReq} onClose={() => setViewReq(null)} title="Request Details" size="md">
        {viewReq && (
          <div className="space-y-3 text-xs">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <p><strong>Request ID:</strong> <span className="font-mono text-slate-600">{viewReq.requestId}</span></p>
              <p><strong>Full Name:</strong> {viewReq.fullName}</p>
              <p><strong>Email:</strong> {viewReq.email}</p>
              <p><strong>Year Level:</strong> {viewReq.year}</p>
              <p><strong>Student Number:</strong> {viewReq.studentNumber}</p>
              <p><strong>Status:</strong> <Badge variant={viewReq.status === "approved" ? "success" : viewReq.status === "rejected" ? "destructive" : "warning"}>{viewReq.status}</Badge></p>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setViewReq(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
