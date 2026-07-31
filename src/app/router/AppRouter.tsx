import React, { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { User } from "../../types";
import { ROUTES } from "../../constants/routes.constants";
import { ErrorBoundary } from "../components/ErrorBoundary";

const AppLayout = lazy(() => import("../pages/layout").then((module) => ({ default: module.AppLayout })));
const LoginPage = lazy(() => import("../../pages/auth/LoginPage").then((module) => ({ default: module.LoginPage })));
const ChangePasswordPage = lazy(() => import("../../pages/auth/ChangePasswordPage").then((module) => ({ default: module.ChangePasswordPage })));
const PublicSiteLayout = lazy(() => import("../public-site/components").then((module) => ({ default: module.PublicSiteLayout })));
const HomePage = lazy(() => import("../public-site/pages").then((module) => ({ default: module.HomePage })));
const ProgramsSitePage = lazy(() => import("../public-site/pages").then((module) => ({ default: module.ProgramsPage })));
const CommunitySitePage = lazy(() => import("../public-site/pages").then((module) => ({ default: module.CommunityPage })));
const AboutSitePage = lazy(() => import("../public-site/pages").then((module) => ({ default: module.AboutPage })));
const TestimonialsSitePage = lazy(() => import("../public-site/pages").then((module) => ({ default: module.TestimonialsPage })));
const DashboardPage = lazy(() => import("../pages/dashboard").then((module) => ({ default: module.DashboardPage })));
const SemestersPage = lazy(() => import("../pages/semesters").then((module) => ({ default: module.SemestersPage })));
const SubjectsPage = lazy(() => import("../pages/semesters").then((module) => ({ default: module.SubjectsPage })));
const SimulatorPage = lazy(() => import("../pages/simulator").then((module) => ({ default: module.SimulatorPage })));
const StatisticsPage = lazy(() => import("../pages/statistics").then((module) => ({ default: module.StatisticsPage })));
const ProfilePage = lazy(() => import("../pages/profile").then((module) => ({ default: module.ProfilePage })));
const AdminDashboardPage = lazy(() => import("../../pages/admin/AdminDashboardPage").then((module) => ({ default: module.AdminDashboardPage })));
const StudentManagementPage = lazy(() => import("../../pages/admin/StudentManagementPage").then((module) => ({ default: module.StudentManagementPage })));
const CurriculumPage = lazy(() => import("../../pages/admin/CurriculumPage").then((module) => ({ default: module.CurriculumPage })));
const AwardSettingsPage = lazy(() => import("../../pages/admin/AwardSettingsPage").then((module) => ({ default: module.AwardSettingsPage })));
const AnnouncementsPage = lazy(() => import("../../pages/admin/AnnouncementsPage").then((module) => ({ default: module.AnnouncementsPage })));
const AccountRequestsPage = lazy(() => import("../../pages/admin/AccountRequestsPage").then((module) => ({ default: module.AccountRequestsPage })));
const OfficersPage = lazy(() => import("../pages/officers").then((module) => ({ default: module.OfficersPage })));

export function PageSkeleton() {
  return (
    <div className="min-h-screen animate-pulse bg-slate-50 p-6">
      <div className="h-10 w-1/4 rounded-lg bg-slate-200" />
      <div className="mt-6 h-64 rounded-xl bg-slate-200" />
    </div>
  );
}

function RequireAuth({ user, children }: { user: User | null; children: React.ReactNode }) {
  const location = useLocation();
  if (!user) return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  if (user.mustChangePassword && location.pathname !== ROUTES.CHANGE_PASSWORD) {
    return <Navigate to={ROUTES.CHANGE_PASSWORD} replace />;
  }
  return <>{children}</>;
}

function RequireAdmin({ user, children }: { user: User | null; children: React.ReactNode }) {
  if (!user) return <Navigate to={ROUTES.LOGIN} replace />;
  if (user.mustChangePassword) return <Navigate to={ROUTES.CHANGE_PASSWORD} replace />;
  return user.role === "admin" ? <>{children}</> : <Navigate to={ROUTES.DASHBOARD} replace />;
}

function RequireGuest({ user, children }: { user: User | null; children: React.ReactNode }) {
  if (!user) return <>{children}</>;
  if (user.mustChangePassword) return <Navigate to={ROUTES.CHANGE_PASSWORD} replace />;
  return <Navigate to={user.role === "admin" ? ROUTES.ADMIN.DASHBOARD : ROUTES.DASHBOARD} replace />;
}

interface AppRouterProps {
  user: User | null;
  onLogout: () => Promise<void>;
  onUpdateUser: (user: User) => void;
}

export function AppRouter({ user, onLogout, onUpdateUser }: AppRouterProps) {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route element={<PublicSiteLayout />}>
              <Route path={ROUTES.HOME} element={<HomePage />} />
              <Route path={ROUTES.PROGRAMS} element={<ProgramsSitePage />} />
              <Route path={ROUTES.COMMUNITY} element={<CommunitySitePage />} />
              <Route path={ROUTES.ABOUT} element={<AboutSitePage />} />
              <Route path={ROUTES.TESTIMONIALS} element={<TestimonialsSitePage />} />
            </Route>

            <Route path={ROUTES.LOGIN} element={<RequireGuest user={user}><LoginPage /></RequireGuest>} />
            <Route path={ROUTES.CHANGE_PASSWORD} element={user ? <ChangePasswordPage /> : <Navigate to={ROUTES.LOGIN} replace />} />

            <Route element={<RequireAuth user={user}><AppLayout user={user!} onLogout={onLogout} /></RequireAuth>}>
              <Route path={ROUTES.DASHBOARD} element={<DashboardPage user={user!} />} />
              <Route path={ROUTES.SEMESTERS} element={<SemestersPage user={user!} />} />
              <Route path={`${ROUTES.SEMESTERS}/:semesterId`} element={<SubjectsPage user={user!} />} />
              <Route path={ROUTES.SIMULATOR} element={<SimulatorPage user={user!} />} />
              <Route path={ROUTES.STATISTICS} element={<StatisticsPage user={user!} />} />
              <Route path={ROUTES.PROFILE} element={<ProfilePage user={user!} onUpdate={onUpdateUser} />} />
              <Route path="/officers" element={<OfficersPage user={user!} />} />
              <Route path="/members" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
              <Route path="/events" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
            </Route>

            <Route element={<RequireAdmin user={user}><AppLayout user={user!} onLogout={onLogout} isAdmin /></RequireAdmin>}>
              <Route path={ROUTES.ADMIN.DASHBOARD} element={<AdminDashboardPage />} />
              <Route path={ROUTES.ADMIN.ACCOUNT_REQUESTS} element={<AccountRequestsPage />} />
              <Route path={ROUTES.ADMIN.STUDENTS} element={<StudentManagementPage />} />
              <Route path="/admin/officers" element={<OfficersPage user={user!} />} />
              <Route path={ROUTES.ADMIN.CURRICULUM} element={<CurriculumPage />} />
              <Route path={ROUTES.ADMIN.AWARDS} element={<AwardSettingsPage />} />
              <Route path={ROUTES.ADMIN.ANNOUNCEMENTS} element={<AnnouncementsPage />} />
            </Route>

            <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
