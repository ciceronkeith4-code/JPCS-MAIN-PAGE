import React, { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { authorizeSupabaseUser, signOutEverywhere } from "./auth/auth";
import { clearSession, initStore, syncFromSupabase } from "./store";
import { ProfileService } from "./services/profile.service";
import type { User } from "./types";
import { ErrorBoundary } from "./components/ErrorBoundary";

const AppLayout = lazy(() => import("./pages/layout").then((module) => ({ default: module.AppLayout })));
import { LoginPage, ChangePasswordPage } from "./pages/auth";
const PublicSiteLayout = lazy(() => import("./public-site/components").then((module) => ({ default: module.PublicSiteLayout })));
const HomePage = lazy(() => import("./public-site/pages").then((module) => ({ default: module.HomePage })));
const ProgramsSitePage = lazy(() => import("./public-site/pages").then((module) => ({ default: module.ProgramsPage })));
const CommunitySitePage = lazy(() => import("./public-site/pages").then((module) => ({ default: module.CommunityPage })));
const AboutSitePage = lazy(() => import("./public-site/pages").then((module) => ({ default: module.AboutPage })));
const TestimonialsSitePage = lazy(() => import("./public-site/pages").then((module) => ({ default: module.TestimonialsPage })));
const DashboardPage = lazy(() => import("./pages/dashboard").then((module) => ({ default: module.DashboardPage })));
const SemestersPage = lazy(() => import("./pages/semesters").then((module) => ({ default: module.SemestersPage })));
const SubjectsPage = lazy(() => import("./pages/semesters").then((module) => ({ default: module.SubjectsPage })));
const SimulatorPage = lazy(() => import("./pages/simulator").then((module) => ({ default: module.SimulatorPage })));
const StatisticsPage = lazy(() => import("./pages/statistics").then((module) => ({ default: module.StatisticsPage })));
const ProfilePage = lazy(() => import("./pages/profile").then((module) => ({ default: module.ProfilePage })));
const AdminDashboardPage = lazy(() => import("./pages/admin").then((module) => ({ default: module.AdminDashboardPage })));
const StudentManagementPage = lazy(() => import("./pages/admin").then((module) => ({ default: module.StudentManagementPage })));
const CurriculumPage = lazy(() => import("./pages/admin").then((module) => ({ default: module.CurriculumPage })));
const AwardSettingsPage = lazy(() => import("./pages/admin").then((module) => ({ default: module.AwardSettingsPage })));
const AnnouncementsPage = lazy(() => import("./pages/admin").then((module) => ({ default: module.AnnouncementsPage })));
const AccountRequestsPage = lazy(() => import("./pages/admin").then((module) => ({ default: module.AccountRequestsPage })));

initStore();

function PageSkeleton() {
  return <div className="min-h-screen animate-pulse bg-slate-50 p-6"><div className="h-10 w-1/4 rounded-lg bg-slate-200" /><div className="mt-6 h-64 rounded-xl bg-slate-200" /></div>;
}

function EnvErrorScreen() {
  return <div className="flex min-h-screen items-center justify-center bg-rose-50 p-6"><div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm"><h2 className="text-lg font-bold text-rose-950">Portal Authentication Not Configured</h2><p className="mt-2 text-sm text-rose-700">Configure the Firebase web variables in <code>.env.local</code> before opening a private route.</p></div></div>;
}

function RequireAuth({ user, children }: { user: User | null; children: React.ReactNode }) {
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }
  return <>{children}</>;
}

