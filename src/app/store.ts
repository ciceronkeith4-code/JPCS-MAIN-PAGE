import type { User, Semester, Subject, CurriculumItem, AwardSetting, Announcement, AwardResult } from "./types";
import { db, auth } from "../firebase/config";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
} from "firebase/firestore";
import { onAuthStateChanged, createUserWithEmailAndPassword, sendEmailVerification, signOut as firebaseSignOut, signInWithEmailAndPassword } from "firebase/auth";
import { APP_CONFIG } from "./config/app.config";
import { AuthService, type LoginEmailStatus } from "./services/auth.service";
import { ProfileService } from "./services/profile.service";
import { SemesterService } from "./services/semester.service";
import { SubjectService } from "./services/subject.service";
import { CurriculumService } from "./services/curriculum.service";
import { AnnouncementService } from "./services/announcement.service";
import { StorageService } from "./services/storage.service";
import { applyCurriculumSchedule } from "./schedule";

const KEYS = {
  users: "sscr_users",
  semesters: "sscr_semesters",
  subjects: "sscr_subjects",
  curriculum: "sscr_curriculum",
  awardSettings: "sscr_award_settings",
  announcements: "sscr_announcements",
  session: "sscr_session",
  // UI State cache
  uiSidebar: "sscr_ui_sidebar",
  uiTheme: "sscr_ui_theme",
  uiLastSem: "sscr_ui_last_sem",
};

const CACHE_VERSION = "v1.0.0";

interface CacheWrapper<T> {
  version: string;
  updated_at: number;
  expires_at: number;
  data: T;
}

// ── Cache Helpers ─────────────────────────────────────────────────────────

function getCacheKey(key: string) {
  return `${key}_wrapped`;
}

function loadCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(getCacheKey(key));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as CacheWrapper<T>;
    if (parsed.version !== CACHE_VERSION) {
      localStorage.removeItem(getCacheKey(key));
      return fallback;
    }
    if (Date.now() > parsed.expires_at) {
      // Invalidate expired cache
      return fallback;
    }
    return parsed.data;
  } catch {
    return fallback;
  }
}

function saveCache<T>(key: string, value: T) {
  try {
    const wrapper: CacheWrapper<T> = {
      version: CACHE_VERSION,
      updated_at: Date.now(),
      expires_at: Date.now() + APP_CONFIG.cacheTTL,
      data: value,
    };
    localStorage.setItem(getCacheKey(key), JSON.stringify(wrapper));
  } catch (err) {
    console.error(`localStorage saveCache error for "${key}":`, err);
  }
}

const isFirebaseConfigured = () => {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  return !!(apiKey && projectId && apiKey !== "placeholder-api-key");
};

// ── Request Deduplication ──────────────────────────────────────────────────
const activePromises: Record<string, Promise<any>> = {};

function deduplicate<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
  if (activePromises[key]) {
    return activePromises[key] as Promise<T>;
  }
  const promise = fetchFn().finally(() => {
    delete activePromises[key];
  });
  activePromises[key] = promise;
  return promise;
}

// ── Seed default data ──────────────────────────────────────────────────────

const DEFAULT_AWARD_SETTINGS: AwardSetting[] = [
  { id: "1", award_name: "Gold Medalist", minimum_average: 95, minimum_subject_grade: 91.5 },
  { id: "2", award_name: "Silver Medalist", minimum_average: 92, minimum_subject_grade: 88.5 },
  { id: "3", award_name: "Bronze Medalist", minimum_average: 85, minimum_subject_grade: 84.5 },
];

const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "1",
    title: "Enrollment for Second Semester 2025–2026 is now open",
    description: "Students may now enroll for the upcoming semester. Please coordinate with your respective departments for pre-enlistment and clearance procedures.",
    publish_date: "2026-01-10",
    priority: "high",
  },
  {
    id: "2",
    title: "Grade submission deadline extended",
    description: "The deadline for submitting final grades has been moved to January 20, 2026. Faculty members are advised to comply accordingly.",
    publish_date: "2026-01-08",
    priority: "normal",
  },
  {
    id: "3",
    title: "SSCR Academic Excellence Awards Night",
    description: "The annual Academic Excellence Awards Night will be held on February 14, 2026. Top-performing students will be recognized for their achievements.",
    publish_date: "2026-01-05",
    priority: "normal",
  },
  {
    id: "4",
    title: "Official Start of Classes",
    description: "1st Semester AY 2026-2027",
    publish_date: "2026-08-17",
    start_date: "2026-08-17",
    priority: "high",
  },
];

