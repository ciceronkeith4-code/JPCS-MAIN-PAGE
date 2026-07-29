import React, { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { initStore, getSession, logout, refreshSessionFromFirebase } from "./store";
import { auth } from "../firebase/config";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ProfileService } from "./services/profile.service";

import type { User } from "./types";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Lazy Loaded Pages
const AppLayout = lazy(() => import("./pages/layout").then(module => ({ default: module.AppLayout })));
const LoginPage = lazy(() => import("./pages/auth").then(module => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import("./pages/auth").then(module => ({ default: module.RegisterPage })));
const ForgotPasswordPage = lazy(() => import("./pages/auth").then(module => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("./pages/auth").then(module => ({ default: module.ResetPasswordPage })));
const PublicSiteLayout = lazy(() => import("./public-site/components").then(module => ({ default: module.PublicSiteLayout })));
const HomePage = lazy(() => import("./public-site/pages").then(module => ({ default: module.HomePage })));
const ProgramsSitePage = lazy(() => import("./public-site/pages").then(module => ({ default: module.ProgramsPage })));
const CommunitySitePage = lazy(() => import("./public-site/pages").then(module => ({ default: module.CommunityPage })));
const AboutSitePage = lazy(() => import("./public-site/pages").then(module => ({ default: module.AboutPage })));
const TestimonialsSitePage = lazy(() => import("./public-site/pages").then(module => ({ default: module.TestimonialsPage })));

const DashboardPage = lazy(() => import("./pages/dashboard").then(module => ({ default: module.DashboardPage })));
const SemestersPage = lazy(() => import("./pages/semesters").then(module => ({ default: module.SemestersPage })));
const SubjectsPage = lazy(() => import("./pages/semesters").then(module => ({ default: module.SubjectsPage })));
const SimulatorPage = lazy(() => import("./pages/simulator").then(module => ({ default: module.SimulatorPage })));
const StatisticsPage = lazy(() => import("./pages/statistics").then(module => ({ default: module.StatisticsPage })));
const ProfilePage = lazy(() => import("./pages/profile").then(module => ({ default: module.ProfilePage })));

const AdminDashboardPage = lazy(() => import("./pages/admin").then(module => ({ default: module.AdminDashboardPage })));
const StudentManagementPage = lazy(() => import("./pages/admin").then(module => ({ default: module.StudentManagementPage })));
const CurriculumPage = lazy(() => import("./pages/admin").then(module => ({ default: module.CurriculumPage })));
const AwardSettingsPage = lazy(() => import("./pages/admin").then(module => ({ default: module.AwardSettingsPage })));
const AnnouncementsPage = lazy(() => import("./pages/admin").then(module => ({ default: module.AnnouncementsPage })));

// ── Boot ──────────────────────────────────────────────────────────────────
initStore();

// ── Loading Skeleton / Fallback ───────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col gap-6 animate-pulse">
      <div className="h-10 bg-slate-200 rounded-lg w-1/4" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="h-32 bg-slate-200 rounded-xl" />
        <div className="h-32 bg-slate-200 rounded-xl" />
        <div className="h-32 bg-slate-200 rounded-xl" />
        <div className="h-32 bg-slate-200 rounded-xl" />
      </div>
      <div className="h-64 bg-slate-200 rounded-xl" />
    </div>
  );
}

// ── Environment Guard Fallback ────────────────────────────────────────────
function EnvErrorScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-rose-50 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 p-8 shadow-sm text-center">
        <span className="text-3xl">🔑</span>
        <h2 className="text-lg font-bold text-rose-950 mt-4">Database Keys Missing</h2>
        <p className="text-sm text-rose-700 mt-2 mb-6">
          The Firebase connection settings (<code>VITE_FIREBASE_API_KEY</code> and <code>VITE_FIREBASE_PROJECT_ID</code>) are not configured or are set to default placeholders. Please check your deployment settings.
        </p>
      </div>
    </div>
  );
}

