import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Card, StatCard, PageHeader, Badge, Alert, AwardDisplay, EmptyState, Button, Modal,
} from "../components/ui";
import {
  getSemesters, getSubjects, getAwardSettings, getAnnouncements, calculateGA, checkAward, getCurriculum, addSemester, addSubject,
  hasRecordedFinalGrade,
} from "../store";
import type { User } from "../../types";
import { expandScheduleDays } from "../schedule";

function DashboardCalendar({
  schedule,
  announcements,
  classStartDate,
}: {
  schedule: any[];
  announcements: any[];
  classStartDate: string;
}) {
  const [viewDate, setViewDate] = useState(() => new Date(2026, 7, 1));
  const [selectedDateStr, setSelectedDateStr] = useState<string>("2026-08-17");
  
  const handlePrevMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  
  const handleToday = () => {
    const d = new Date();
    setViewDate(d);
    setSelectedDateStr(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleDateString("en-US", { month: "long" });

  const firstDayIndex = new Date(year, month, 1).getDay();
  const numDays = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: numDays }, (_, i) => i + 1);

  const prevNumDays = new Date(year, month, 0).getDate();
  const prevDays = Array.from({ length: firstDayIndex }, (_, i) => prevNumDays - firstDayIndex + 1 + i);
  
  const nextDaysCount = 42 - (firstDayIndex + numDays);
  const nextDays = Array.from({ length: nextDaysCount }, (_, i) => i + 1);

  const today = new Date();
  const isToday = (dayNum: number, isCurrentMonth: boolean) => {
    return isCurrentMonth &&
      dayNum === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear();
  };

  const getEventsForDate = (dateStr: string) => {
    const result: Array<{ title: string; desc?: string; type: "event" | "class"; time?: string; room?: string; block?: string }> = [];
    
    if (dateStr === classStartDate) {
      result.push({
        title: "Official Start of Classes",
        desc: "1st Semester AY 2026-2027",
        type: "event"
      });
    }

    announcements.forEach((a) => {
      const aDate = a.start_date || a.publish_date;
      if (aDate === dateStr && a.title !== "Official Start of Classes") {
        result.push({
          title: a.title,
          desc: a.description,
          type: "event"
        });
      }
    });

    const parsedDate = new Date(`${dateStr}T00:00:00`);
    if (dateStr >= classStartDate && !isNaN(parsedDate.getTime())) {
      const dayName = parsedDate.toLocaleDateString("en-US", { weekday: "long" });
      const dayClasses = schedule.filter((s) => s.day === dayName);
      dayClasses.forEach((c) => {
        result.push({
          title: c.subject_name,
          desc: c.subject_code,
          type: "class",
          time: c.time,
          room: c.room,
          block: c.block || "A",
        });
      });
    }

    return result;
  };

  const selectedEvents = getEventsForDate(selectedDateStr);

  return (
    <Card className="p-5 border border-slate-200 rounded-xl bg-white space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Academic & Class Calendar</h3>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button onClick={handleToday} className="text-xs font-semibold px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50 transition-colors">
            Today
          </button>
          <button onClick={handlePrevMonth} className="p-1 border border-slate-200 rounded hover:bg-slate-50 transition-colors">
            <svg className="size-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-bold text-slate-800 min-w-32 text-center">{monthName} {year}</span>
          <button onClick={handleNextMonth} className="p-1 border border-slate-200 rounded hover:bg-slate-50 transition-colors">
            <svg className="size-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-[10px] font-semibold text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-sky-500" /> Class
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-amber-500" /> Academic event
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <div className="grid min-w-[760px] grid-cols-7 gap-px bg-slate-200 text-xs">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="bg-slate-50 py-2 text-center font-bold text-slate-500 uppercase text-[10px]">
              {d}
            </div>
          ))}
          {prevDays.map(d => (
            <div key={`prev-${d}`} className="min-h-[104px] bg-slate-50 p-2 text-center text-slate-300 select-none">
              {d}
            </div>
          ))}
          {days.map(d => {
            const active = isToday(d, true);
            const formattedDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const isSelected = selectedDateStr === formattedDate;
            const dayEvents = getEventsForDate(formattedDate);
            const classEvents = dayEvents.filter((event) => event.type === "class");
            const hasEvent = dayEvents.some((event) => event.type === "event");

            return (
              <button
                key={`curr-${d}`}
                onClick={() => setSelectedDateStr(formattedDate)}
                className={`relative flex min-h-[104px] flex-col items-stretch gap-1.5 bg-white p-2 text-left align-top transition-all ${
                  isSelected ? "ring-2 ring-inset ring-primary z-10" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`size-6 flex items-center justify-center rounded-full text-[11px] font-semibold ${
                    active ? "bg-primary text-white font-bold" : isSelected ? "text-primary font-bold" : "text-slate-700"
                  }`}>
                    {d}
                  </span>
                  {hasEvent && (
                    <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wide text-amber-700">
                      <span className="size-1.5 rounded-full bg-amber-500" />
                      Event
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {classEvents.slice(0, 2).map((event, index) => (
                    <div
                      key={`${event.desc}-${index}`}
                      className="rounded-md border border-sky-100 bg-sky-50 px-1.5 py-1 text-sky-900"
                      title={`${event.title} · BLK ${event.block || "A"} · ${event.time} · ${event.room}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="block truncate text-[9px] font-extrabold leading-tight">{event.desc}</span>
                        <span className="text-[7.5px] font-black px-1 rounded bg-sky-200/90 text-sky-950 shrink-0">
                          BLK {event.block || "A"}
                        </span>
                      </div>
                      <span className="block truncate text-[8px] font-semibold leading-tight text-sky-700">{event.time}</span>
                    </div>
                  ))}
                  {classEvents.length > 2 && (
                    <span className="block px-1 text-[8px] font-bold text-sky-700">
                      +{classEvents.length - 2} more classes
                    </span>
                  )}
                </div>
              </button>
            );
          })}
          {nextDays.map(d => (
            <div key={`next-${d}`} className="min-h-[104px] bg-slate-50 p-2 text-center text-slate-300 select-none">
              {d}
            </div>
          ))}
        </div>
      </div>

      {/* Selected Day Agenda */}
      <div className="border-t border-slate-100 pt-4 space-y-3">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          Agenda for {new Date(selectedDateStr).toLocaleDateString("en-US", { dateStyle: "long" })}
        </h4>
        {selectedEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selectedEvents.map((evt, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between ${
                  evt.type === "event" 
                    ? "bg-amber-50/70 border-amber-200 text-amber-900" 
                    : "bg-sky-50/60 border-sky-100 text-slate-800"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-extrabold leading-tight flex items-center gap-1.5 flex-wrap">
                      {evt.title}
                      {evt.type === "class" && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-sky-200/80 text-sky-950 border border-sky-300">
                          BLK {evt.block || "A"}
                        </span>
                      )}
                    </span>
                    <Badge variant={evt.type === "event" ? "destructive" : "default"} className="text-[9px] px-1.5 py-0.5 shrink-0">
                      {evt.type === "event" ? "Academic Event" : "Class"}
                    </Badge>
                  </div>
                  {evt.desc && <p className="text-slate-500 font-medium text-[11px] leading-normal">{evt.desc}</p>}
                </div>
                {evt.type === "class" && (
                  <div className="mt-2.5 pt-2 border-t border-sky-100/50 flex flex-wrap justify-between gap-1.5 text-[10px] text-slate-600 font-bold">
                    <span>Time: {evt.time}</span>
                    <span>Room: {evt.room}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 font-medium italic">No scheduled events or classes on this date.</p>
        )}
      </div>
    </Card>
  );
}

export function DashboardPage({ user }: { user: User }) {
  const [tick, setTick] = useState(0);
  const [scheduleView, setScheduleView] = useState<"today" | "week">("today");

  useEffect(() => {
    const handleSync = () => setTick((t) => t + 1);
    window.addEventListener("sscr_store_synced", handleSync);
    return () => window.removeEventListener("sscr_store_synced", handleSync);
  }, []);

  const semesters = user?.id ? getSemesters(user.id) : [];
  const awardSettings = getAwardSettings();
  const allAnnouncements = getAnnouncements();
  const classStartAnnouncement = allAnnouncements.find(
    (announcement) => announcement.title === "Official Start of Classes",
  );
  const classStartDate =
    classStartAnnouncement?.start_date ||
    classStartAnnouncement?.publish_date ||
    "2026-08-17";
  const announcements = allAnnouncements.slice(0, 3);


  const now = new Date();
  const calYear = now.getFullYear();
  const month = now.getMonth() + 1;
  const ayStart = month >= 8 ? calYear : calYear - 1;
  const ayEnd = ayStart + 1;
  const currentAY = `${ayStart}–${ayEnd}`;
  const currentAYAlt = `${ayStart}-${ayEnd}`;

  const currentYearSemesters = semesters.filter((s) => s.academic_year === currentAY || s.academic_year === currentAYAlt);
  const currentSem = currentYearSemesters[currentYearSemesters.length - 1] ?? semesters[semesters.length - 1];
  const currentSubjects = (currentSem ? getSubjects(currentSem.id) : []).filter((sub) => {
    const matchesCourse = !sub.course || sub.course === user.course;
    const matchesYear = !sub.year_level || sub.year_level === user.year_level;
    return matchesCourse && matchesYear;
  });
  
  // GWA Calculation
  const ga = calculateGA(currentSubjects);
  const awardResult = checkAward(ga, currentSubjects, awardSettings);

  // A subject is complete only after a final grade has actually been recorded.
  const completedSubjects = semesters
    .flatMap((semester) => getSubjects(semester.id))
    .filter(hasRecordedFinalGrade);

  // Get Schedule
  const getSchedule = () => {
    const regularYearLevel = String(user?.year_level || "").match(/[1-4]/)?.[0] || "";
    const section = String(user?.section || "").trim().toUpperCase();
    const officialCurriculum = regularYearLevel
      ? getCurriculum({
          course: user?.course || "BSIT",
          year_level: regularYearLevel,
          semester: "First Semester",
        }).filter(
          (item) =>
            !section ||
            !item.block ||
            item.block === "AB" ||
            item.block === section,
        )
      : [];

    const activeSubjectsList = officialCurriculum.length
      ? officialCurriculum.map((c) => ({
        id: c.id,
        semester_id: "default",
        subject_code: c.subject_code,
        subject_name: c.subject_name,
        units: c.units,
        grade: 0,
        status: "Currently Taking" as const,
        course: c.course,
        year_level: c.year_level,
        room: c.room,
        schedule_days: c.schedule_days,
        schedule_time: c.schedule_time,
      }))
      : currentSubjects;

    const scheduleItems: Array<{
      day: string;
      time: string;
      subject_code: string;
      subject_name: string;
      room: string;
    }> = [];

    activeSubjectsList.forEach((sub) => {
      const days = expandScheduleDays(sub.schedule_days || sub.schedule_day);
      const time = sub.schedule_time || (
        sub.schedule_start && sub.schedule_end
          ? `${sub.schedule_start} - ${sub.schedule_end}`
          : ""
      );

      days.forEach((day) => {
        scheduleItems.push({
          day,
          time,
          subject_code: sub.subject_code,
          subject_name: sub.subject_name,
          room: sub.room || "",
        });
      });
    });

    return scheduleItems;
  };

  const schedule = getSchedule();
  const todayDate = new Date();
  const todayDateStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, "0")}-${String(todayDate.getDate()).padStart(2, "0")}`;
  const todayDayName = todayDate.toLocaleDateString("en-US", { weekday: "long" });
  const classesHaveStarted = todayDateStr >= classStartDate;
  const todaysClasses = classesHaveStarted
    ? schedule.filter((s) => s.day === todayDayName)
    : [];

  const priorityVariant = (p: string) =>
    p === "high" ? "destructive" : p === "normal" ? "default" : "muted";

  const initials = user?.full_name
    ? user.full_name.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "S";

  return (
    <div className="space-y-6">
      {/* ── Welcome Card ────────────────────────────────────────── */}
      <Card className="p-6 flex flex-col md:flex-row items-center gap-6 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="size-16 rounded-full bg-primary/10 border border-slate-200 flex items-center justify-center text-primary font-bold text-lg overflow-hidden shrink-0">
          {user.profile_photo ? (
            <img
              src={user.profile_photo}
              alt={user.full_name}
              className="block size-full min-w-full object-cover object-center"
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className="flex-1 text-center md:text-left min-w-0">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
            <h2 className="text-xl font-bold text-slate-900 leading-tight">{user.full_name}</h2>
            {user.verified && (
              <span className="text-xs bg-green-50 text-green-700 font-extrabold px-2 py-0.5 rounded border border-green-200">✓ Verified</span>
            )}
            {user.officer_position && user.officer_position !== "None" && user.officer_position !== "" ? (
              <span className="text-xs bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold shadow-2xs">
                Officer: {user.officer_position}
              </span>
            ) : user.role === "admin" ? (
              <span className="text-xs bg-purple-100 text-purple-900 border border-purple-300 px-2.5 py-0.5 rounded-full font-bold">
                Admin Staff
              </span>
            ) : (
              <span className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full font-semibold">
                Student
              </span>
            )}
          </div>
          <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600 font-semibold max-w-2xl">
            <div>
              <span className="text-slate-400 font-medium block">Student Number</span>
              <span className="font-mono text-slate-800">{user.student_number || "—"}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Program / Course</span>
              <span className="text-slate-800">{user.course || "BSIT"}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Year Level</span>
              <span className="text-slate-800">{user.year_level ? `${user.year_level}th Year` : "1st Year"}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Section</span>
              <span className="text-slate-800">{user.section || "A"}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Notices Section ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Academic Notice Banner */}
        <div className="bg-amber-50/70 border border-amber-200 text-amber-900 p-4.5 rounded-xl text-xs space-y-1">
          <h4 className="font-black uppercase tracking-wider text-[10px] text-amber-850">Official Academic Notice</h4>
          <p className="text-amber-800 font-medium leading-relaxed">
            Pre-enlistment and clearing procedures for the upcoming term must be submitted to department chairs. Classes officially start on August 17, 2026.
          </p>
        </div>

        {/* Sequential Blocking Notice */}
        <div className="bg-slate-50/70 border border-slate-200 text-slate-900 p-4.5 rounded-xl text-xs space-y-1">
          <h4 className="font-black uppercase tracking-wider text-[10px] text-slate-700">Sequential Blocking Information</h4>
          <p className="text-slate-600 font-medium leading-relaxed">
            San Sebastian College Recoletos implements the July 18 Revised Blocking model. Grades must satisfy prerequisite course criteria before registration into succeeding course cycles is allowed.
          </p>
        </div>
      </div>

      {/* ── Quick Statistics (Only 4 Cards) ────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Current GWA"
          value={ga > 0 ? ga.toFixed(2) : "—"}
          sub="Active Semester"
        />
        <StatCard
          label="Completed Subjects"
          value={completedSubjects.length}
          sub="Cumulative Total"
        />
        <StatCard
          label="Current Semester"
          value={currentSem ? `${currentSem.semester}` : "N/A"}
          sub={currentSem ? `${currentSem.academic_year}` : "No semester active"}
        />
        <StatCard
          label="Academic Standing"
          value={awardResult.award ?? "Regular"}
          sub={awardResult.award ? "Dean's List Qualifier" : "Good Standing"}
        />
      </div>

      {/* ── Academic Calendar ────────────────────────────────────── */}
      <DashboardCalendar
        schedule={schedule}
        announcements={allAnnouncements}
        classStartDate={classStartDate}
      />

      {/* ── Schedule and Announcements grid ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card className="p-5 border border-slate-200 rounded-xl bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Today's Schedule</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setScheduleView("today")}
                  className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${scheduleView === "today" ? "bg-slate-100 text-slate-800" : "text-slate-500"}`}
                >
                  Today
                </button>
                <button
                  onClick={() => setScheduleView("week")}
                  className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${scheduleView === "week" ? "bg-slate-100 text-slate-800" : "text-slate-500"}`}
                >
                  Week
                </button>
              </div>
            </div>

            {scheduleView === "today" ? (
              todaysClasses.length > 0 ? (
                <div className="space-y-3">
                  {todaysClasses.map((cls, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-xs">
                      <div>
                        <p className="font-semibold text-slate-900">{cls.subject_name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{cls.subject_code} · {cls.room}</p>
                      </div>
                      <span className="font-mono text-slate-600 shrink-0">{cls.time}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">
                  {classesHaveStarted
                    ? `No classes scheduled for today (${todayDayName}).`
                    : "Classes begin on August 17, 2026."}
                </p>
              )
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {schedule.map((cls, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-xs">
                    <div>
                      <p className="font-semibold text-slate-900">{cls.subject_name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{cls.day} · {cls.subject_code}</p>
                    </div>
                    <span className="font-mono text-slate-600 shrink-0 text-right">{cls.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Recent Announcements */}
        <Card className="p-5 border border-slate-200 rounded-xl bg-white">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Recent Announcements</h3>
          {announcements.length ? (
            <div className="space-y-4">
              {announcements.map((a) => (
                <div key={a.id} className="text-xs border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <h5 className="font-bold text-slate-900 leading-tight">{a.title}</h5>
                    <Badge variant={priorityVariant(a.priority) as any} className="text-[9px] px-1.5 py-0.5">{a.priority}</Badge>
                  </div>
                  <p className="text-slate-500 leading-normal">{a.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No Announcements" />
          )}
        </Card>
      </div>

      <IrregularSubjectPickerModal user={user} semesters={semesters} />
    </div>
  );
}

function IrregularSubjectPickerModal({ user, semesters }: { user: User; semesters: any[] }) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user?.year_level === "Irregular") {
      const userSubs = (semesters || []).flatMap((s) => getSubjects(s.id));
      if (userSubs.length === 0) {
        setOpen(true);
      }
    }
  }, [user, semesters]);

  if (!open || !user) return null;

  const curriculum = getCurriculum({ course: user.course || "BSIT" });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    if (selectedIds.size === 0) return;

    const startAnnouncement = getAnnouncements().find(
      (announcement) => announcement.title === "Official Start of Classes",
    );
    const startYear = Number(
      (startAnnouncement?.start_date || startAnnouncement?.publish_date || "2026-08-17").slice(0, 4),
    );
    const currentAY = `${startYear}–${startYear + 1}`;
    let sem = semesters.find((s) => s.academic_year === currentAY);
    if (!sem) {
      sem = addSemester({ user_id: user.id, academic_year: currentAY, semester: "First Semester" });
    }

    const chosenItems = curriculum.filter((item) => selectedIds.has(item.id));
    chosenItems.forEach((item) => {
      addSubject({
        semester_id: sem.id,
        subject_code: item.subject_code,
        subject_name: item.subject_name,
        units: item.units,
        grade: 0,
        status: "Currently Taking",
      });
    });

    setOpen(false);
    window.location.reload();
  };

  return (
    <Modal open={open} onClose={() => {}} title="📋 Select Subjects" size="lg" preventClose={true}>
      <div className="p-6">
        <p className="text-xs text-slate-500 mb-4">
          As an <strong>Irregular Student</strong>, you must select the specific subjects you are currently enrolled in to populate your active schedule.
        </p>

        <div className="border border-slate-200 rounded-xl max-h-80 overflow-y-auto mb-5 divide-y divide-slate-100 bg-white">
          {curriculum.map((item) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <label
                key={item.id}
                onClick={() => toggleSelect(item.id)}
                className={`flex items-center justify-between p-3 text-xs cursor-pointer transition-colors ${
                  isSelected ? "bg-slate-50 font-semibold" : "hover:bg-slate-50/50 text-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="size-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="font-mono font-bold mr-2 text-primary">{item.subject_code}</span>
                    <span>{item.subject_name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-slate-500 shrink-0">
                  <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded">Yr {item.year_level}</span>
                  <span className="font-mono font-bold text-slate-700">{item.units} units</span>
                </div>
              </label>
            );
          })}
        </div>

        <div className="flex justify-between items-center pt-2">
          <span className="text-xs text-slate-500">
            Selected <strong>{selectedIds.size}</strong> subject(s)
          </span>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleConfirm} disabled={selectedIds.size === 0}>
              Confirm & Save Subjects
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