const DEFAULT_CURRICULUM: CurriculumItem[] = [
  { id: "c1", course: "BSIT", year_level: "1", semester: "First Semester", block: "AB", subject_code: "RF1", subject_name: "Recoletos Formation 1", units: 1, schedule_days: "MONDAY", schedule_time: "10:30 - 12:30", room: "Smart Class" },
  { id: "c2", course: "BSIT", year_level: "1", semester: "First Semester", block: "A", subject_code: "GEC101", subject_name: "Understanding the Self", units: 3, schedule_days: "M-TH", schedule_time: "7:30-9:00", room: "C403" },
  { id: "c3", course: "BSIT", year_level: "1", semester: "First Semester", block: "A", subject_code: "ITE101", subject_name: "Introduction to Computing", units: 3, schedule_days: "M-TH", schedule_time: "1:00 - 2:30", room: "Smart Class" },
  { id: "c4", course: "BSIT", year_level: "1", semester: "First Semester", block: "A", subject_code: "THEO 101", subject_name: "Renewal of Christian Faith", units: 3, schedule_days: "M-TH", schedule_time: "2:30 - 4:00", room: "Smart Class" },
  { id: "c5", course: "BSIT", year_level: "1", semester: "First Semester", block: "B", subject_code: "ITE102", subject_name: "Program Logic Formulation & Computer Prog 1", units: 3, schedule_days: "M/TH/S", schedule_time: "8:30 - 10:30", room: "CLAB 1/OL" },
  { id: "c6", course: "BSIT", year_level: "1", semester: "First Semester", block: "B", subject_code: "ITP 111", subject_name: "Human Computer Interaction", units: 3, schedule_days: "T/W/F", schedule_time: "10:30 - 12:30", room: "NETLAB" },
  { id: "c7", course: "BSIT", year_level: "1", semester: "First Semester", block: "B", subject_code: "GEC105", subject_name: "Mathematics in the Modern World", units: 3, schedule_days: "M-TH", schedule_time: "1:00-2:30", room: "C401" },
  { id: "c8", course: "BSIT", year_level: "1", semester: "First Semester", block: "B", subject_code: "PHE101", subject_name: "Movement Enhancement", units: 2, schedule_days: "M-TH", schedule_time: "2:30-3:30", room: "C403" },
  { id: "c9", course: "BSIT", year_level: "1", semester: "First Semester", block: "B", subject_code: "CWTS1", subject_name: "Civic Welfare Training Service 1", units: 3, schedule_days: "M-TH", schedule_time: "4:00-5:30", room: "Smart Class" },
  { id: "c10", course: "BSIT", year_level: "2", semester: "First Semester", block: "A", subject_code: "GEC 102", subject_name: "Readings in Philippine History", units: 3, schedule_days: "M-T-W", schedule_time: "7:30-9:00", room: "SmartClass" },
  { id: "c11", course: "BSIT", year_level: "2", semester: "First Semester", block: "A", subject_code: "ITE 104", subject_name: "Data Structures & Algorithms", units: 3, schedule_days: "M & TH", schedule_time: "9:00 - 12:00", room: "CLAB3" },
  { id: "c12", course: "BSIT", year_level: "2", semester: "First Semester", block: "A", subject_code: "ITP 121", subject_name: "Platform Technologies", units: 3, schedule_days: "M-W-TH", schedule_time: "1:00 - 2:30", room: "NETLAB" },
  { id: "c13", course: "BSIT", year_level: "2", semester: "First Semester", block: "A", subject_code: "PE 103", subject_name: "PATHFit 3: Dance", units: 2, schedule_days: "M-TH", schedule_time: "2:30-3:30", room: "C402" },
  { id: "c14", course: "BSIT", year_level: "2", semester: "First Semester", block: "A", subject_code: "ITE 108", subject_name: "Quantitative Methods with Modeling & Simulation", units: 3, schedule_days: "M/TH", schedule_time: "3:30 - 5:30", room: "C407" },
  { id: "c15", course: "BSIT", year_level: "2", semester: "First Semester", block: "B", subject_code: "THEO 103", subject_name: "Mysteries of Christian Faith", units: 3, schedule_days: "M-TH", schedule_time: "7:30 - 9:00", room: "C403" },
  { id: "c16", course: "BSIT", year_level: "2", semester: "First Semester", block: "B", subject_code: "RF 104", subject_name: "Recoletos Formation 4", units: 1, schedule_days: "TUESDAY", schedule_time: "10:30-12:00", room: "SmartClass" },
  { id: "c17", course: "BSIT", year_level: "2", semester: "First Semester", block: "B", subject_code: "IT TRACK1", subject_name: "IT Track1 (Cloud Computing)", units: 3, schedule_days: "M-TH", schedule_time: "1:00 - 2:30", room: "510" },
  { id: "c18", course: "BSIT", year_level: "2", semester: "First Semester", block: "B", subject_code: "ITP 117", subject_name: "Object Oriented Programming", units: 3, schedule_days: "M/TH/S", schedule_time: "3:00 - 5:00", room: "CLAB1" },
  { id: "c19", course: "BSIT", year_level: "3", semester: "First Semester", block: "AB", subject_code: "ITP128", subject_name: "Capstone 1", units: 3, schedule_days: "F", schedule_time: "2:00 - 3:00", room: "online" },
  { id: "c20", course: "BSIT", year_level: "3", semester: "First Semester", block: "AB", subject_code: "IPE3", subject_name: "Professional Elective 3 (Cyber Security)", units: 3, schedule_days: "Saturday", schedule_time: "9:00 - 12:00", room: "online" },
  { id: "c21", course: "BSIT", year_level: "3", semester: "First Semester", block: "AB", subject_code: "IPE 2", subject_name: "Professional Elective 2 (Data Analytics)", units: 3, schedule_days: "Saturday", schedule_time: "3:00 - 6:00", room: "online" },
  { id: "c22", course: "BSIT", year_level: "3", semester: "First Semester", block: "A", subject_code: "GEC104", subject_name: "Ethics", units: 3, schedule_days: "M-TH", schedule_time: "7:30-9:00", room: "C406" },
  { id: "c23", course: "BSIT", year_level: "3", semester: "First Semester", block: "A", subject_code: "GEC110", subject_name: "Art Appreciation", units: 3, schedule_days: "M-TH", schedule_time: "9:00-10:30", room: "C403" },
  { id: "c24", course: "BSIT", year_level: "3", semester: "First Semester", block: "A", subject_code: "REL301", subject_name: "The Mysteries of Christian Faith", units: 3, schedule_days: "M-TH", schedule_time: "10:30-12:00", room: "c406" },
  { id: "c25", course: "BSIT", year_level: "3", semester: "First Semester", block: "A", subject_code: "ITP113", subject_name: "Information Assurance and Security", units: 3, schedule_days: "M-TH", schedule_time: "1:00 - 2:30", room: "510" },
  { id: "c26", course: "BSIT", year_level: "3", semester: "First Semester", block: "A", subject_code: "IT TRACK 2", subject_name: "IT TRACK 2", units: 3, schedule_days: "T/W/F", schedule_time: "2:30 - 4:30", room: "NETLAB" },
  { id: "c27", course: "BSIT", year_level: "3", semester: "First Semester", block: "B", subject_code: "ITP130", subject_name: "Practicum 1", units: 3, schedule_days: "Friday", schedule_time: "1:00 - 3:00", room: "consultation" },
  { id: "c28", course: "BSIT", year_level: "4", semester: "First Semester", block: "AB", subject_code: "ITP129", subject_name: "Capstone Project 2", units: 3, schedule_days: "T/W/TH", schedule_time: "1:00 - 2:00/ Consultation", room: "510" },
  { id: "c29", course: "BSIT", year_level: "4", semester: "First Semester", block: "A", subject_code: "ITP131", subject_name: "Practicum 2", units: 3, schedule_days: "F", schedule_time: "Consultation", room: "ONLINE" },
  { id: "c30", course: "BSIT", year_level: "4", semester: "First Semester", block: "B", subject_code: "ITP123", subject_name: "System Administration & Maintenance", units: 3, schedule_days: "M-F", schedule_time: "9:00 - 10:30", room: "NETLAB" },
  { id: "c31", course: "BSIT", year_level: "4", semester: "First Semester", block: "B", subject_code: "IT Track 4", subject_name: "IT Track 4 - (Integrative Programming & Technologies)", units: 3, schedule_days: "M/TH/S", schedule_time: "10:30-12:30", room: "CLAB3" },
  { id: "c32", course: "BSIT", year_level: "4", semester: "First Semester", block: "B", subject_code: "IT Track 5", subject_name: "IT Track 5", units: 3, schedule_days: "M/TH/S", schedule_time: "1:00 - 3:00", room: "C407" }
];

