import React, { useState, useEffect } from "react";
import { Card, Button, PageHeader, Badge, Alert, AwardDisplay, Select } from "../components/ui";
import { getSemesters, getSubjects, getAwardSettings, calculateGA, checkAward, updateSubject } from "../store";
import type { User, Subject } from "../types";

export function SimulatorPage({ user }: { user: User }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const handleSync = () => setTick((t) => t + 1);
    window.addEventListener("sscr_store_synced", handleSync);
    return () => window.removeEventListener("sscr_store_synced", handleSync);
  }, []);

  const semesters = getSemesters(user.id);
  const [selectedSemId, setSelectedSemId] = useState(semesters[semesters.length - 1]?.id ?? "");
  const awardSettings = getAwardSettings();

  const [originalSubjects, setOriginalSubjects] = useState<Subject[]>([]);
  const [simSubjects, setSimSubjects] = useState<Subject[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!selectedSemId && semesters.length > 0) {
      setSelectedSemId(semesters[semesters.length - 1]?.id);
    }
  }, [semesters, selectedSemId]);

  useEffect(() => {
    const subs = selectedSemId ? getSubjects(selectedSemId) : [];
    setOriginalSubjects(subs);
    setSimSubjects(subs.map((s) => ({ ...s })));
    setDirty(false);
    setSaved(false);
  }, [selectedSemId, tick]);

  const originalGA = calculateGA(originalSubjects);
  const simGA = calculateGA(simSubjects);
  const originalAward = checkAward(originalGA, originalSubjects, awardSettings);
  const simAward = checkAward(simGA, simSubjects, awardSettings);

  const gaDiff = simGA - originalGA;

  const handleGradeChange = (id: string, val: string) => {
    const grade = Math.min(100, Math.max(0, parseFloat(val) || 0));
    setSimSubjects((prev) => prev.map((s) => (
      s.id === id
        ? { ...s, grade, status: grade > 0 ? "Graded" : s.status }
        : s
    )));
    setDirty(true);
    setSaved(false);
  };

  const handleReset = () => {
    setSimSubjects(originalSubjects.map((s) => ({ ...s })));
    setDirty(false);
    setSaved(false);
  };

  const handleSave = () => {
    for (const sub of simSubjects) {
      updateSubject(sub.id, { grade: sub.grade, status: sub.status });
    }
    setOriginalSubjects(simSubjects.map((s) => ({ ...s })));
    setDirty(false);
    setSaved(true);
  };

  const semOptions = [
    { value: "", label: "Select semester" },
    ...semesters.map((s) => ({ value: s.id, label: `${s.academic_year} · ${s.semester}` }))
  ];

  return (
    <div>
      <PageHeader
        title="Grade Simulator"
        subtitle="Temporarily modify grades to preview your results without saving."
      />

      {/* Semester selector */}
      <div className="mb-6 max-w-sm">
        <Select
          value={selectedSemId}
          onChange={(e) => setSelectedSemId(e.target.value)}
          options={semOptions}
        />
      </div>

      {!selectedSemId ? (
        <div className="text-sm text-muted-foreground text-center py-16">Select a semester to begin simulating grades.</div>
      ) : originalSubjects.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-16">No subjects recorded for this semester.</div>
      ) : (
        <>
          {saved && <Alert variant="success" className="mb-6">Grades saved successfully to your record.</Alert>}

          {/* Comparison panels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <Card className="p-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Current</p>
              <div className="flex items-end gap-3">
                <span className="text-3xl font-semibold tabular-nums text-foreground">{originalGA > 0 ? originalGA.toFixed(2) : "—"}</span>
                <AwardDisplay award={originalAward.award} />
              </div>
              {originalAward.reason && <p className="text-xs text-muted-foreground mt-2">{originalAward.reason}</p>}
            </Card>
            <Card className="p-5 border-primary/30 bg-primary/5 dark:border-primary/20 dark:bg-primary/5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Simulated</p>
              <div className="flex items-end gap-3">
                <span className="text-3xl font-semibold tabular-nums text-foreground">{simGA > 0 ? simGA.toFixed(2) : "—"}</span>
                <AwardDisplay award={simAward.award} />
                {dirty && gaDiff !== 0 && (
                  <Badge variant={gaDiff > 0 ? "success" : "destructive"}>
                    {gaDiff > 0 ? "+" : ""}{gaDiff.toFixed(2)}
                  </Badge>
                )}
              </div>
              {simAward.reason && <p className="text-xs text-muted-foreground mt-2">{simAward.reason}</p>}
            </Card>
          </div>

          {/* Grade editor */}
          <Card>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Adjust Grades</h3>
              <div className="flex gap-2">
                {dirty && <Button variant="outline" size="sm" onClick={handleReset}>Reset</Button>}
                {dirty && <Button size="sm" onClick={handleSave}>Save Changes</Button>}
              </div>
            </div>
            <div className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Subject</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-5 py-3 w-20">Units</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-5 py-3 w-32">Original</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-5 py-3 w-36">Simulated</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-5 py-3 w-20">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {simSubjects.map((sub) => {
                    const orig = originalSubjects.find((s) => s.id === sub.id);
                    const diff = sub.grade - (orig?.grade ?? sub.grade);
                    return (
                      <tr key={sub.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="text-foreground font-medium text-sm">{sub.subject_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{sub.subject_code}</p>
                        </td>
                        <td className="px-5 py-3.5 text-center text-muted-foreground">{sub.units}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="font-mono text-sm text-muted-foreground">{orig?.grade ?? sub.grade}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={sub.grade}
                            onChange={(e) => handleGradeChange(sub.id, e.target.value)}
                            className="w-20 text-center rounded-lg border border-border bg-input-background px-2 py-1.5 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                          />
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {diff !== 0 ? (
                            <Badge variant={diff > 0 ? "success" : "destructive"}>
                              {diff > 0 ? "+" : ""}{diff.toFixed(0)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Award thresholds reference */}
          <Card className="p-6 mt-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Award Thresholds</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {awardSettings.map((a) => {
                const medal = a.award_name.includes("Gold") ? "🥇" : a.award_name.includes("Silver") ? "🥈" : "🥉";
                return (
                  <div key={a.id} className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                    <span className="text-sm">{medal} {a.award_name}</span>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>Avg ≥ {a.minimum_average}</p>
                      <p>Min ≥ {a.minimum_subject_grade}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
