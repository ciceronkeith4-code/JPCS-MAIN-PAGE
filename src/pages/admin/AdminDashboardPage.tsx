import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { Card, PageHeader, StatCard, EmptyState, Badge } from "../../app/components/ui";
import { getSemesters, getSubjects, getAwardSettings, getCurriculum, calculateGA, checkAward } from "../../store";
import type { User } from "../../types";
import { ProfileService } from "../../services/profile.service";

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

  const goldCount = allData.filter((d) => d.award.award?.includes("Gold")).length;
  const silverCount = allData.filter((d) => d.award.award?.includes("Silver")).length;
  const bronzeCount = allData.filter((d) => d.award.award?.includes("Bronze")).length;

  const yearLevels = ["1", "2", "3", "4", "5"];
  const yearData = yearLevels.map((y) => ({
    label: `Year ${y}`,
    count: users.filter((u) => u.year_level === y).length,
  })).filter((d) => d.count > 0);

  const awardDist = [
    { name: "Gold", value: goldCount, color: "#b8922e" },
    { name: "Silver", value: silverCount, color: "#94a3b8" },
    { name: "Bronze", value: bronzeCount, color: "#c2692a" },
    { name: "No Award", value: users.length - goldCount - silverCount - bronzeCount, color: "var(--color-muted)" },
  ].filter((d) => d.value > 0);

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
