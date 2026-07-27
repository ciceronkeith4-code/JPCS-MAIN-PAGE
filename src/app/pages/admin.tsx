import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Card, Button, Modal, Input, Select, PageHeader, StatCard, Badge,
  SearchInput, EmptyState, ConfirmDialog, Alert, AwardDisplay,
} from "../components/ui";
import {
  getAllUsers, getSemesters, getSubjects, getAwardSettings, getAnnouncements,
  getCurriculum, calculateGA, checkAward, deleteUser, isUserOnline,
  saveAwardSettings, addAnnouncement, updateAnnouncement, deleteAnnouncement,
  addCurriculumItem, updateCurriculumItem, deleteCurriculumItem,
  compressImage, uploadOfficerImageToStorage, deleteOfficerImageFromStorage,
} from "../store";
import type { AwardSetting, Announcement, CurriculumItem, User } from "../types";
import { ProfileService } from "../services/profile.service";


// ── Admin Dashboard ────────────────────────────────────────────────────────

export function AdminDashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const awardSettings = getAwardSettings();

  useEffect(() => {
    let active = true;
    const loadUsers = async () => {
      const result = await ProfileService.fetchAll();
      if (active && result.success && result.data) setUsers(result.data.filter((u) => u.role === "student"));
    };
    void loadUsers();
    const channel = ProfileService.subscribeToAll((updated) => {
      if (!active) return;
      setUsers((current) => {
        const next = current.filter((u) => u.id !== updated.id);
        return updated.role === "student" ? [...next, updated] : next;
      });
    });
    return () => {
      active = false;
      channel();
    };
  }, []);

  // Aggregate stats
  const allData = users.map((u) => {
    const sems = getSemesters(u.id);
    const subs = sems.flatMap((s) => getSubjects(s.id));
    const ga = calculateGA(subs);
    const award = checkAward(ga, subs, awardSettings);
    return { user: u, sems, subs, ga, award };
  });

  const totalSems = allData.reduce((s, d) => s + d.sems.length, 0);
  const curriculumItems = getCurriculum();
  const totalSubs = curriculumItems.length > 0 ? curriculumItems.length : allData.reduce((s, d) => s + d.subs.length, 0);
  const avgGA = allData.filter((d) => d.ga > 0).length
    ? allData.filter((d) => d.ga > 0).reduce((s, d) => s + d.ga, 0) / allData.filter((d) => d.ga > 0).length
    : 0;

  const goldCount = allData.filter((d) => d.award.award?.includes("Gold")).length;
  const silverCount = allData.filter((d) => d.award.award?.includes("Silver")).length;
  const bronzeCount = allData.filter((d) => d.award.award?.includes("Bronze")).length;

  // Year level distribution
  const yearLevels = ["1", "2", "3", "4", "5"];
  const yearData = yearLevels.map((y) => ({
    label: `Year ${y}`,
    count: users.filter((u) => u.year_level === y).length,
  })).filter((d) => d.count > 0);

  // Award distribution
  const awardDist = [
    { name: "Gold", value: goldCount, color: "#b8922e" },
    { name: "Silver", value: silverCount, color: "#94a3b8" },
    { name: "Bronze", value: bronzeCount, color: "#c2692a" },
    { name: "No Award", value: users.length - goldCount - silverCount - bronzeCount, color: "var(--color-muted)" },
  ].filter((d) => d.value > 0);

  // GA distribution
  const gaRanges = [
    { label: "95–100", min: 95, max: 100 },
    { label: "90–94", min: 90, max: 94 },
    { label: "85–89", min: 85, max: 89 },
    { label: "80–84", min: 80, max: 84 },
    { label: "Below 80", min: 0, max: 79 },
  ];
  const gaDistData = gaRanges.map((r) => ({
    label: r.label,
    count: allData.filter((d) => d.ga >= r.min && d.ga <= r.max).length,
  }));

  const recent = users.slice(-5).reverse();

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="System-wide overview of all student records." />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Students" value={users.length} />
        <StatCard label="Total Semesters" value={totalSems} />
        <StatCard label="Total Subjects" value={totalSubs} />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div style={{ backgroundColor: "#fef3c7", borderColor: "#f59e0b", borderWidth: "1px", borderStyle: "solid", color: "#78350f" }} className="rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">🥇 {goldCount}</p>
          <p className="text-xs font-semibold mt-0.5">Gold Medalists</p>
        </div>
        <div style={{ backgroundColor: "#f1f5f9", borderColor: "#cbd5e1", borderWidth: "1px", borderStyle: "solid", color: "#334155" }} className="rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">🥈 {silverCount}</p>
          <p className="text-xs font-semibold mt-0.5">Silver Medalists</p>
        </div>
        <div style={{ backgroundColor: "#ffedd5", borderColor: "#f97316", borderWidth: "1px", borderStyle: "solid", color: "#7c2d12" }} className="rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">🥉 {bronzeCount}</p>
          <p className="text-xs font-semibold mt-0.5">Bronze Medalists</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-foreground mb-5">Award Distribution</h3>
          {awardDist.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={awardDist} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {awardDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No data" />}
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-semibold text-foreground mb-5">Students by Year Level</h3>
          {yearData.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={yearData} margin={{ left: -25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "0.75rem", fontSize: "12px" }} />
                <Bar dataKey="count" name="Students" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No data" />}
        </Card>
      </div>

      {/* Recent registrations */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-5">Recent Registrations</h3>
        {recent.length ? (
          <div className="space-y-3">
            {recent.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-primary">{(u.full_name || "Student").split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground">{u.student_number} · {u.course}</p>
                  </div>
                </div>
                <Badge variant="muted">Year {u.year_level}</Badge>
              </div>
            ))}
          </div>
        ) : <EmptyState title="No students registered" />}
      </Card>
    </div>
  );
}

