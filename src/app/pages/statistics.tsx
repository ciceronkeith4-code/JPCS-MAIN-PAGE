import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line, Legend,
} from "recharts";
import { AnimatedTabPanel, Card, PageHeader, StatCard, EmptyState, Tabs } from "../components/ui";
import { getSemesters, getSubjects, getAwardSettings, calculateGA, checkAward } from "../store";
import type { User } from "../../types";

const GRADE_BUCKETS = [
  { label: "95–100", min: 95, max: 100 },
  { label: "90–94", min: 90, max: 94 },
  { label: "85–89", min: 85, max: 89 },
  { label: "80–84", min: 80, max: 84 },
  { label: "75–79", min: 75, max: 79 },
  { label: "Below 75", min: 0, max: 74 },
] as const;

const DIST_COLORS = ["#b8922e", "#162d4e", "#2e7d5c", "#6366f1", "#8b4a9c", "#c0392b"];

export function StatisticsPage({ user }: { user: User }) {
  const [tab, setTab] = useState("overview");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const handleSync = () => setTick((t) => t + 1);
    window.addEventListener("sscr_store_synced", handleSync);
    return () => window.removeEventListener("sscr_store_synced", handleSync);
  }, []);

  const {
    semesters,
    allSubjects,
    overallGA,
    semesterData,
    distributionData,
    highest,
    lowest,
    avg,
    totalUnits,
    semestersWithAwards,
    highestSubjectName,
    lowestSubjectName,
  } = useMemo(() => {
    const semesters = getSemesters(user.id);
    const awardSettings = getAwardSettings();
    const subjectsBySemester = new Map(semesters.map((semester) => [semester.id, getSubjects(semester.id)]));
    const allSubjects = semesters.flatMap((semester) => subjectsBySemester.get(semester.id) ?? []);
    const overallGA = calculateGA(allSubjects);

    const semesterData = semesters.map((semester) => {
      const subjects = subjectsBySemester.get(semester.id) ?? [];
      const ga = calculateGA(subjects);
      const award = checkAward(ga, subjects, awardSettings);
      return {
        label: `${semester.academic_year.split("–")[0]} ${semester.semester === "First Semester" ? "1st" : "2nd"}`,
        ga: parseFloat(ga.toFixed(2)),
        subjects: subjects.length,
        units: subjects.reduce((sum, subject) => sum + subject.units, 0),
        award: award.award,
        highest: subjects.length ? Math.max(...subjects.map((subject) => subject.grade)) : 0,
        lowest: subjects.length ? Math.min(...subjects.map((subject) => subject.grade)) : 0,
      };
    });

    const distributionData = GRADE_BUCKETS.map((bucket) => ({
      label: bucket.label,
      count: allSubjects.filter((subject) => subject.grade >= bucket.min && subject.grade <= bucket.max).length,
    }));
    const highest = allSubjects.length ? Math.max(...allSubjects.map((subject) => subject.grade)) : 0;
    const lowest = allSubjects.length ? Math.min(...allSubjects.map((subject) => subject.grade)) : 0;

    return {
      semesters,
      allSubjects,
      overallGA,
      semesterData,
      distributionData,
      highest,
      lowest,
      avg: allSubjects.length
        ? allSubjects.reduce((sum, subject) => sum + subject.grade, 0) / allSubjects.length
        : 0,
      totalUnits: allSubjects.reduce((sum, subject) => sum + subject.units, 0),
      semestersWithAwards: semesterData.filter((semester) => semester.award).length,
      highestSubjectName: allSubjects.find((subject) => subject.grade === highest)?.subject_name,
      lowestSubjectName: allSubjects.find((subject) => subject.grade === lowest)?.subject_name,
    };
  }, [tick, user.id]);

  return (
    <div>
      <PageHeader title="Statistics" subtitle="A comprehensive overview of your academic performance." />

      <Tabs
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "trends", label: "Trends" },
          { id: "distribution", label: "Distribution" },
        ]}
        active={tab}
        onChange={setTab}
        ariaLabel="Statistics views"
        className="mb-8"
      />

      <AnimatedTabPanel activeKey={tab}>
      {tab === "overview" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <StatCard label="Overall GA" value={overallGA > 0 ? overallGA.toFixed(2) : "—"} sub={`Across ${semesters.length} semesters`} accent icon={<svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} />
            <StatCard label="Average Grade" value={avg > 0 ? avg.toFixed(2) : "—"} sub="Simple average of all grades" icon={<svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>} />
            <StatCard label="Highest Grade" value={highest > 0 ? highest.toFixed(0) : "—"} sub={highestSubjectName} icon={<svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>} />
            <StatCard label="Lowest Grade" value={lowest > 0 ? lowest.toFixed(0) : "—"} sub={lowestSubjectName} icon={<svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>} />
            <StatCard label="Total Subjects" value={allSubjects.length} sub={`${totalUnits} units total`} icon={<svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>} />
            <StatCard label="Semesters" value={semesters.length} sub={`${semestersWithAwards} with awards`} icon={<svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
          </div>

          {/* Semester table */}
          {semesterData.length ? (
            <Card>
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Semester Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Semester</th>
                      <th className="text-center text-xs font-medium text-muted-foreground px-5 py-3">GA</th>
                      <th className="text-center text-xs font-medium text-muted-foreground px-5 py-3">Subjects</th>
                      <th className="text-center text-xs font-medium text-muted-foreground px-5 py-3">Units</th>
                      <th className="text-center text-xs font-medium text-muted-foreground px-5 py-3">Highest</th>
                      <th className="text-center text-xs font-medium text-muted-foreground px-5 py-3">Lowest</th>
                      <th className="text-center text-xs font-medium text-muted-foreground px-5 py-3">Award</th>
                    </tr>
                  </thead>
                  <tbody>
                    {semesterData.map((sem, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-foreground">{sem.label}</td>
                        <td className="px-5 py-3.5 text-center font-mono font-semibold text-foreground">{sem.ga > 0 ? sem.ga.toFixed(2) : "—"}</td>
                        <td className="px-5 py-3.5 text-center text-muted-foreground">{sem.subjects}</td>
                        <td className="px-5 py-3.5 text-center text-muted-foreground">{sem.units}</td>
                        <td className="px-5 py-3.5 text-center text-muted-foreground">{sem.highest || "—"}</td>
                        <td className="px-5 py-3.5 text-center text-muted-foreground">{sem.lowest || "—"}</td>
                        <td className="px-5 py-3.5 text-center">
                          {sem.award ? (
                            <span className="text-xs">
                              {sem.award.includes("Gold") ? "🥇" : sem.award.includes("Silver") ? "🥈" : "🥉"}
                            </span>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <EmptyState title="No data" description="Add semesters and subjects to see statistics." />
          )}
        </>
      )}

      {tab === "trends" && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-foreground mb-1">General Average Trend</h3>
            <p className="text-xs text-muted-foreground mb-6">Your GA progression across semesters</p>
            {semesterData.length > 1 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={semesterData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                  <YAxis domain={[75, 100]} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "0.75rem", fontSize: "12px" }} formatter={(v: number) => [v.toFixed(2), "GA"]} />
                  <Line isAnimationActive={false} type="monotone" dataKey="ga" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ fill: "var(--color-primary)", r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyState title="Not enough data" description="At least 2 semesters needed." />}
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold text-foreground mb-1">Highest vs. Lowest per Semester</h3>
            <p className="text-xs text-muted-foreground mb-6">Grade range comparison</p>
            {semesterData.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={semesterData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                  <YAxis domain={[70, 100]} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "0.75rem", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar isAnimationActive={false} dataKey="highest" name="Highest" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
                  <Bar isAnimationActive={false} dataKey="lowest" name="Lowest" fill="var(--color-chart-5)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState title="No data" />}
          </Card>
        </div>
      )}

      {tab === "distribution" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-foreground mb-1">Grade Distribution</h3>
            <p className="text-xs text-muted-foreground mb-6">How your grades are distributed</p>
            {allSubjects.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={distributionData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "0.75rem", fontSize: "12px" }} formatter={(v: number) => [v, "Subjects"]} />
                  <Bar isAnimationActive={false} dataKey="count" name="Subjects" radius={[4, 4, 0, 0]}>
                    {distributionData.map((_, i) => (
                      <Cell key={i} fill={DIST_COLORS[i % DIST_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState title="No data" />}
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold text-foreground mb-1">Distribution Breakdown</h3>
            <p className="text-xs text-muted-foreground mb-6">Count and percentage per grade range</p>
            {allSubjects.length ? (
              <div className="space-y-3">
                {distributionData.map((d, i) => {
                  const pct = allSubjects.length ? (d.count / allSubjects.length) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-foreground">{d.label}</span>
                        <span className="text-muted-foreground">{d.count} subject{d.count !== 1 ? "s" : ""} · {pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: DIST_COLORS[i] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <EmptyState title="No data" />}
          </Card>
        </div>
      )}
      </AnimatedTabPanel>
    </div>
  );
}