function hydrateLegacyCurriculumSchedule(items: CurriculumItem[]): CurriculumItem[] {
  const hasScheduleSchema = items.some(
    (item) =>
      Object.prototype.hasOwnProperty.call(item, "schedule_days") ||
      Object.prototype.hasOwnProperty.call(item, "schedule_time") ||
      Object.prototype.hasOwnProperty.call(item, "room"),
  );
  if (hasScheduleSchema) return items;

  return items.map((item) => {
    const official = DEFAULT_CURRICULUM.find(
      (candidate) =>
        candidate.course === item.course &&
        candidate.subject_code === item.subject_code,
    );
    return official
      ? {
          ...item,
          schedule_days: official.schedule_days,
          schedule_time: official.schedule_time,
          room: official.room,
        }
      : item;
  });
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── Init Store & Setup Realtime ───────────────────────────────────────────

let isInitialized = false;

export function initStore() {
  if (isInitialized) return;
  isInitialized = true;

  if (!localStorage.getItem(getCacheKey(KEYS.awardSettings))) saveCache(KEYS.awardSettings, DEFAULT_AWARD_SETTINGS);
  if (!localStorage.getItem(getCacheKey(KEYS.announcements))) saveCache(KEYS.announcements, DEFAULT_ANNOUNCEMENTS);
  saveCache(KEYS.curriculum, DEFAULT_CURRICULUM);

  if (isFirebaseConfigured()) {
    let unsubscribers: (() => void)[] = [];

    onAuthStateChanged(auth, (firebaseUser) => {
      if (import.meta.env.DEV) {
        console.debug("Firebase auth state changed", { userId: firebaseUser?.uid });
      }

      // Clean up previous listeners
      unsubscribers.forEach((unsub) => unsub());
      unsubscribers = [];

      if (firebaseUser && firebaseUser.emailVerified) {
        // Authenticated and verified user exists: start sync and listeners
        syncFromFirebase().catch(console.error);

        if (APP_CONFIG.features.Realtime) {
          const tables = ["users", "announcements", "semesters", "subjects", "curriculum", "award_settings"];
          tables.forEach((table) => {
            const unsub = onSnapshot(
              collection(db, table),
              () => {
                syncFromFirebase().catch(console.error);
              },
              (error) => {
                console.warn(`Firestore real-time subscription error for ${table}:`, error.message);
              }
            );
            unsubscribers.push(unsub);
          });
        }
      }
    });
  }
}

// ── Background Sync ────────────────────────────────────────────────────────

export async function syncFromFirebase() {
  if (!isFirebaseConfigured()) return;
  await deduplicate("sync", async () => {
    try {
      const [rUsers, rSems, rSubs, rCurr, rAnn] = await Promise.all([
        ProfileService.fetchAll(),
        SemesterService.fetchAll(),
        SubjectService.fetchAll(),
        CurriculumService.fetchAll(),
        AnnouncementService.fetchAll(),
      ]);

      // Fetch award_settings directly from Firestore
      const awardSnap = await getDocs(collection(db, "award_settings"));
      const awardData = awardSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as AwardSetting[];

      let changed = false;

      if (rUsers.success && rUsers.data) {
        saveCache(KEYS.users, rUsers.data);
        changed = true;
      }
      if (rSems.success && rSems.data) {
        saveCache(KEYS.semesters, rSems.data);
        changed = true;
      }
      if (rSubs.success && rSubs.data) {
        saveCache(KEYS.subjects, rSubs.data);
        changed = true;
      }
      if (rCurr.success && rCurr.data) {
        saveCache(KEYS.curriculum, hydrateLegacyCurriculumSchedule(rCurr.data));
        changed = true;
      }
      if (awardData.length) {
        saveCache(KEYS.awardSettings, awardData);
        changed = true;
      }
      if (rAnn.success && rAnn.data) {
        saveCache(KEYS.announcements, rAnn.data);
        changed = true;
      }

      const session = getSession();
      if (
        session?.role === "student" &&
        rSems.success &&
        rSems.data &&
        rSubs.success &&
        rSubs.data &&
        rCurr.success &&
        rCurr.data
      ) {
        const provisioned = await ensureCurrentAcademicRecords(
          session,
          rSems.data,
          rSubs.data,
          rCurr.data,
        );
        if (provisioned) changed = true;
      }

      if (changed) {
        if (session && rUsers.data) {
          const fresh = rUsers.data.find((u) => u.id === session.id);
          if (fresh) saveCache(KEYS.session, fresh);
        }
        window.dispatchEvent(new Event("sscr_store_synced"));
      }
    } catch (err) {
      console.error("Firebase sync query error:", err);
    }
  });
}

async function ensureCurrentAcademicRecords(
  user: User,
  semesters: Semester[],
  subjects: Subject[],
  curriculum: CurriculumItem[],
): Promise<boolean> {
  if (!user.year_level || user.year_level === "Irregular") return false;

  const today = new Date();
  const month = today.getMonth() + 1;
  const firstSemester = month >= 6;
  const academicYearStart = firstSemester ? today.getFullYear() : today.getFullYear() - 1;
  const academicYear = `${academicYearStart}–${academicYearStart + 1}`;
  const semesterName = firstSemester ? "First Semester" : "Second Semester";

  const matchingCurriculum = curriculum.filter(
    (item) =>
      item.course === user.course &&
      String(item.year_level) === String(user.year_level) &&
      item.semester === semesterName,
  );
  if (!matchingCurriculum.length) return false;

  let semester = semesters.find(
    (item) =>
      item.user_id === user.id &&
      item.semester === semesterName &&
      item.academic_year.replace("-", "–") === academicYear,
  );
  let changed = false;

  if (!semester) {
    semester = {
      id: `auto_${user.id}_${academicYearStart}_${firstSemester ? "1" : "2"}`,
      user_id: user.id,
      academic_year: academicYear,
      semester: semesterName,
    };
    const semesterResult = await SemesterService.add(semester);
    if (!semesterResult.success) {
      console.warn("Automatic semester creation failed:", semesterResult.error);
      return false;
    }
    semesters.push(semester);
    saveCache(KEYS.semesters, semesters);
    changed = true;
  }

  const existingCodes = new Set(
    subjects
      .filter((subject) => subject.semester_id === semester.id)
      .map((subject) => subject.subject_code.trim().toLowerCase()),
  );
  const missingSubjects: Subject[] = matchingCurriculum
    .filter((item) => !existingCodes.has(item.subject_code.trim().toLowerCase()))
    .map((item) => {
      const [scheduleStart, scheduleEnd] = (item.schedule_time || "")
        .split(/\s*-\s*/, 2)
        .map((value) => value.trim());

      return {
        id: `auto_${semester.id}_${item.id}`,
        semester_id: semester.id,
        subject_code: item.subject_code,
        subject_name: item.subject_name,
        units: item.units,
        grade: 0,
        status: "Currently Taking",
        course: item.course,
        year_level: String(item.year_level),
        schedule_day: item.schedule_days,
        schedule_start: scheduleStart || undefined,
        schedule_end: scheduleEnd || undefined,
        room: item.room,
      };
    });

  if (missingSubjects.length) {
    const subjectResult = await SubjectService.bulkAdd(missingSubjects);
    if (!subjectResult.success) {
      console.warn("Automatic subject creation failed:", subjectResult.error);
      return changed;
    }
    subjects.push(...missingSubjects);
    saveCache(KEYS.subjects, subjects);
    changed = true;
  }

  return changed;
}

// ── Auth & Profile Actions ────────────────────────────────────────────────

export function isUserOnline(userId: string): boolean {
  const currentSession = getSession();
  if (currentSession && currentSession.id === userId) return true;
  const onlineUsers = loadCache<string[]>("sscr_online_users", []);
  return onlineUsers.includes(userId);
}

export function setOnlineStatus(userId: string, online: boolean) {
  const onlineUsers = loadCache<string[]>("sscr_online_users", []);
  if (online) {
    if (!onlineUsers.includes(userId)) saveCache("sscr_online_users", [...onlineUsers, userId]);
  } else {
    saveCache("sscr_online_users", onlineUsers.filter((id) => id !== userId));
  }
}

export function getSession(): User | null {
  const session = loadCache<User | null>(KEYS.session, null);
  if (session) {
    setOnlineStatus(session.id, true);
  }
  return session;
}

export async function refreshSessionFromFirebase(): Promise<User | null> {
  if (!isFirebaseConfigured()) return getSession();

  const result = await ProfileService.fetchCurrent();
  if (!result.success || !result.data) {
    localStorage.removeItem(getCacheKey(KEYS.session));
    return null;
  }

  saveCache(KEYS.session, result.data);
  await syncFromFirebase();
  return result.data;
}

export async function checkLoginEmail(email: string): Promise<{ status: LoginEmailStatus | null; error?: string }> {
  const result = await AuthService.checkLoginEmail(email);
  if (!result.success || !result.data) {
    return { status: null, error: result.error || "Unable to check this email address." };
  }
  return { status: result.data };
}

export async function login(email: string, password: string): Promise<{ user: User | null; error?: string }> {
  const res = await AuthService.login(email, password);
  if (res.success && res.data) {
    const firebaseUser = res.data;
    const userId = firebaseUser.uid;
    const userRef = doc(db, "users", userId);
    
    let profile: User | null = null;
    try {
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        profile = { id: userId, ...userSnap.data() } as User;
        
        // Ensure verified flag is true in local session
        profile.verified = true;
      } else {
        // First verified login: retrieve details from pending_profiles
        console.log("Verified login detected, loading pending profile details...");
        const pendingRef = doc(db, "pending_profiles", userId);
        const pendingSnap = await getDoc(pendingRef);

        if (pendingSnap.exists()) {
          const pendingData = pendingSnap.data();
          profile = { ...pendingData, id: userId, role: "student", verified: true } as User;

          // Create official Firestore user profile
          console.log("Migrating pending profile to users collection...");
          await setDoc(userRef, profile);

          // Seed semesters and subjects for regular students
          if (profile.year_level && profile.year_level !== "Irregular") {
            console.log("Auto-seeding academic records for verified student...");
            const targetYearNum = parseInt(profile.year_level) || 1;
            const curriculum = loadCache<CurriculumItem[]>(KEYS.curriculum, DEFAULT_CURRICULUM);
            
            const semId = uid();
            const sem: Semester = {
              id: semId,
              user_id: userId,
              academic_year: "2025–2026",
              semester: "First Semester"
            };

            // Save to local cache first
            const allSems = loadCache<Semester[]>(KEYS.semesters, []);
            saveCache(KEYS.semesters, [...allSems, sem]);

            // Save to Firestore
            await SemesterService.add(sem);

            const matching = curriculum.filter(
              (c) => c.course === profile!.course && String(c.year_level) === String(targetYearNum) && c.semester === "First Semester"
            );

            const subjectsToInsert: Subject[] = matching.map((item) => ({
              id: uid(),
              semester_id: semId,
              subject_code: item.subject_code,
              subject_name: item.subject_name,
              units: item.units,
              grade: 0,
              status: "Graded",
            }));

            // Save to local cache first
            const allSubs = loadCache<Subject[]>(KEYS.subjects, []);
            saveCache(KEYS.subjects, [...allSubs, ...subjectsToInsert]);

            // Save to Firestore
            await SubjectService.bulkAdd(subjectsToInsert);
          }

          // Delete temporary pending profile
          await deleteDoc(pendingRef);
          console.log("Pending profile deleted successfully.");
        } else {
          // Fallback if no pending profile document exists
          console.log("No pending profile found, creating default user doc...");
          profile = {
            id: userId,
            email: firebaseUser.email || email.trim().toLowerCase(),
            full_name: String(firebaseUser.displayName || email.split("@")[0]),
            student_number: "",
            course: "BSIT",
            year_level: "1",
            role: "student",
            verified: true,
          };
          await setDoc(userRef, profile);
        }
      }

      saveCache(KEYS.session, profile);
      setOnlineStatus(profile.id, true);
      await syncFromFirebase();
      return { user: profile };
    } catch (err: any) {
      console.error("Error setting up verified user session:", err);
      await firebaseSignOut(auth);
      return { user: null, error: err.message || "Failed to set up verified user session." };
    }
  }
  return { user: null, error: res.error || "Login failed" };
}