// ── Student Management ────────────────────────────────────────────────────

export function StudentManagementPage() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [viewUser, setViewUser] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [officerFilter, setOfficerFilter] = useState<"all" | "officers_only">("all");
  const awardSettings = getAwardSettings();

  const [assigningUser, setAssigningUser] = useState<User | null>(null);
  const [editingStudent, setEditingStudent] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    student_number: "",
    course: "",
    year_level: "",
    officer_position: "None",
    role: "student",
    profile_photo: "",
    action_photo: "",
  });
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadUsers = async () => {
      const result = await ProfileService.fetchAll();
      if (active) {
        if (result.success && result.data) setUsers(result.data);
        else setUploadError(result.error || "Unable to load profiles.");
      }
    };
    void loadUsers();
    window.addEventListener("focus", loadUsers);
    const channel = ProfileService.subscribeToAll((updated) => {
      if (!active) return;
      setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
    });
    return () => {
      active = false;
      window.removeEventListener("focus", loadUsers);
      channel();
    };
  }, []);

  const handleOfficerChange = async (userId: string, position: string) => {
    const newPos = position === "None" ? "" : position;
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;
    setUploadError(null);
    const result = await ProfileService.updateForAdmin(userId, {
      full_name: targetUser.full_name,
      student_number: targetUser.student_number,
      course: targetUser.course,
      year_level: targetUser.year_level,
      officer_position: newPos,
      role: targetUser.role,
      profile_photo: targetUser.profile_photo || "",
      action_photo: targetUser.action_photo || "",
      status: targetUser.status || "active",
    });
    if (!result.success || !result.data) {
      setUploadError(result.error || "Unable to update officer position.");
      return;
    }
    setUsers((current) => current.map((user) => user.id === result.data!.id ? result.data! : user));
    setToast(`Updated officer position for ${targetUser?.full_name || "student"} to "${position === "None" ? "Standard Student" : position}".`);
    setAssigningUser(null);
    if (editingStudent && editingStudent.id === userId) {
      setEditingStudent(null);
    }
    setTimeout(() => setToast(null), 3500);
  };

  const normalizeYearLevel = (val?: string) => {
    if (!val) return "1";
    const str = String(val).trim();
    if (str === "1st Year" || str === "1") return "1";
    if (str === "2nd Year" || str === "2") return "2";
    if (str === "3rd Year" || str === "3") return "3";
    if (str === "4th Year" || str === "4") return "4";
    if (str.toLowerCase().includes("irregular")) return "Irregular";
    return "1";
  };

  const normalizeOfficerPosition = (val?: string) => {
    if (!val || val === "" || val === "None") return "None";
    if (val.includes("President") && !val.includes("Vice")) return "President";
    if (val.includes("Vice")) return "Vice - President";
    if (val.includes("Secretary")) return "Secretary";
    if (val.includes("Treasurer")) return "Treasurer";
    if (val.includes("Auditor")) return "Auditor";
    if (val.includes("Sports") && val.includes("HEAD")) return "Sports Comitee (HEAD)";
    if (val.includes("Sports")) return "Sports Comitee (Member)";
    if (val.includes("Technical") && val.includes("HEAD")) return "Technical (HEAD)";
    if (val.includes("Technical")) return "Technical (Member)";
    if (val.includes("Content") && val.includes("HEAD")) return "JPCS Content Manager (HEAD)";
    if (val.includes("Content")) return "JPCS Content Manager (Member)";
    return val;
  };

  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [actionFile, setActionFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string>("");
  const [actionPreview, setActionPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleOpenEditModal = (u: User) => {
    setEditingStudent(u);
    setProfileFile(null);
    setActionFile(null);
    setUploadError(null);
    setProfilePreview(u.profile_photo || "");
    setActionPreview(u.action_photo || "");
    setEditForm({
      full_name: u.full_name || "",
      student_number: u.student_number || "",
      course: u.course || "BSIT",
      year_level: normalizeYearLevel(u.year_level),
      officer_position: normalizeOfficerPosition(u.officer_position),
      role: u.role || "student",
      profile_photo: u.profile_photo || "",
      action_photo: u.action_photo || "",
    });
  };

  const handleSaveStudentEdit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!editingStudent) return;
    setUploadError(null);
    setUploading(true);

    try {
      let finalProfileUrl = editForm.profile_photo;
      let finalActionUrl = editForm.action_photo;

      // 1. Upload Default / Profile Image to Supabase Storage
      if (profileFile) {
        const res = await uploadOfficerImageToStorage(profileFile, editingStudent.id, "default");
        finalProfileUrl = res.url;
      }

      // 2. Upload Hover / Action Image to Supabase Storage
      if (actionFile) {
        const res = await uploadOfficerImageToStorage(actionFile, editingStudent.id, "hover");
        finalActionUrl = res.url;
      }

      const newPos = editForm.officer_position === "None" ? "" : editForm.officer_position;

      // Save exactly the selected immutable profile row and use the returned row.
      const result = await ProfileService.updateForAdmin(editingStudent.id, {
        full_name: editForm.full_name,
        student_number: editForm.student_number,
        course: editForm.course,
        year_level: editForm.year_level,
        officer_position: newPos,
        role: editForm.role as "student" | "admin",
        profile_photo: finalProfileUrl,
        action_photo: finalActionUrl,
        status: editingStudent.status || "active",
      });
      if (!result.success || !result.data) {
        throw new Error(result.error || "Student profile update failed.");
      }

      setUsers((current) => current.map((user) => user.id === result.data!.id ? result.data! : user));
      setToast(`Successfully saved changes for "${editForm.full_name}"!`);
      setEditingStudent(null);
      setProfileFile(null);
      setActionFile(null);
      setTimeout(() => setToast(null), 3500);
    } catch (err: any) {
      setUploadError(err?.message || "Failed to upload image. Please check storage configuration and try again.");
    } finally {
      setUploading(false);
    }
  };

  const filtered = users.filter((u) => {
    const matchesSearch = !search || [u.full_name, u.student_number, u.course, u.email, u.officer_position || "", u.role || ""].some((v) => v.toLowerCase().includes(search.toLowerCase()));
    const matchesOfficer = officerFilter === "all" || (u.officer_position && u.officer_position !== "None");
    return matchesSearch && matchesOfficer;
  });

  const handleDelete = () => {
    if (!deleting) return;
    deleteUser(deleting);
    setUsers(getAllUsers());
    setDeleting(null);
  };

  const viewedUser = viewUser ? users.find((u) => u.id === viewUser) : null;
  const viewedSems = viewedUser ? getSemesters(viewedUser.id) : [];
  const viewedSubs = viewedSems.flatMap((s) => getSubjects(s.id));
  const viewedGA = calculateGA(viewedSubs);
  const viewedAward = checkAward(viewedGA, viewedSubs, awardSettings);

  const officerOptions = [
    { value: "None", label: "Standard Student (No Officer Role)" },
    { value: "President", label: "President" },
    { value: "Vice - President", label: "Vice - President" },
    { value: "Secretary", label: "Secretary" },
    { value: "Treasurer", label: "Treasurer" },
    { value: "Auditor", label: "Auditor" },
    { value: "Sports Comitee (HEAD)", label: "Sports Committee (Head)" },
    { value: "Sports Comitee (Member)", label: "Sports Committee (Member)" },
    { value: "Technical (HEAD)", label: "Technical (Head)" },
    { value: "Technical (Member)", label: "Technical (Member)" },
    { value: "JPCS Content Manager (HEAD)", label: "Content Manager (Head)" },
    { value: "JPCS Content Manager (Member)", label: "Content Manager (Member)" },
  ];

  return (
    <div>
      <PageHeader title="Student & Officer Management" subtitle="Assign JPCS Officer roles, monitor status, and manage student records." />

      {toast && <Alert variant="success" className="mb-4">{toast}</Alert>}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full lg:max-w-md">
          <SearchInput value={search} onChange={setSearch} placeholder="Search student, position, or ID..." />
        </div>
        <div className="grid w-full grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 sm:w-auto">
          <button
            onClick={() => setOfficerFilter("all")}
            className={`min-w-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
              officerFilter === "all" ? "bg-white text-slate-900 shadow-2xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className="sm:hidden">All ({users.length})</span>
            <span className="hidden sm:inline">All Students ({users.length})</span>
          </button>
          <button
            onClick={() => setOfficerFilter("officers_only")}
            className={`min-w-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
              officerFilter === "officers_only" ? "bg-white text-amber-800 shadow-2xs border border-amber-200" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className="sm:hidden">Officers ({users.filter(u => u.officer_position && u.officer_position !== "None").length})</span>
            <span className="hidden sm:inline">JPCS Officers ({users.filter(u => u.officer_position && u.officer_position !== "None").length})</span>
          </button>
        </div>
      </div>

      <Card>
        {filtered.length ? (
          <>
          <div className="hidden overflow-x-auto 2xl:block">
            <table className="w-full min-w-[1120px] table-fixed text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50/80">
                  <th className="w-[270px] text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Student</th>
                  <th className="w-[110px] text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="w-[370px] text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">JPCS Officer Position</th>
                  <th className="w-[130px] text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Course / Year</th>
                  <th className="w-[240px] text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const online = isUserOnline(u.id);
                  return (
                    <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
                      <td className="min-w-0 px-5 py-3.5">
                        <p className="truncate font-bold text-slate-900" title={u.full_name}>{u.full_name}</p>
                        <p className="truncate text-xs text-slate-500 font-mono" title={`${u.student_number} · ${u.email}`}>{u.student_number} · {u.email}</p>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {online ? (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="size-2 shrink-0 rounded-full bg-emerald-500 animate-pulse"></span>
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="size-2 shrink-0 rounded-full bg-slate-400"></span>
                            Offline
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="relative min-w-0 flex-1">
                            <select
                              value={u.officer_position || "None"}
                              onChange={(e) => handleOfficerChange(u.id, e.target.value)}
                              className="h-8 w-full min-w-0 appearance-none rounded-lg border border-slate-300 bg-white pl-2.5 pr-9 text-xs font-bold text-slate-900 shadow-2xs hover:border-primary/50 outline-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all"
                            >
                              {officerOptions.map((o) => (
                                <option key={o.value} value={o.value} className="font-medium text-slate-900">
                                  {o.label}
                                </option>
                              ))}
                            </select>
                            <svg
                              aria-hidden="true"
                              className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m7 10 5 5 5-5" />
                            </svg>
                          </div>
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => setAssigningUser(u)}
                            className="bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 font-bold shrink-0"
                          >
                            Assign Role
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-slate-700">
                        <span className="block">{u.course || "N/A"}</span>
                        <span className="block text-slate-500">Year {u.year_level || "N/A"}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <Button variant="secondary" size="xs" onClick={() => handleOpenEditModal(u)} className="font-bold border border-slate-200">Edit</Button>
                          <Button variant="outline" size="xs" onClick={() => setViewUser(u.id)}>Record</Button>
                          <Button variant="ghost" size="xs" onClick={() => setDeleting(u.id)} className="text-red-600 hover:bg-red-50">Delete</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2 2xl:hidden">
            {filtered.map((u) => {
              const online = isUserOnline(u.id);
              return (
                <article key={u.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <div className="flex min-w-0 items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-900" title={u.full_name}>{u.full_name}</p>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500" title={u.student_number}>{u.student_number}</p>
                      <p className="truncate text-xs text-slate-500" title={u.email}>{u.email}</p>
                    </div>
                    {online ? (
                      <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                        Online
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                        <span className="size-2 rounded-full bg-slate-400" />
                        Offline
                      </span>
                    )}
                  </div>

                  <dl className="grid grid-cols-2 gap-3 py-3 text-xs">
                    <div className="min-w-0">
                      <dt className="font-semibold uppercase tracking-wide text-slate-400">Course</dt>
                      <dd className="mt-1 truncate font-bold text-slate-800">{u.course || "N/A"}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="font-semibold uppercase tracking-wide text-slate-400">Year Level</dt>
                      <dd className="mt-1 truncate font-bold text-slate-800">{u.year_level || "N/A"}</dd>
                    </div>
                  </dl>

                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">JPCS Officer Position</label>
                    <div className="relative w-full">
                      <select
                        value={u.officer_position || "None"}
                        onChange={(e) => handleOfficerChange(u.id, e.target.value)}
                        className="h-9 w-full min-w-0 appearance-none cursor-pointer rounded-lg border border-slate-300 bg-white pl-3 pr-10 text-xs font-bold text-slate-900 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        {officerOptions.map((o) => (
                          <option key={o.value} value={o.value} className="font-medium text-slate-900">{o.label}</option>
                        ))}
                      </select>
                      <svg
                        aria-hidden="true"
                        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m7 10 5 5 5-5" />
                      </svg>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => setAssigningUser(u)} className="w-full border-amber-200 bg-amber-50 font-bold text-amber-900 hover:bg-amber-100">
                      Assign Officer Role
                    </Button>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                    <Button variant="secondary" size="sm" onClick={() => handleOpenEditModal(u)} className="min-w-0 border border-slate-200 font-bold">Edit</Button>
                    <Button variant="outline" size="sm" onClick={() => setViewUser(u.id)} className="min-w-0">Record</Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(u.id)} className="min-w-0 text-red-600 hover:bg-red-50">Delete</Button>
                  </div>
                </article>
              );
            })}
          </div>
          </>
        ) : (
          <EmptyState title="No students found" description={search ? "Try adjusting your search terms." : "No registered students in database."} />
        )}
      </Card>

      {/* Edit Student & Officer Modal */}
      <Modal open={!!editingStudent} onClose={() => setEditingStudent(null)} title={`Edit Student & Officer: ${editingStudent?.full_name || ""}`} size="md">
        {editingStudent && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSaveStudentEdit();
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
              <Input
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Student Number</label>
                <Input
                  value={editForm.student_number}
                  onChange={(e) => setEditForm({ ...editForm, student_number: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Course</label>
                <Input
                  value={editForm.course}
                  onChange={(e) => setEditForm({ ...editForm, course: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Year Level</label>
                <Select
                  value={editForm.year_level}
                  onChange={(e) => setEditForm({ ...editForm, year_level: e.target.value })}
                  options={[
                    { value: "1", label: "1st Year" },
                    { value: "2", label: "2nd Year" },
                    { value: "3", label: "3rd Year" },
                    { value: "4", label: "4th Year" },
                    { value: "Irregular", label: "Irregular Student" },
                  ]}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">System Role</label>
                <Select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  options={[
                    { value: "student", label: "Student" },
                    { value: "admin", label: "Administrator" },
                  ]}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Officer Position</label>
              <Select
                value={editForm.officer_position || "None"}
                onChange={(e) => setEditForm({ ...editForm, officer_position: e.target.value })}
                options={officerOptions}
              />
            </div>

            {uploadError && (
              <Alert variant="error">
                {uploadError}
              </Alert>
            )}

            {/* Profile Photo Upload */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 block">Profile Photo (Main Card Picture)</label>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
                      if (!allowedTypes.includes(file.type.toLowerCase())) {
                        setUploadError("Invalid image format. Allowed formats: JPG, JPEG, PNG, WEBP.");
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        setUploadError("Image size exceeds 5MB limit.");
                        return;
                      }
                      setUploadError(null);
                      setProfileFile(file);
                      setProfilePreview(URL.createObjectURL(file));
                    }
                  }}
                  className="w-full min-w-0 text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-200 file:text-xs file:font-semibold file:bg-slate-100 hover:file:bg-slate-200 cursor-pointer disabled:opacity-50"
                />
                {(profilePreview || editForm.profile_photo) && (
                  <img src={profilePreview || editForm.profile_photo} alt="Profile Preview" className="size-12 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0" />
                )}
              </div>
            </div>

            {/* Action Photo Upload (Hover / Moving Image Effect) */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-700 block">Action Photo (Hover / Moving Pose Picture)</label>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
                      if (!allowedTypes.includes(file.type.toLowerCase())) {
                        setUploadError("Invalid image format. Allowed formats: JPG, JPEG, PNG, WEBP.");
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        setUploadError("Image size exceeds 5MB limit.");
                        return;
                      }
                      setUploadError(null);
                      setActionFile(file);
                      setActionPreview(URL.createObjectURL(file));
                    }
                  }}
                  className="w-full min-w-0 text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-200 file:text-xs file:font-semibold file:bg-slate-100 hover:file:bg-slate-200 cursor-pointer disabled:opacity-50"
                />
                {(actionPreview || editForm.action_photo) && (
                  <img src={actionPreview || editForm.action_photo} alt="Action Preview" className="size-12 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0" />
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setEditingStudent(null)} disabled={uploading} className="w-full sm:w-auto">Cancel</Button>
              <Button
                type="submit"
                variant="primary"
                disabled={uploading}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSaveStudentEdit();
                }}
                className="flex w-full min-w-0 cursor-pointer items-center justify-center gap-2 whitespace-normal bg-primary px-4 py-2 text-center font-bold text-primary-foreground hover:bg-primary/90 sm:w-auto"
              >
                {uploading ? (
                  <>
                    <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span className="min-w-0">Uploading to Firebase Storage...</span>
                  </>
                ) : (
                  <span>Save Student Changes</span>
                )}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Assign Officer Role Modal */}
      <Modal open={!!assigningUser} onClose={() => setAssigningUser(null)} title={`Assign Officer Role: ${assigningUser?.full_name || ""}`} size="md">
        {assigningUser && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 font-medium">
              Select the official JPCS Officer Position for <strong className="text-slate-900">{assigningUser.full_name}</strong> ({assigningUser.student_number}).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {officerOptions.map((o) => {
                const isSelected = (assigningUser.officer_position || "None") === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => handleOfficerChange(assigningUser.id, o.value)}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-amber-100 border-amber-400 text-amber-950 shadow-xs ring-1 ring-amber-400"
                        : "bg-white border-slate-200 text-slate-800 hover:border-amber-300 hover:bg-amber-50/50"
                    }`}
                  >
                    <span>{o.label}</span>
                    {isSelected && <span className="text-amber-800 font-black">✓ Active</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      {/* View student modal */}
      <Modal open={!!viewUser} onClose={() => setViewUser(null)} title="Student Record" size="lg">
        {viewedUser && (
          <div className="p-6">
            <div className="mb-6 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-lg font-semibold text-primary">{(viewedUser.full_name || "Student").split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-foreground">{viewedUser.full_name}</p>
                <p className="break-words text-sm text-muted-foreground">{viewedUser.student_number} · {viewedUser.course} · Year {viewedUser.year_level}</p>
                <p className="break-all text-xs text-muted-foreground">{viewedUser.email}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-2xl font-semibold text-foreground tabular-nums">{viewedGA > 0 ? viewedGA.toFixed(2) : "—"}</p>
                <AwardDisplay award={viewedAward.award} />
              </div>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-lg font-semibold text-foreground">{viewedSems.length}</p>
                <p className="text-xs text-muted-foreground">Semesters</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-lg font-semibold text-foreground">{viewedSubs.length}</p>
                <p className="text-xs text-muted-foreground">Subjects</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-lg font-semibold text-foreground">{viewedSubs.reduce((s, sub) => s + sub.units, 0)}</p>
                <p className="text-xs text-muted-foreground">Units</p>
              </div>
            </div>

            {viewedSems.map((sem) => {
              const subs = getSubjects(sem.id);
              if (!subs.length) return null;
              return (
                <div key={sem.id} className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-foreground">{sem.academic_year} · {sem.semester}</p>
                    <span className="text-xs font-mono text-muted-foreground">GA: {calculateGA(subs).toFixed(2)}</span>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full min-w-[520px] text-xs">
                      <tbody>
                        {subs.map((sub) => (
                          <tr key={sub.id} className="border-b border-border/50 last:border-0">
                            <td className="px-3 py-2 text-muted-foreground font-mono">{sub.subject_code}</td>
                            <td className="px-3 py-2 text-foreground">{sub.subject_name}</td>
                            <td className="px-3 py-2 text-center text-muted-foreground">{sub.units} u</td>
                            <td className="px-3 py-2 text-right font-mono font-medium text-foreground">{sub.grade}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} title="Delete student?" description="This will permanently delete this student and all their academic records." />
    </div>
  );
}

// ── Curriculum Management ─────────────────────────────────────────────────

const COURSES_LIST = ["BSIT"];
const YEAR_LEVELS_LIST = ["1","2","3","4","5"];
const SEMESTER_LIST = ["First Semester","Second Semester","Summer"];

export function CurriculumPage() {
  const [selectedCourse, setSelectedCourse] = useState("BSIT");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<CurriculumItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [form, setForm] = useState<Omit<CurriculumItem, "id">>({
    course: "BSIT",
    year_level: "1",
    semester: "First Semester",
    subject_code: "",
    subject_name: "",
    units: 3,
    schedule_days: "",
    schedule_time: "",
    room: "",
  });

  // Local tick for force re-rendering on updates
  const [, setTick] = useState(0);
  const forceUpdate = () => setTick((t) => t + 1);

  useEffect(() => {
    const handleSync = () => forceUpdate();
    window.addEventListener("sscr_store_synced", handleSync);
    return () => window.removeEventListener("sscr_store_synced", handleSync);
  }, []);

  const allItems = getCurriculum({ course: selectedCourse });

  const openAdd = (year: string, sem: string) => {
    setScheduleError("");
    setEditingItem(null);
    setForm({
      course: selectedCourse,
      year_level: year,
      semester: sem,
      subject_code: "",
      subject_name: "",
      units: 3,
      schedule_days: "",
      schedule_time: "",
      room: "",
    });
    setModal("add");
  };

  const openEdit = (item: CurriculumItem) => {
    setScheduleError("");
    setEditingItem(item);
    setForm({
      course: item.course,
      year_level: item.year_level,
      semester: item.semester,
      subject_code: item.subject_code,
      subject_name: item.subject_name,
      units: item.units,
      schedule_days: item.schedule_days || "",
      schedule_time: item.schedule_time || "",
      room: item.room || "",
    });
    setModal("edit");
  };

  const handleSave = async () => {
    setScheduleError("");
    if (modal === "add") {
      addCurriculumItem(form);
    } else if (editingItem) {
      setSavingSchedule(true);
      const result = await updateCurriculumItem(editingItem.id, form);
      setSavingSchedule(false);
      if (!result.success) {
        setScheduleError(result.error || "Unable to save the schedule.");
        return;
      }
    }
    setModal(null);
    forceUpdate();
  };

  const handleDelete = () => {
    if (deletingId) deleteCurriculumItem(deletingId);
    setDeletingId(null);
    forceUpdate();
  };

  const years = ["1", "2", "3", "4"];
  const semesters = ["First Semester", "Second Semester"];

  return (
    <div>
      <PageHeader
        title="Curriculum"
        subtitle="Manage the official course curriculum for all programs."
        action={<Button onClick={() => openAdd("1", "First Semester")}>Add Subject</Button>}
      />

      {/* Curriculum Summary Bar */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-4 mb-6 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Course Curriculum</span>
        <span className="text-xs text-muted-foreground font-medium">
          Showing {allItems.length} total subjects
        </span>
      </div>

      {/* Grouped Years Grid */}
      <div className="space-y-8">
        {years.map((year) => {
          return (
            <div key={year} className="bg-white rounded-xl border border-border shadow-sm p-6">
              <h2 className="text-lg font-bold text-foreground border-b border-border pb-3 mb-5 flex items-center justify-between">
                <span>Year Level {year}</span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-primary/10 text-primary">
                  {selectedCourse} Program
                </span>
              </h2>

              {/* Two columns for First and Second Semester */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {semesters.map((sem) => {
                  const semItems = allItems.filter(
                    (i) => String(i.year_level) === String(year) && i.semester === sem
                  );
                  const totalUnits = semItems.reduce((s, item) => s + item.units, 0);

                  return (
                    <div key={sem} className="flex flex-col h-full">
                      <div className="flex items-center justify-between mb-3 border-b border-border/40 pb-2">
                        <h3 className="text-sm font-bold text-primary">{sem}</h3>
                        <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {totalUnits} Units
                        </span>
                      </div>

                      <div className="border border-border/60 rounded-lg overflow-hidden bg-background/20 flex-1">
                        {semItems.length ? (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border bg-muted/30 text-left">
                                <th className="px-3.5 py-2 font-semibold text-muted-foreground w-16">Code</th>
                                <th className="px-3.5 py-2 font-semibold text-muted-foreground">Subject Description</th>
                                <th className="px-3.5 py-2 font-semibold text-muted-foreground text-center w-12">Units</th>
                                <th className="px-3.5 py-2 font-semibold text-muted-foreground">Days</th>
                                <th className="px-3.5 py-2 font-semibold text-muted-foreground">Time</th>
                                <th className="px-3.5 py-2 font-semibold text-muted-foreground">Room</th>
                                <th className="px-3.5 py-2 font-semibold text-muted-foreground text-right w-16">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {semItems.map((item) => (
                                <tr key={item.id} className="border-b border-border/40 last:border-0 hover:bg-white/40 transition-colors">
                                  <td className="px-3.5 py-2.5 font-mono font-medium text-foreground">{item.subject_code}</td>
                                  <td className="px-3.5 py-2.5 text-foreground font-medium">{item.subject_name}</td>
                                  <td className="px-3.5 py-2.5 text-center text-muted-foreground font-semibold">{item.units}</td>
                                  <td className="px-3.5 py-2.5 text-muted-foreground">{item.schedule_days || ""}</td>
                                  <td className="px-3.5 py-2.5 text-muted-foreground whitespace-nowrap">{item.schedule_time || ""}</td>
                                  <td className="px-3.5 py-2.5 text-muted-foreground">{item.room || ""}</td>
                                  <td className="px-3.5 py-2.5 text-right">
                                    <div className="flex justify-end gap-1">
                                      <button onClick={() => openEdit(item)} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                      <button onClick={() => setDeletingId(item.id)} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                            <span>No subjects defined</span>
                            <Button size="xs" onClick={() => openAdd(year, sem)}>Add Subject</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "add" ? "Add Curriculum Subject" : "Edit Subject"} size="sm">
        <div className="p-6 flex flex-col gap-4">
          {scheduleError && <Alert variant="error">{scheduleError}</Alert>}
          <div className="grid grid-cols-2 gap-4">
            <Select label="Course" value={form.course} onChange={(e) => setForm((f) => ({ ...f, course: e.target.value }))} options={COURSES_LIST.map((c) => ({ value: c, label: c }))} />
            <Select label="Year Level" value={form.year_level} onChange={(e) => setForm((f) => ({ ...f, year_level: e.target.value }))} options={YEAR_LEVELS_LIST.map((y) => ({ value: y, label: `Year ${y}` }))} />
          </div>
          <Select label="Semester" value={form.semester} onChange={(e) => setForm((f) => ({ ...f, semester: e.target.value }))} options={SEMESTER_LIST.map((s) => ({ value: s, label: s }))} />
          <Input label="Subject Code" placeholder="CS 411" value={form.subject_code} onChange={(e) => setForm((f) => ({ ...f, subject_code: e.target.value }))} />
          <Input label="Subject Name" placeholder="Capstone Project 2" value={form.subject_name} onChange={(e) => setForm((f) => ({ ...f, subject_name: e.target.value }))} />
          <Select label="Units" value={String(form.units)} onChange={(e) => setForm((f) => ({ ...f, units: parseInt(e.target.value) }))} options={[1,2,3,4,5,6].map((n) => ({ value: String(n), label: `${n} unit${n > 1 ? "s" : ""}` }))} />
          <Input label="Days" placeholder="M-TH" value={form.schedule_days || ""} onChange={(e) => setForm((f) => ({ ...f, schedule_days: e.target.value }))} />
          <Input label="Time" placeholder="7:30-9:00" value={form.schedule_time || ""} onChange={(e) => setForm((f) => ({ ...f, schedule_time: e.target.value }))} />
          <Input label="Room" placeholder="C403" value={form.room || ""} onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} loading={savingSchedule}>Save</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deletingId} onClose={() => setDeletingId(null)} onConfirm={handleDelete} title="Delete subject?" description="This will permanently remove this subject from the curriculum." />
    </div>
  );
}

// ── Award Settings ────────────────────────────────────────────────────────

export function AwardSettingsPage() {
  const [settings, setSettings] = useState(() => getAwardSettings());
  const [saved, setSaved] = useState(false);

  const updateSetting = (id: string, key: keyof AwardSetting, value: string | number) => {
    setSettings((prev) => prev.map((s) => (s.id === id ? { ...s, [key]: typeof value === "string" ? value : Number(value) } : s)));
  };

  const handleSave = () => {
    saveAwardSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="Award Settings" subtitle="Configure the thresholds for academic award eligibility." />
      {saved && <Alert variant="success" className="mb-6">Award settings saved successfully.</Alert>}

      <div className="space-y-4 mb-6">
        {settings.map((s) => {
          const medal = s.award_name.includes("Gold") ? "🥇" : s.award_name.includes("Silver") ? "🥈" : "🥉";
          return (
            <Card key={s.id} className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">{medal}</span>
                <h3 className="text-sm font-semibold text-foreground">{s.award_name}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="Award Name" value={s.award_name} onChange={(e) => updateSetting(s.id, "award_name", e.target.value)} />
                <Input label="Minimum Average" type="number" min="0" max="100" step="0.5" value={s.minimum_average} onChange={(e) => updateSetting(s.id, "minimum_average", e.target.value)} hint={`GA must be ≥ ${s.minimum_average}`} />
                <Input label="Minimum Subject Grade" type="number" min="0" max="100" step="0.5" value={s.minimum_subject_grade} onChange={(e) => updateSetting(s.id, "minimum_subject_grade", e.target.value)} hint={`All grades must be ≥ ${s.minimum_subject_grade}`} />
              </div>
            </Card>
          );
        })}
      </div>

      <Button onClick={handleSave}>Save Award Settings</Button>
    </div>
  );
}

// ── Announcements ─────────────────────────────────────────────────────────

export function AnnouncementsPage() {
  const [items, setItems] = useState(() => getAnnouncements());
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Announcement, "id">>({ title: "", description: "", publish_date: new Date().toISOString().split("T")[0], priority: "normal" });

  const refresh = useCallback(() => setItems(getAnnouncements()), []);

  const openAdd = () => {
    setEditingId(null);
    setForm({ title: "", description: "", publish_date: new Date().toISOString().split("T")[0], priority: "normal" });
    setModal("add");
  };

  const openEdit = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setEditingId(id);
    setForm({ title: item.title, description: item.description, publish_date: item.publish_date, priority: item.priority });
    setModal("edit");
  };

  const handleSave = () => {
    if (modal === "add") addAnnouncement(form);
    else if (editingId) updateAnnouncement(editingId, form);
    setModal(null);
    refresh();
  };

  const handleDelete = () => {
    if (deleting) deleteAnnouncement(deleting);
    setDeleting(null);
    refresh();
  };

  const priorityVariant = (p: string) =>
    ({ high: "destructive", normal: "default", low: "muted" } as const)[p as "high" | "normal" | "low"] ?? "default";

  return (
    <div>
      <PageHeader title="Announcements" subtitle="Manage announcements displayed on the student dashboard." action={<Button onClick={openAdd}>New Announcement</Button>} />

      {items.length ? (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                    <Badge variant={priorityVariant(item.priority)}>{item.priority}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(item.publish_date).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(item.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                  <button onClick={() => setDeleting(item.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No announcements" description="Create an announcement to notify students." action={<Button onClick={openAdd}>Create Announcement</Button>} />
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "add" ? "New Announcement" : "Edit Announcement"} size="md">
        <div className="p-6 flex flex-col gap-4">
          <Input label="Title" placeholder="Enrollment for Second Semester is now open" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Description</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-lg border border-border bg-input-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Enter announcement details…"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Publish Date" type="date" value={form.publish_date} onChange={(e) => setForm((f) => ({ ...f, publish_date: e.target.value }))} />
            <Select label="Priority" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as "low" | "normal" | "high" }))} options={[{ value: "low", label: "Low" }, { value: "normal", label: "Normal" }, { value: "high", label: "High" }]} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave}>Publish</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} title="Delete announcement?" description="This will permanently remove this announcement." />
    </div>
  );
}
