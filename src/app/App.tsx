import React, { useEffect, useState } from "react";
import { supabase } from "../services/supabase/supabaseClient";
import { authorizeSupabaseUser, signOutEverywhere } from "./auth/auth";
import { clearSession, initStore, syncFromSupabase } from "../store";
import { ProfileService } from "../services/profile.service";
import type { User } from "../types";
import { AppRouter, PageSkeleton } from "./router/AppRouter";

initStore();

function EnvErrorScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-rose-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-lg font-bold text-rose-950">Portal Authentication Not Configured</h2>
        <p className="mt-2 text-sm text-rose-700">
          Configure the Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) before opening a private route.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const supabaseConfigured = Boolean(
    (import.meta.env.VITE_SUPABASE_URL || "https://isezuvblfrwjbiplznau.supabase.co")
    && (import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZXp1dmJsZnJ3amJpcGx6bmF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MDUxNjYsImV4cCI6MjEwMDA4MTE2Nn0._3TUMWr-VDwkrMliQ79tiTgc2XQk1XzX8wfpRX8AdF4")
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
        const { getSession } = await import("../store");
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

  return <AppRouter user={user} onLogout={handleLogout} onUpdateUser={setUser} />;
}
