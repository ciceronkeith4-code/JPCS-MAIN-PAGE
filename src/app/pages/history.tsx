import React, { useState } from "react";
import { Card, PageHeader, EmptyState, AwardDisplay, GradeBadge } from "../components/ui";
import { getSemesters, getSubjects, getAwardSettings, calculateGA, checkAward } from "../store";
import type { User } from "../../types";

export function HistoryPage({ user }: { user: User }) {
  const semesters = getSemesters(user.id);
  const awardSettings = getAwardSettings();
  const [selectedSemId, setSelectedSemId] = useState<string | null>(null);

  const selectedSem = semesters.find((s) => s.id === selectedSemId);
  const selectedSubjects = selectedSemId ? getSubjects(selectedSemId) : [];
  const selectedGA = calculateGA(selectedSubjects);
  const selectedAward = checkAward(selectedGA, selectedSubjects, awardSettings);

  return (
    <div>
      <PageHeader title="Semester History" subtitle="Browse all past semesters and recorded grades." />

      {semesters.length === 0 ? (
        <EmptyState title="No history yet" description="Your semester records will appear here once you add them." />
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Semester list */}
          <div className="w-full lg:w-72 shrink-0">
            <div className="space-y-2">
              {semesters.map((sem) => {
                const subs = getSubjects(sem.id);
                const ga = calculateGA(subs);
                const award = checkAward(ga, subs, awardSettings);
                const isSelected = sem.id === selectedSemId;
                return (
                  <button
                    key={sem.id}
                    onClick={() => setSelectedSemId(isSelected ? null : sem.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-xs font-medium ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {sem.academic_year}
                        </p>
                        <p className={`text-sm font-semibold mt-0.5 ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>
                          {sem.semester}
                        </p>
                      </div>
                      {award.award && (
                        <span className="text-base">
                          {award.award.includes("Gold") ? "🥇" : award.award.includes("Silver") ? "🥈" : "🥉"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2.5">
                      <span className={`text-xs font-mono font-semibold ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>
                        {ga > 0 ? ga.toFixed(2) : "No grades"}
                      </span>
                      <span className={`text-xs ${isSelected ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {subs.length} subject{subs.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject detail */}
          <div className="flex-1">
            {!selectedSemId ? (
              <Card className="flex items-center justify-center h-64">
                <p className="text-sm text-muted-foreground">Select a semester to view its subjects.</p>
              </Card>
            ) : (
              <Card>
                <div className="px-6 py-5 border-b border-border">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{selectedSem?.academic_year}</p>
                      <h2 className="text-lg font-semibold text-foreground mt-0.5">{selectedSem?.semester}</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">General Average</p>
                      <p className="text-2xl font-semibold text-foreground tabular-nums">
                        {selectedGA > 0 ? selectedGA.toFixed(2) : "—"}
                      </p>
                      <div className="mt-1">
                        <AwardDisplay award={selectedAward.award} />
                      </div>
                    </div>
                  </div>

                  {selectedSubjects.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Units</p>
                        <p className="text-sm font-semibold text-foreground mt-0.5">{selectedSubjects.reduce((s, sub) => s + sub.units, 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Highest</p>
                        <p className="text-sm font-semibold text-foreground mt-0.5">{Math.max(...selectedSubjects.map((s) => s.grade))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Lowest</p>
                        <p className="text-sm font-semibold text-foreground mt-0.5">{Math.min(...selectedSubjects.map((s) => s.grade))}</p>
                      </div>
                    </div>
                  )}
                </div>

                {selectedSubjects.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Code</th>
                          <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Subject Name</th>
                          <th className="text-center text-xs font-medium text-muted-foreground px-5 py-3">Units</th>
                          <th className="text-center text-xs font-medium text-muted-foreground px-5 py-3">Final Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSubjects.map((sub) => (
                          <tr key={sub.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{sub.subject_code}</td>
                            <td className="px-5 py-3.5 text-foreground">{sub.subject_name}</td>
                            <td className="px-5 py-3.5 text-center text-muted-foreground">{sub.units}</td>
                            <td className="px-5 py-3.5 text-center">
                              <GradeBadge grade={sub.grade} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState title="No subjects" description="No subjects were recorded for this semester." />
                )}
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
