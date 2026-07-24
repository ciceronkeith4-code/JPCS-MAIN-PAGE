import type { CurriculumItem, Subject } from "./types";

const DAY_NAMES: Record<string, string> = {
  M: "Monday",
  MON: "Monday",
  MONDAY: "Monday",
  T: "Tuesday",
  TU: "Tuesday",
  TUE: "Tuesday",
  TUESDAY: "Tuesday",
  W: "Wednesday",
  WED: "Wednesday",
  WEDNESDAY: "Wednesday",
  TH: "Thursday",
  THU: "Thursday",
  THURSDAY: "Thursday",
  F: "Friday",
  FRI: "Friday",
  FRIDAY: "Friday",
  S: "Saturday",
  SAT: "Saturday",
  SATURDAY: "Saturday",
};

export function expandScheduleDays(days?: string): string[] {
  if (!days?.trim()) return [];

  return Array.from(new Set(
    days
      .toUpperCase()
      .split(/\s*(?:\/|&|-)\s*/)
      .map((token) => DAY_NAMES[token.trim()])
      .filter((day): day is string => Boolean(day)),
  ));
}

export function applyCurriculumSchedule(
  subject: Subject,
  curriculum: CurriculumItem[],
): Subject {
  const official = curriculum.find(
    (item) => item.subject_code.trim() === subject.subject_code.trim(),
  );

  if (!official) {
    return {
      ...subject,
      schedule_days: undefined,
      schedule_time: undefined,
      schedule_day: undefined,
      schedule_start: undefined,
      schedule_end: undefined,
      room: undefined,
    };
  }

  return {
    ...subject,
    schedule_days: official.schedule_days || undefined,
    schedule_time: official.schedule_time || undefined,
    schedule_day: official.schedule_days || undefined,
    schedule_start: undefined,
    schedule_end: undefined,
    room: official.room || undefined,
  };
}
