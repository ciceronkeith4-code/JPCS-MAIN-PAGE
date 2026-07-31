import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import { cn } from "../components/ui";
import { getAnnouncements } from "../store";
import type { User } from "../../types";

const STUDENT_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { to: "/semesters", label: "Semesters", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { to: "/simulator", label: "Grade Simulator", icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
  { to: "/statistics", label: "Statistics", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" },
  { to: "/profile", label: "Profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
];

const ADMIN_NAV = [
  { to: "/admin", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { to: "/admin/account-requests", label: "Account Requests", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { to: "/admin/students", label: "Students", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  { to: "/admin/curriculum", label: "Curriculum", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { to: "/admin/awards", label: "Award Criteria", icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" },
  { to: "/admin/announcements", label: "Announcements", icon: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" },
];

function NotificationDropdown({ user, isAdmin }: { user: User; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const announcements = getAnnouncements().slice(0, 5);
  const unreadCount = announcements.length;

  return (
    <div className="relative">
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}

      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 border border-transparent transition-colors"
        title="Notifications"
      >
        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 size-2 rounded-full bg-red-600 ring-2 ring-white" />
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 z-50 w-[min(20rem,calc(100vw-2rem))] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <span>🔔 Notifications</span>
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
            {announcements.length === 0 ? (
              <div className="p-4 text-center text-slate-400">No recent announcements.</div>
            ) : (
              announcements.map((a) => (
                <div key={a.id} className="p-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-slate-800 truncate">{a.title}</p>
                    <span className="text-[10px] text-slate-400 shrink-0">{a.publish_date}</span>
                  </div>
                  <p className="text-slate-500 line-clamp-2 text-[11px]">{a.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface UserDropdownProps {
  user: User;
  isAdmin?: boolean;
  onLogout: () => Promise<void>;
  logoutLoading: boolean;
  initials: string;
}

function UserDropdown({ user, isAdmin, onLogout, logoutLoading, initials }: UserDropdownProps) {
  const [open, setOpen] = useState(false);
  const isOfficer = Boolean(user.officer_position && user.officer_position !== "None" && user.officer_position !== "");

  return (
    <div className="relative">
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 border border-transparent transition-colors"
      >
        <div className="size-8 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0 overflow-hidden">
          {user.profile_photo ? (
            <img
              src={user.profile_photo}
              alt={user.full_name}
              className="block size-full min-w-full object-cover object-center"
            />
          ) : (
            <span className="text-xs font-bold text-slate-600">{initials}</span>
          )}
        </div>
        <div className="hidden sm:flex flex-col items-start text-left max-w-[190px]">
          <span className="truncate text-xs font-bold text-slate-900 leading-tight" title={user.full_name}>
            {user.full_name}
          </span>
          <span className={cn(
            "text-[10px] font-extrabold truncate leading-none mt-0.5 px-1.5 py-0.5 rounded border",
            isOfficer
              ? "bg-amber-50 text-amber-900 border-amber-200/80"
              : user.role === "admin"
              ? "bg-purple-50 text-purple-900 border-purple-200/80"
              : "bg-slate-100 text-slate-600 border-slate-200/80"
          )}>
            {isOfficer ? `Officer: ${user.officer_position}` : user.role === "admin" ? "Admin" : "Student"}
          </span>
        </div>
        <svg
          className={cn("size-3.5 text-slate-400 shrink-0 transition-transform duration-150 hidden sm:block", open && "rotate-180")}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 z-50 w-60 bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <p className="text-sm font-semibold text-slate-800">{user.full_name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email ?? user.student_number}</p>
            <div className="mt-2">
              <span className={cn(
                "inline-block text-[10px] font-extrabold px-2 py-0.5 rounded border",
                isOfficer
                  ? "bg-amber-100 text-amber-900 border-amber-300"
                  : user.role === "admin"
                  ? "bg-purple-100 text-purple-900 border-purple-300"
                  : "bg-slate-100 text-slate-700 border-slate-200"
              )}>
                {isOfficer ? `👑 JPCS Officer: ${user.officer_position}` : user.role === "admin" ? "⚡ Admin Staff" : "🎓 Student"}
              </span>
            </div>
          </div>
          <div className="py-1">
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100"
            >
              <svg className="size-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile Settings
            </Link>
            <button
              onClick={() => void onLogout()}
              disabled={logoutLoading}
              aria-busy={logoutLoading}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {logoutLoading ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface AppLayoutProps {
  user: User;
  onLogout: () => Promise<void>;
  isAdmin?: boolean;
}

export function AppLayout({ user, onLogout, isAdmin }: AppLayoutProps) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const isActualAdmin = isAdmin ?? (user.role === "admin");
  const nav = isActualAdmin ? ADMIN_NAV : STUDENT_NAV;
  const isOfficer = Boolean(user.officer_position && user.officer_position !== "None" && user.officer_position !== "");

  const handleLogout = async () => {
    if (logoutLoading) return;
    setLogoutError("");
    setLogoutLoading(true);
    try {
      await onLogout();
      navigate("/login", { replace: true });
    } catch {
      setLogoutError("Sign-out could not be confirmed. Your local portal session has still been cleared.");
    } finally {
      setLogoutLoading(false);
    }
  };

  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date: Date) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const dayNum = date.getDate();
    let suffix = "th";
    if (dayNum === 1 || dayNum === 21 || dayNum === 31) suffix = "st";
    else if (dayNum === 2 || dayNum === 22) suffix = "nd";
    else if (dayNum === 3 || dayNum === 23) suffix = "rd";
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${dayName} ${monthName} ${dayNum}${suffix}, ${year} ${hours}:${minutes} ${ampm}`;
  };

  const fullName = user?.full_name || "User";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "U";

  return (
    <div className="flex min-h-screen bg-[#faf9f6] text-slate-800">
      {/* ── Desktop Left Sidebar ───────────────────────────────────── */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col shrink-0 sticky top-0 h-screen justify-between z-30">
        <div>
          <div className="h-16 flex items-center px-6 border-b border-slate-200 gap-2.5">
            <div className="flex gap-1.5 shrink-0">
              <img src="/sscr-logo.png" alt="SSCR logo" className="size-8 object-contain bg-white rounded-full" />
              <img src="/jpcs-logo.png" alt="JPCS logo" className="size-8 object-contain bg-white rounded-full" />
            </div>
            <div>
              <h1 className="text-[10px] font-bold text-slate-900 tracking-tight leading-none">IT DEPARTMENT OF SSCR MANILA</h1>
              <p className="text-[9px] text-slate-500 mt-0.5 font-medium">JPCS | SSCR MANILA CHAPTER Portal</p>
            </div>
          </div>

          <nav className="p-4 space-y-1.5">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/admin"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-white shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  )
                }
              >
                <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} />
                </svg>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-primary/10 text-primary font-extrabold text-sm flex items-center justify-center shrink-0 border border-primary/20 overflow-hidden">
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
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-extrabold text-slate-900 truncate leading-tight">{user.full_name}</p>
                  {user.verified && (
                    <span className="text-[10px] text-green-600 shrink-0 font-extrabold" title="Verified Account">✓</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">{user.email}</p>
              </div>
            </div>

            {/* Role & Officer Position display */}
            <div className="text-[11px] text-slate-600 border-t border-slate-100 pt-2 space-y-1">
              {user.role === "admin" ? (
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Department:</span>
                  <span className="font-semibold text-slate-800">{user.department || "Admin Staff"}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Course:</span>
                    <span className="font-semibold text-slate-800">{user.course || "BSIT"}</span>
                  </div>
                  {user.year_level && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Year Level:</span>
                      <span className="font-semibold text-slate-800">{user.year_level === "Irregular" ? "Irregular" : `${user.year_level}th Year`}</span>
                    </div>
                  )}
                </>
              )}

              {/* Prominent Officer / Student Role Badge */}
              <div className={cn(
                "flex justify-between items-center rounded px-2 py-1 mt-1 border",
                isOfficer
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : user.role === "admin"
                  ? "bg-purple-50 border-purple-200 text-purple-900"
                  : "bg-slate-100 border-slate-200 text-slate-700"
              )}>
                <span className="text-[10px] font-bold">Role / Position:</span>
                <span className="text-[10px] font-black truncate max-w-[110px]">
                  {isOfficer ? `Officer: ${user.officer_position}` : user.role === "admin" ? "Admin Staff" : "Student"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Workspace Area ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="h-16 bg-white border-b border-slate-200 px-5 lg:px-8 flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-slate-800">San Sebastian College Recoletos – Manila</p>
              <p className="text-[11px] text-slate-500">{formatDateTime(time)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationDropdown user={user} isAdmin={isActualAdmin} />
            <UserDropdown user={user} isAdmin={isActualAdmin} onLogout={handleLogout} logoutLoading={logoutLoading} initials={initials} />
          </div>
        </header>

        {logoutError && (
          <div role="alert" className="border-b border-rose-200 bg-rose-50 px-5 py-2 text-center text-xs font-semibold text-rose-700">
            {logoutError}
          </div>
        )}

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/20" onClick={() => setMobileMenuOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl flex flex-col justify-between">
              <div>
                <div className="h-16 flex items-center px-5 border-b border-slate-200 shrink-0 gap-2.5">
                  <div className="flex gap-1.5 shrink-0">
                    <img src="/sscr-logo.png" alt="SSCR logo" className="size-8 object-contain bg-white rounded-full" />
                    <img src="/jpcs-logo.png" alt="JPCS logo" className="size-8 object-contain bg-white rounded-full" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 text-[10px] leading-tight">IT DEPARTMENT OF SSCR MANILA</span>
                    <span className="text-[9px] text-slate-500 font-medium">JPCS | SSCR MANILA CHAPTER Portal</span>
                  </div>
                </div>
                <nav className="p-4 space-y-1">
                  {nav.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/admin"}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary text-white font-semibold"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        )
                      }
                    >
                      <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} />
                      </svg>
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </nav>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50/50">
                <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs mb-2">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-primary/10 text-primary font-extrabold text-sm flex items-center justify-center shrink-0 border border-primary/20 overflow-hidden">
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
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-extrabold text-slate-900 truncate leading-tight">{user.full_name}</p>
                        {user.verified && (
                          <span className="text-[10px] text-green-600 shrink-0 font-extrabold" title="Verified Account">✓</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">{user.email}</p>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 border-t border-slate-100 pt-2 space-y-1">
                    {user.role === "admin" ? (
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Department:</span>
                        <span className="font-semibold text-slate-800">{user.department || "Admin Staff"}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">Course:</span>
                          <span className="font-semibold text-slate-800">{user.course || "BSIT"}</span>
                        </div>
                        {user.year_level && (
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-medium">Year Level:</span>
                            <span className="font-semibold text-slate-800">{user.year_level === "Irregular" ? "Irregular" : `${user.year_level}th Year`}</span>
                          </div>
                        )}
                      </>
                    )}
                    <div className={cn(
                      "flex justify-between items-center rounded px-2 py-1 mt-1 border",
                      isOfficer
                        ? "bg-amber-50 border-amber-200 text-amber-900"
                        : user.role === "admin"
                        ? "bg-purple-50 border-purple-200 text-purple-900"
                        : "bg-slate-100 border-slate-200 text-slate-700"
                    )}>
                      <span className="text-[10px] font-bold">Role / Position:</span>
                      <span className="text-[10px] font-black truncate max-w-[110px]">
                        {isOfficer ? `Officer: ${user.officer_position}` : user.role === "admin" ? "Admin Staff" : "Student"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-5 lg:px-8 py-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