export function logout() {
  const currentSession = getSession();
  if (currentSession) {
    setOnlineStatus(currentSession.id, false);
  }
  localStorage.removeItem(getCacheKey(KEYS.session));
  AuthService.logout().catch(() => {});
}

export async function register(data: Omit<User, "id" | "role"> & { password: string }): Promise<{ user: User | null; error?: string }> {
  console.log("Starting registration process...");
  try {
    let finalId = uid();
    let credential: any = null;

    if (isFirebaseConfigured()) {
      console.log("Creating account...");
      try {
        credential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        console.log("Account created. UID:", credential.user.uid);
        finalId = credential.user.uid;
      } catch (authErr: any) {
        console.error("Firebase auth signUp error. Complete error object:", authErr);
        return { user: null, error: authErr.message || "Registration failed during account creation." };
      }

      console.log("Sending verification email...");
      try {
        await sendEmailVerification(credential.user);
        console.log("Verification email successfully sent");
      } catch (emailErr: any) {
        console.error("Verification email failed to send. Complete error object:", emailErr);
        // Clean up the registered auth user so they can attempt registration again
        try {
          await credential.user.delete();
          console.log("Cleaned up Auth account due to email failure.");
        } catch (cleanupErr) {
          console.error("Failed to clean up Auth account:", cleanupErr);
        }
        return { user: null, error: emailErr.message || "Failed to send verification email. Please verify your email address is correct." };
      }
    }

    const newUser: User = { ...data, id: finalId, role: "student", verified: false };

    // Save locally
    const currentUsers = loadCache<User[]>(KEYS.users, []);
    saveCache(KEYS.users, [...currentUsers, newUser]);

    // Save registration details to pending_profiles instead of users collection
    if (isFirebaseConfigured() && credential) {
      console.log("Saving details to pending_profiles...");
      try {
        await setDoc(doc(db, "pending_profiles", finalId), newUser);
        console.log("Pending profile details saved");
      } catch (dbErr: any) {
        console.error("Firestore pending profile creation failed. Complete error object:", dbErr);
        // Clean up Auth user if Firestore doc creation fails
        try {
          await credential.user.delete();
          console.log("Cleaned up Auth account due to database write failure.");
        } catch (cleanupErr) {
          console.error("Failed to clean up Auth account:", cleanupErr);
        }
        return { user: null, error: dbErr.message || "Failed to save registration details. Please try again." };
      }

      console.log("Signing out user to enforce verification on next login...");
      await firebaseSignOut(auth);
      console.log("Registration completed");
    }

    return { user: newUser };
  } catch (err: any) {
    console.error("Unexpected registration error. Complete error object:", err);
    return { user: null, error: err?.message || "Registration failed" };
  }
}