// ── Route Guards ──────────────────────────────────────────────────────────
function RequireAuth({ user, children }: { user: User | null; children: React.ReactNode }) {
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

function RequireAdmin({ user, children }: { user: User | null; children: React.ReactNode }) {
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function RequireGuest({ user, children }: { user: User | null; children: React.ReactNode }) {
  if (user) return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
  return <>{children}</>;
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => getSession());
  const [envValid, setEnvValid] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const isPublicSite = ["/", "/programs", "/community", "/about", "/testimonials"].includes(window.location.pathname);

  console.log("App component render. User:", user, "envValid:", envValid);


  useEffect(() => {
    // Validate Firebase environment variables on startup
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    const valid = !!(apiKey && projectId && apiKey !== "placeholder-api-key");
    setEnvValid(valid);

    document.documentElement.classList.remove("dark");
    localStorage.removeItem("sscr_dark");

    const handleSync = () => {
      setUser(getSession());
    };
    window.addEventListener("sscr_store_synced", handleSync);

    // Auto-logout after 15 minutes of inactivity
    let timeoutId: ReturnType<typeof setTimeout>;
    const INACTIVITY_LIMIT_MS = 15 * 60 * 1000;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      if (user) {
        timeoutId = setTimeout(() => {
          logout();
          setUser(null);
        }, INACTIVITY_LIMIT_MS);
      }
    };

    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    activityEvents.forEach((event) => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("sscr_store_synced", handleSync);
      activityEvents.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [user]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    const configured = !!(apiKey && projectId && apiKey !== "placeholder-api-key");
    if (!configured) {
      setAuthLoading(false);
      return;
    }

    let active = true;
    const loadProfile = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          await currentUser.reload();
          if (!currentUser.emailVerified) {
            console.warn("Unverified user blocked in global auth guard:", currentUser.uid);
            await signOut(auth);
            localStorage.removeItem("sscr_session");
            if (active) {
              setUser(null);
              setAuthLoading(false);
            }
            return;
          }
        } catch (reloadErr) {
          console.error("Error reloading user in global auth guard:", reloadErr);
        }
      }

      const profile = await refreshSessionFromFirebase();
      if (active) {
        setUser(profile);
        setAuthLoading(false);
      }
    };

    void loadProfile();
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (import.meta.env.DEV) console.debug("App auth state changed", { userId: firebaseUser?.uid });
      if (!firebaseUser) {
        if (active) setUser(null);
        return;
      }
      void loadProfile();
    });

    return () => {
      active = false;
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = ProfileService.subscribeToCurrent(user.id, (updatedProfile) => {
      setUser(updatedProfile);
    });
    return () => {
      unsubscribe();
    };
  }, [user?.id]);

  if (!envValid && !isPublicSite) {
    return <EnvErrorScreen />;
  }

  if (authLoading && !isPublicSite) {
    return <PageSkeleton />;
  }

  const handleAuth = (u: User) => setUser(u);
  const handleLogout = () => {
    logout();
    setUser(null);
  };
  const handleUpdate = (u: User) => setUser(u);

  return (
    <ErrorBoundary>

      <BrowserRouter>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            {/* Public chapter site — intentionally independent of authentication */}
            <Route element={<PublicSiteLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/programs" element={<ProgramsSitePage />} />
              <Route path="/community" element={<CommunitySitePage />} />
              <Route path="/about" element={<AboutSitePage />} />
              <Route path="/testimonials" element={<TestimonialsSitePage />} />
              <Route
                path="/login"
                element={
                  <RequireGuest user={user}>
                    <LoginPage onAuth={handleAuth} />
                  </RequireGuest>
                }
              />
              <Route
                path="/register"
                element={
                  <RequireGuest user={user}>
                    <RegisterPage onAuth={handleAuth} />
                  </RequireGuest>
                }
              />
            </Route>

            {/* Auth routes */}
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Student routes */}
            <Route
              element={
                <RequireAuth user={user}>
                  <AppLayout user={user!} onLogout={handleLogout} />
                </RequireAuth>
              }
            >
              <Route path="/dashboard" element={<DashboardPage user={user!} />} />
              <Route path="/semesters" element={<SemestersPage user={user!} />} />
              <Route path="/semesters/:semesterId" element={<SubjectsPage user={user!} />} />
              <Route path="/simulator" element={<SimulatorPage user={user!} />} />
              <Route path="/statistics" element={<StatisticsPage user={user!} />} />
              <Route path="/profile" element={<ProfilePage user={user!} onUpdate={handleUpdate} />} />
            </Route>

            {/* Admin routes */}
            <Route
              element={
                <RequireAdmin user={user}>
                  <AppLayout user={user!} onLogout={handleLogout} isAdmin />
                </RequireAdmin>
              }
            >
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/students" element={<StudentManagementPage />} />
              <Route path="/admin/curriculum" element={<CurriculumPage />} />
              <Route path="/admin/awards" element={<AwardSettingsPage />} />
              <Route path="/admin/announcements" element={<AnnouncementsPage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