function RequireAdmin({ user, children }: { user: User | null; children: React.ReactNode }) {
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  return user.role === "admin" ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

function RequireGuest({ user, children }: { user: User | null; children: React.ReactNode }) {
  if (!user) return <>{children}</>;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const supabaseConfigured = Boolean(
    import.meta.env.VITE_SUPABASE_URL
    && import.meta.env.VITE_SUPABASE_ANON_KEY
    && import.meta.env.VITE_SUPABASE_URL !== "https://your-supabase-project.supabase.co",
  );
  const isPublicRoute = ["/", "/programs", "/community", "/about", "/testimonials", "/login"].includes(window.location.pathname);

  useEffect(() => {
    if (!supabaseConfigured) {
      clearSession();
      setAuthLoading(false);
      return;
    }

    let active = true;
    let isFirstLoad = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && session?.user) {
        authorizeSupabaseUser(session.user).then((authorizedUser) => {
          if (active) {
            setUser(authorizedUser);
            if (authorizedUser) syncFromSupabase().catch(() => undefined);
            setAuthLoading(false);
            isFirstLoad = false;
          }
        });
      } else {
        setAuthLoading(false);
        isFirstLoad = false;
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isFirstLoad) {
        setAuthLoading(true);
      }
      let authorizedUser = await authorizeSupabaseUser(session?.user || null);
      if (!authorizedUser) {
        const { getSession } = await import("./store");
        const cached = getSession();
        if (cached && cached.role === "admin" && cached.email === "admin@sscrmnl.edu.ph") {
          authorizedUser = cached;
        }
      }
      if (!active) return;
      setUser(authorizedUser);
      if (authorizedUser) await syncFromSupabase().catch(() => undefined);
      isFirstLoad = false;
      setAuthLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabaseConfigured]);

  useEffect(() => {
    if (!user?.id) return;
    return ProfileService.subscribeToCurrent(user.id, (updatedProfile) => setUser(updatedProfile));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => { void signOutEverywhere().finally(() => setUser(null)); }, 15 * 60 * 1000);
    };
    ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(timeoutId);
      ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [user]);

  const handleLogout = async () => {
    await signOutEverywhere();
    setUser(null);
  };

  if (!supabaseConfigured && !isPublicRoute) return <EnvErrorScreen />;
  if (authLoading && !isPublicRoute) return <PageSkeleton />;

  return <ErrorBoundary><BrowserRouter><Suspense fallback={<PageSkeleton />}><Routes>
    <Route element={<PublicSiteLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/programs" element={<ProgramsSitePage />} />
      <Route path="/community" element={<CommunitySitePage />} />
      <Route path="/about" element={<AboutSitePage />} />
      <Route path="/testimonials" element={<TestimonialsSitePage />} />
    </Route>
    <Route path="/login" element={<RequireGuest user={user}><LoginPage /></RequireGuest>} />
    <Route path="/change-password" element={user ? <ChangePasswordPage /> : <Navigate to="/login" replace />} />
    <Route element={<RequireAuth user={user}><AppLayout user={user!} onLogout={handleLogout} /></RequireAuth>}>
      <Route path="/dashboard" element={<DashboardPage user={user!} />} />
      <Route path="/semesters" element={<SemestersPage user={user!} />} />
      <Route path="/semesters/:semesterId" element={<SubjectsPage user={user!} />} />
      <Route path="/simulator" element={<SimulatorPage user={user!} />} />
      <Route path="/statistics" element={<StatisticsPage user={user!} />} />
      <Route path="/profile" element={<ProfilePage user={user!} onUpdate={setUser} />} />
      <Route path="/members" element={<Navigate to="/dashboard" replace />} />
      <Route path="/events" element={<Navigate to="/dashboard" replace />} />
    </Route>
    <Route element={<RequireAdmin user={user}><AppLayout user={user!} onLogout={handleLogout} isAdmin /></RequireAdmin>}>
      <Route path="/admin" element={<AdminDashboardPage />} />
      <Route path="/admin/account-requests" element={<AccountRequestsPage />} />
      <Route path="/admin/students" element={<StudentManagementPage />} />
      <Route path="/admin/curriculum" element={<CurriculumPage />} />
      <Route path="/admin/awards" element={<AwardSettingsPage />} />
      <Route path="/admin/announcements" element={<AnnouncementsPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense></BrowserRouter></ErrorBoundary>;
}