export async function resendVerification(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  console.log("Resending verification email for:", email);
  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    console.log("Signed in temporary session. UID:", credential.user.uid, "EmailVerified status:", credential.user.emailVerified);
    
    await sendEmailVerification(credential.user);
    console.log("Resend verification email successfully sent to:", credential.user.email);
    
    await firebaseSignOut(auth);
    console.log("Signed out temporary session");
    return { success: true };
  } catch (err: any) {
    console.error("Resend verification email failed. Complete error object:", err);
    if (auth.currentUser) {
      await firebaseSignOut(auth);
      console.log("Cleaned up signed-in session after resend error");
    }
    return { success: false, error: err.message || "Failed to resend verification email." };
  }
}


export function updateProfile(id: string, data: Partial<User>) {
  const users = loadCache<User[]>(KEYS.users, []);
  let targetUser: User | null = null;

  const updated = users.map((u) => {
    if (u.id === id || (u.student_number && data.student_number && u.student_number === data.student_number)) {
      const merged = { ...u, ...data };
      targetUser = merged;
      return merged;
    }
    return u;
  });

  if (!targetUser) {
    targetUser = {
      id: id || uid(),
      full_name: data.full_name || "Student",
      student_number: data.student_number || "",
      course: data.course || "BSIT",
      year_level: data.year_level || "1",
      role: data.role || "student",
      email: data.email || "",
      verified: true,
    };
    updated.push(targetUser);
  }

  saveCache(KEYS.users, updated);

  const session = getSession();
  if (session && session.id === id) {
    saveCache(KEYS.session, { ...session, ...data });
  }

  if (isFirebaseConfigured()) {
    ProfileService.update(id, data).then((res) => {
      if (!res.success) {
        console.warn("Profile update warning in Firebase:", res.error);
      }
      // Always re-sync from DB to confirm changes persisted
      syncFromFirebase().catch(console.error);
    }).catch(() => {
      syncFromFirebase().catch(console.error);
    });
  } else {
    window.dispatchEvent(new Event("sscr_store_synced"));
  }

  return targetUser;
}

