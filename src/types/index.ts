export interface User {
  id: string;
  uid?: string;
  full_name: string;
  student_number: string;
  course: string;
  year_level: string;
  role: "student" | "admin";
  email: string;
  verified?: boolean;
  officer_position?: string;
  profile_photo?: string;
  action_photo?: string;
  department?: string;
  section?: string;
  status?: string;
  mustChangePassword?: boolean;
  provider?: "google" | "email" | string;
  created_at?: string;
  updated_at?: string;
}

export const OFFICER_POSITIONS = [
  "None",
  "President",
  "Vice - President",
  "Secretary",
  "Treasurer",
  "Auditor",
  "Sports Comitee (HEAD)",
  "Sports Comitee (Member)",
  "Technical (HEAD)",
  "Technical (Member)",
  "JPCS Content Manager (HEAD)",
  "JPCS Content Manager (Member)",
] as const;

export interface Semester {
  id: string;
  user_id: string;
  academic_year: string;
  semester: string;
}

export interface Subject {
  id: string;
  semester_id: string;
  subject_code: string;
  subject_name: string;
  units: number;
  grade: number;
  status?: "Currently Taking" | "Waiting" | "Graded";
  block?: "A" | "B" | "AB";
  lec_units?: number;
  lab_units?: number;
  schedule_days?: string;
  schedule_time?: string;
  course?: string;
  year_level?: string;
  schedule_day?: string;
  schedule_start?: string;
  schedule_end?: string;
  room?: string;
}

export interface CurriculumItem {
  id: string;
  course: string;
  year_level: string;
  semester: string;
  subject_code: string;
  subject_name: string;
  units: number;
  block?: "A" | "B" | "AB";
  lec_units?: number;
  lab_units?: number;
  schedule_days?: string;
  schedule_time?: string;
  room?: string;
}

export interface AwardSetting {
  id: string;
  award_name: string;
  minimum_average: number;
  minimum_subject_grade: number;
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  publish_date: string;
  priority: "low" | "normal" | "high";
  start_date?: string;
}

export interface AwardResult {
  award: string | null;
  reason: string;
}

export interface AccountRequest {
  requestId: string;
  fullName: string;
  email: string;
  year: string;
  studentNumber: string;
  status: "pending" | "approved" | "rejected";
  submittedAt?: any;
  updatedAt?: any;
  reviewedAt?: any;
  reviewedBy?: string | null;
  rejectionReason?: string | null;
  createdUserUid?: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

