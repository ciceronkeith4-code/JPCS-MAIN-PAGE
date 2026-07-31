import React, { useState, useEffect, useMemo } from "react";
import { Card, Button, Modal, Select, PageHeader, SearchInput, EmptyState, Alert } from "../../app/components/ui";
import { getAllUsers, deleteUser, isUserOnline } from "../../store";
import { OFFICER_POSITIONS, type User } from "../../types";
import { ProfileService } from "../../services/profile.service";

export function StudentManagementPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [officerFilter, setOfficerFilter] = useState<"all" | "officers_only">("all");
  const [toast, setToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    let active = true;
    const loadUsers = async () => {
      const result = await ProfileService.fetchAll();
      if (active && result.success && result.data) setUsers(result.data);
    };
    void loadUsers();
    const channel = ProfileService.subscribeToAll((updated) => {
      if (!active) return;
      setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
    });
    return () => {
      active = false;
      channel();
    };
  }, []);

  const handleOfficerChange = async (userId: string, position: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;
    const previousPosition = targetUser.officer_position || "None";
    const newPositionValue = position === "None" ? "" : position;

    // 1. Optimistic UI update
    setUsers((current) =>
      current.map((u) => (u.id === userId ? { ...u, officer_position: newPositionValue } : u))
    );
    setErrorMsg(null);

    // 2. Persist to Supabase
    const result = await ProfileService.updateForAdmin(userId, {
      full_name: targetUser.full_name,
      student_number: targetUser.student_number,
      course: targetUser.course,
      year_level: targetUser.year_level,
      officer_position: newPositionValue,
      role: targetUser.role,
      profile_photo: targetUser.profile_photo || "",
      action_photo: targetUser.action_photo || "",
      status: targetUser.status || "active",
    });

    if (result.success && result.data) {
      setToast(`Updated officer position for ${targetUser.full_name} to "${position}".`);
      setTimeout(() => setToast(null), 3000);
    } else {
      // Revert state if failed
      setUsers((current) =>
        current.map((u) => (u.id === userId ? { ...u, officer_position: previousPosition === "None" ? "" : previousPosition } : u))
      );
      setErrorMsg(result.error || "Failed to update officer position.");
    }
  };

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = !debouncedSearch || [u.full_name, u.student_number, u.course, u.email, u.officer_position || "", u.role || ""].some((v) => v.toLowerCase().includes(debouncedSearch.toLowerCase()));
      const matchesOfficer = officerFilter === "all" || (u.officer_position && u.officer_position !== "None" && u.officer_position !== "");
      return matchesSearch && matchesOfficer;
    });
  }, [users, debouncedSearch, officerFilter]);

  const handleDelete = () => {
    if (!deleting) return;
    deleteUser(deleting);
    setUsers(getAllUsers());
    setDeleting(null);
  };

  const officerOptions = OFFICER_POSITIONS.map((pos) => ({
    value: pos,
    label: pos === "None" ? "Standard Student (No Officer Role)" : pos,
  }));

  return (
    <div>
      <PageHeader title="Student & Officer Management" subtitle="Assign JPCS Officer roles and manage student records." />

      {toast && <Alert variant="success" className="mb-4">{toast}</Alert>}
      {errorMsg && <Alert variant="error" className="mb-4">{errorMsg}</Alert>}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full lg:max-w-md">
          <SearchInput value={search} onChange={setSearch} placeholder="Search student, position, or ID..." />
        </div>
        <div className="grid w-full grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 sm:w-auto">
          <button
            onClick={() => setOfficerFilter("all")}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all ${officerFilter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
          >
            All Students ({users.length})
          </button>
          <button
            onClick={() => setOfficerFilter("officers_only")}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all ${officerFilter === "officers_only" ? "bg-white text-amber-800 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
          >
            JPCS Officers ({users.filter((u) => u.officer_position && u.officer_position !== "None" && u.officer_position !== "").length})
          </button>
        </div>
      </div>

      <Card>
        {filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50/80">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase px-5 py-3">Student</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Officer Position</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const currentPos = u.officer_position && u.officer_position !== "" ? u.officer_position : "None";
                  return (
                    <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-900">{u.full_name}</p>
                        <p className="text-xs text-slate-500 font-mono">{u.student_number || "No ID"} · {u.email}</p>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${isUserOnline(u.id) ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-slate-100 text-slate-600"}`}>
                          {isUserOnline(u.id) ? "Online" : "Offline"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 min-w-[220px]">
                        <Select
                          value={currentPos}
                          onChange={(e) => handleOfficerChange(u.id, e.target.value)}
                          options={officerOptions}
                        />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button variant="ghost" size="xs" onClick={() => setDeleting(u.id)} className="text-rose-600 hover:bg-rose-50">Delete</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No students found" description="No students match your active filter criteria." />
        )}
      </Card>

      {/* Delete confirmation modal */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete Student Account" size="sm">
        <p className="text-xs text-slate-600 mb-4">Are you sure you want to delete this student record? This action cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button variant="primary" onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700 font-bold">Confirm Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