// ── Semesters ─────────────────────────────────────────────────────────────

export function getSemesters(userId: string): Semester[] {
  return loadCache<Semester[]>(KEYS.semesters, []).filter((s) => s.user_id === userId);
}

export function addSemester(data: Omit<Semester, "id">): Semester {
  const all = loadCache<Semester[]>(KEYS.semesters, []);
  const sem: Semester = { ...data, id: uid() };
  saveCache(KEYS.semesters, [...all, sem]);

  if (isFirebaseConfigured()) {
    SemesterService.add(sem).then((res) => {
      if (!res.success) {
        console.warn("Semester add warning in Firebase:", res.error);
        saveCache(KEYS.semesters, all);
        window.dispatchEvent(new Event("sscr_store_synced"));
      }
    }).catch((err) => {
      console.warn("Semester add error in Firebase:", err);
      saveCache(KEYS.semesters, all);
      window.dispatchEvent(new Event("sscr_store_synced"));
    });
  }

  return sem;
}

export async function createSemester(
  data: Omit<Semester, "id">,
): Promise<{ success: boolean; data: Semester | null; error?: string }> {
  const duplicate = getSemesters(data.user_id).find(
    (semester) =>
      semester.academic_year.replace("-", "–") === data.academic_year.replace("-", "–") &&
      semester.semester === data.semester,
  );
  if (duplicate) {
    return {
      success: false,
      data: null,
      error: `${data.academic_year} ${data.semester} already exists.`,
    };
  }

  const semester: Semester = { ...data, id: uid() };
  if (isFirebaseConfigured()) {
    const result = await SemesterService.add(semester);
    if (!result.success) {
      return { success: false, data: null, error: result.error || "Unable to create semester." };
    }
  }

  const current = loadCache<Semester[]>(KEYS.semesters, []);
  saveCache(KEYS.semesters, [...current.filter((item) => item.id !== semester.id), semester]);
  window.dispatchEvent(new Event("sscr_store_synced"));
  return { success: true, data: semester };
}

export async function editSemester(
  id: string,
  data: Partial<Semester>,
): Promise<{ success: boolean; error?: string }> {
  const current = loadCache<Semester[]>(KEYS.semesters, []);
  const target = current.find((semester) => semester.id === id);
  if (!target) return { success: false, error: "Semester not found." };

  const nextAcademicYear = data.academic_year || target.academic_year;
  const nextSemesterName = data.semester || target.semester;
  const duplicate = current.find(
    (semester) =>
      semester.id !== id &&
      semester.user_id === target.user_id &&
      semester.academic_year.replace("-", "–") === nextAcademicYear.replace("-", "–") &&
      semester.semester === nextSemesterName,
  );
  if (duplicate) {
    return {
      success: false,
      error: `${nextAcademicYear} ${nextSemesterName} already exists.`,
    };
  }

  if (isFirebaseConfigured()) {
    const result = await SemesterService.update(id, data);
    if (!result.success) {
      return { success: false, error: result.error || "Unable to update semester." };
    }
  }

  saveCache(KEYS.semesters, current.map((semester) => (
    semester.id === id ? { ...semester, ...data } : semester
  )));
  window.dispatchEvent(new Event("sscr_store_synced"));
  return { success: true };
}

export async function removeSemester(id: string): Promise<{ success: boolean; error?: string }> {
  if (isFirebaseConfigured()) {
    const result = await SemesterService.delete(id);
    if (!result.success) {
      return { success: false, error: result.error || "Unable to delete semester." };
    }
  }

  const semesters = loadCache<Semester[]>(KEYS.semesters, []);
  const subjects = loadCache<Subject[]>(KEYS.subjects, []);
  saveCache(KEYS.semesters, semesters.filter((semester) => semester.id !== id));
  saveCache(KEYS.subjects, subjects.filter((subject) => subject.semester_id !== id));
  window.dispatchEvent(new Event("sscr_store_synced"));
  return { success: true };
}

export function updateSemester(id: string, data: Partial<Semester>) {
  const all = loadCache<Semester[]>(KEYS.semesters, []);
  saveCache(KEYS.semesters, all.map((s) => (s.id === id ? { ...s, ...data } : s)));

  if (isFirebaseConfigured()) {
    SemesterService.update(id, data).then((res) => {
      if (!res.success) {
        console.warn("Semester update warning in Firebase:", res.error);
        saveCache(KEYS.semesters, all);
        window.dispatchEvent(new Event("sscr_store_synced"));
      }
    }).catch(() => {
      saveCache(KEYS.semesters, all);
      window.dispatchEvent(new Event("sscr_store_synced"));
    });
  }
}

export function deleteSemester(id: string) {
  const allSems = loadCache<Semester[]>(KEYS.semesters, []);
  const allSubs = loadCache<Subject[]>(KEYS.subjects, []);

  saveCache(KEYS.semesters, allSems.filter((s) => s.id !== id));
  saveCache(KEYS.subjects, allSubs.filter((s) => s.semester_id !== id));

  if (isFirebaseConfigured()) {
    SemesterService.delete(id).then((res) => {
      if (!res.success) {
        console.warn("Semester delete warning in Firebase:", res.error);
        saveCache(KEYS.semesters, allSems);
        saveCache(KEYS.subjects, allSubs);
        window.dispatchEvent(new Event("sscr_store_synced"));
      }
    }).catch(() => {
      saveCache(KEYS.semesters, allSems);
      saveCache(KEYS.subjects, allSubs);
      window.dispatchEvent(new Event("sscr_store_synced"));
    });
  }
}

// ── Subjects ──────────────────────────────────────────────────────────────

export function getSubjects(semesterId: string): Subject[] {
  const curriculum = loadCache<CurriculumItem[]>(KEYS.curriculum, DEFAULT_CURRICULUM);
  return loadCache<Subject[]>(KEYS.subjects, [])
    .filter((s) => s.semester_id === semesterId)
    .map((subject) =>
      applyCurriculumSchedule(
        subject.status === "Graded" && subject.grade <= 0
          ? { ...subject, status: "Currently Taking" }
          : subject,
        curriculum,
      ),
    );
}

export function getAllSubjects(userId: string): Subject[] {
  const semIds = getSemesters(userId).map((s) => s.id);
  const curriculum = loadCache<CurriculumItem[]>(KEYS.curriculum, DEFAULT_CURRICULUM);
  return loadCache<Subject[]>(KEYS.subjects, [])
    .filter((s) => semIds.includes(s.semester_id))
    .map((subject) =>
      applyCurriculumSchedule(
        subject.status === "Graded" && subject.grade <= 0
          ? { ...subject, status: "Currently Taking" }
          : subject,
        curriculum,
      ),
    );
}

export function addSubject(data: Omit<Subject, "id">): Subject {
  const all = loadCache<Subject[]>(KEYS.subjects, []);
  const sub: Subject = { ...data, id: uid() };
  saveCache(KEYS.subjects, [...all, sub]);

  if (isFirebaseConfigured()) {
    SubjectService.add(sub).then((res) => {
      if (!res.success) {
        console.warn("Subject add warning in Firebase:", res.error);
        saveCache(KEYS.subjects, all);
        window.dispatchEvent(new Event("sscr_store_synced"));
      }
    }).catch(() => {
      saveCache(KEYS.subjects, all);
      window.dispatchEvent(new Event("sscr_store_synced"));
    });
  }

  return sub;
}

export function updateSubject(id: string, data: Partial<Subject>) {
  const all = loadCache<Subject[]>(KEYS.subjects, []);
  saveCache(KEYS.subjects, all.map((s) => (s.id === id ? { ...s, ...data } : s)));

  if (isFirebaseConfigured()) {
    SubjectService.update(id, data).then((res) => {
      if (!res.success) {
        console.warn("Subject update warning in Firebase:", res.error);
        saveCache(KEYS.subjects, all);
        window.dispatchEvent(new Event("sscr_store_synced"));
      }
    }).catch(() => {
      saveCache(KEYS.subjects, all);
      window.dispatchEvent(new Event("sscr_store_synced"));
    });
  }
}

export function deleteSubject(id: string) {
  const all = loadCache<Subject[]>(KEYS.subjects, []);
  saveCache(KEYS.subjects, all.filter((s) => s.id !== id));

  if (isFirebaseConfigured()) {
    SubjectService.delete(id).then((res) => {
      if (!res.success) {
        console.warn("Subject delete warning in Firebase:", res.error);
        saveCache(KEYS.subjects, all);
        window.dispatchEvent(new Event("sscr_store_synced"));
      }
    }).catch(() => {
      saveCache(KEYS.subjects, all);
      window.dispatchEvent(new Event("sscr_store_synced"));
    });
  }
}

// ── Calculations & Awards ─────────────────────────────────────────────────

export function hasRecordedFinalGrade(subject: Subject): boolean {
  const isFinal = subject.status === "Graded" || subject.status === undefined;
  return isFinal && Number.isFinite(subject.grade) && subject.grade > 0;
}

export function calculateGA(subjects: Subject[]): number {
  const graded = subjects.filter(hasRecordedFinalGrade);
  if (!graded.length) return 0;
  const totalWeighted = graded.reduce((sum, s) => sum + s.grade * s.units, 0);
  const totalUnits = graded.reduce((sum, s) => sum + s.units, 0);
  return totalUnits ? totalWeighted / totalUnits : 0;
}

export function checkAward(ga: number, subjects: Subject[], settings: AwardSetting[]): AwardResult {
  const graded = subjects.filter(hasRecordedFinalGrade);
  if (!graded.length) return { award: null, reason: "No graded subjects recorded." };

  const sorted = [...settings].sort((a, b) => b.minimum_average - a.minimum_average);
  let bestFailReason = "";

  for (const s of sorted) {
    if (ga < s.minimum_average) continue;
    const minGrade = Math.min(...graded.map((sub) => sub.grade));
    if (minGrade >= s.minimum_subject_grade) {
      return { award: s.award_name, reason: "" };
    }
    const belowMin = graded.filter((sub) => sub.grade < s.minimum_subject_grade);
    if (!bestFailReason) {
      bestFailReason = `${belowMin.length} subject${belowMin.length > 1 ? "s" : ""} below the minimum grade of ${s.minimum_subject_grade} required for ${s.award_name}.`;
    }
  }

  return {
    award: null,
    reason: bestFailReason || (ga > 0 ? "General average does not meet any award threshold." : "No graded subjects recorded."),
  };
}

// ── Curriculum ────────────────────────────────────────────────────────────

export function getCurriculum(filters?: { course?: string; year_level?: string; semester?: string }): CurriculumItem[] {
  let items = loadCache<CurriculumItem[]>(KEYS.curriculum, []);
  if (filters?.course) items = items.filter((i) => i.course === filters.course);
  if (filters?.year_level) {
    items = items.filter((i) => String(i.year_level) === String(filters.year_level));
  }
  if (filters?.semester) items = items.filter((i) => i.semester === filters.semester);
  return items;
}

export function addCurriculumItem(data: Omit<CurriculumItem, "id">): CurriculumItem {
  const all = loadCache<CurriculumItem[]>(KEYS.curriculum, []);
  const item: CurriculumItem = { ...data, id: uid() };
  saveCache(KEYS.curriculum, [...all, item]);

  if (isFirebaseConfigured()) {
    CurriculumService.add(item).catch(() => {
      saveCache(KEYS.curriculum, all);
      window.dispatchEvent(new Event("sscr_store_synced"));
    });
  }

  return item;
}

export async function updateCurriculumItem(
  id: string,
  data: Partial<CurriculumItem>,
): Promise<{ success: boolean; error?: string }> {
  const all = loadCache<CurriculumItem[]>(KEYS.curriculum, []);
  saveCache(KEYS.curriculum, all.map((i) => (i.id === id ? { ...i, ...data } : i)));

  if (isFirebaseConfigured()) {
    const result = await CurriculumService.update(id, data);
    if (!result.success || !result.data) {
      saveCache(KEYS.curriculum, all);
      window.dispatchEvent(new Event("sscr_store_synced"));
      return { success: false, error: result.error || "Unable to update the curriculum schedule." };
    }
    saveCache(
      KEYS.curriculum,
      loadCache<CurriculumItem[]>(KEYS.curriculum, []).map((item) =>
        item.id === id ? result.data! : item,
      ),
    );
  }

  window.dispatchEvent(new Event("sscr_store_synced"));
  return { success: true };
}

export function deleteCurriculumItem(id: string) {
  const all = loadCache<CurriculumItem[]>(KEYS.curriculum, []);
  saveCache(KEYS.curriculum, all.filter((i) => i.id !== id));

  if (isFirebaseConfigured()) {
    CurriculumService.delete(id).catch(() => {
      saveCache(KEYS.curriculum, all);
      window.dispatchEvent(new Event("sscr_store_synced"));
    });
  }
}

// ── Award Settings ────────────────────────────────────────────────────────

export function getAwardSettings(): AwardSetting[] {
  return loadCache<AwardSetting[]>(KEYS.awardSettings, DEFAULT_AWARD_SETTINGS);
}

export function saveAwardSettings(settings: AwardSetting[]) {
  const previous = getAwardSettings();
  saveCache(KEYS.awardSettings, settings);

  if (isFirebaseConfigured()) {
    // Use writeBatch for atomic multi-doc upsert (replaces supabase.upsert)
    const batch = writeBatch(db);
    settings.forEach((setting) => {
      batch.set(doc(db, "award_settings", setting.id), setting, { merge: true });
    });
    void batch.commit().catch(() => {
      saveCache(KEYS.awardSettings, previous);
      window.dispatchEvent(new Event("sscr_store_synced"));
    });
  }
}

// ── Announcements ─────────────────────────────────────────────────────────

export function getAnnouncements(): Announcement[] {
  return loadCache<Announcement[]>(KEYS.announcements, DEFAULT_ANNOUNCEMENTS).sort(
    (a, b) => new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime()
  );
}

export function addAnnouncement(data: Omit<Announcement, "id">): Announcement {
  const all = loadCache<Announcement[]>(KEYS.announcements, []);
  const item: Announcement = { ...data, id: uid() };
  saveCache(KEYS.announcements, [...all, item]);

  if (isFirebaseConfigured()) {
    AnnouncementService.add(item).catch(() => {
      saveCache(KEYS.announcements, all);
      window.dispatchEvent(new Event("sscr_store_synced"));
    });
  }

  return item;
}

export function updateAnnouncement(id: string, data: Partial<Announcement>) {
  const all = loadCache<Announcement[]>(KEYS.announcements, []);
  saveCache(KEYS.announcements, all.map((i) => (i.id === id ? { ...i, ...data } : i)));

  if (isFirebaseConfigured()) {
    AnnouncementService.update(id, data).catch(() => {
      saveCache(KEYS.announcements, all);
      window.dispatchEvent(new Event("sscr_store_synced"));
    });
  }
}

export function deleteAnnouncement(id: string) {
  const all = loadCache<Announcement[]>(KEYS.announcements, []);
  saveCache(KEYS.announcements, all.filter((i) => i.id !== id));

  if (isFirebaseConfigured()) {
    AnnouncementService.delete(id).catch(() => {
      saveCache(KEYS.announcements, all);
      window.dispatchEvent(new Event("sscr_store_synced"));
    });
  }
}

// ── Admin operations ──────────────────────────────────────────────────────

export function getAllUsers(): User[] {
  return loadCache<User[]>(KEYS.users, []);
}

export function verifyUserEmail(email: string): boolean {
  const users = loadCache<User[]>(KEYS.users, []);
  const idx = users.findIndex((u) => u.email.toLowerCase() === email.toLowerCase());
  if (idx !== -1) {
    users[idx].verified = true;
    saveCache(KEYS.users, users);
    ProfileService.update(users[idx].id, { verified: true }).then();
    return true;
  }
  return false;
}

export function deleteUser(id: string) {
  const users = loadCache<User[]>(KEYS.users, []);
  const target = users.find((u) => u.id === id);
  if (target) {
    if (target.profile_photo) StorageService.deleteAvatar(target.profile_photo).catch(console.error);
    if (target.action_photo) StorageService.deleteAvatar(target.action_photo).catch(console.error);
  }

  saveCache(KEYS.users, users.filter((u) => u.id !== id));

  if (isFirebaseConfigured()) {
    ProfileService.delete(id).then((res) => {
      if (!res.success) {
        console.warn("Profile delete warning in Firebase:", res.error);
        // Rollback local cache if Firebase rejected the delete
        saveCache(KEYS.users, users);
      }
      // Always re-sync from DB to confirm the delete
      syncFromFirebase().catch(console.error);
    }).catch(() => {
      saveCache(KEYS.users, users);
      syncFromFirebase().catch(console.error);
    });
  } else {
    window.dispatchEvent(new Event("sscr_store_synced"));
  }
}

export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
  if (!isFirebaseConfigured()) {
    return { success: false, error: "Firebase Auth is not configured." };
  }

  const resetLink = `${window.location.origin}/reset-password`;
  const result = await AuthService.sendPasswordResetEmail(email, resetLink);
  return result.success
    ? { success: true }
    : { success: false, error: result.error || "Unable to send the password reset email." };
}

export function compressImage(file: File, maxWidth = 600, maxHeight = 600, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export async function uploadOfficerImageToStorage(file: File, officerId: string, type: "default" | "hover"): Promise<{ url: string; path?: string }> {
  const res = await StorageService.uploadAvatar(file, officerId, type === "default" ? "profile" : "action");
  if (res.success && res.data) {
    return { url: res.data, path: `avatars/${officerId}/${type === "default" ? "profile" : "action"}.webp` };
  }
  throw new Error(res.error || "Failed to upload officer image");
}

export async function deleteOfficerImageFromStorage(pathOrUrl?: string) {
  if (pathOrUrl) {
    await StorageService.deleteAvatar(pathOrUrl);
  }
}
