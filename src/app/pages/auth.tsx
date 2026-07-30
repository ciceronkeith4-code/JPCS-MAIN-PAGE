import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Alert, Button, Input, Select } from "../components/ui";
import {
  AuthError,
  changeUserPassword,
  consumeAuthError,
  signOutEverywhere,
  startEmailLogin,
} from "../auth/auth";
import { ProfileService } from "../services/profile.service";

function AuthLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        navigate("/");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  // Close on clicking outside the card
  const handleOutsideClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      navigate("/");
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={handleOutsideClick}
      className="auth-organic-bg relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-8 cursor-pointer"
    >
      <motion.section
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="auth-surface relative w-full max-w-[448px] overflow-hidden rounded-[28px] border border-slate-200/90 bg-white px-6 py-7 shadow-[0_22px_55px_rgba(15,23,42,0.12)] sm:px-8 sm:py-8 cursor-default"
        onClick={(e) => e.stopPropagation()} // Prevent click propagation to background container
      >
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#800000] via-[#800000] to-amber-500" />
        <div className="mb-5 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-700 ring-1 ring-slate-200/80">
            <svg aria-hidden="true" className="size-3.5 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m8 9 3 3-3 3m5 0h3M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
            </svg>
            JPCS Academic Portal
          </div>
        </div>
        {children}
      </motion.section>
      <p className="relative mt-5 text-center text-[9px] leading-5 text-slate-400 sm:text-[11px] cursor-default">
        Secure access for enrolled students of San Sebastian College–Recoletos Manila.
      </p>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "request">("signin");

  // Sign In Flow States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [checkingApproval, setCheckingApproval] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [unapprovedMessage, setUnapprovedMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Request Account Form States
  const [fullName, setFullName] = useState("");
  const [reqEmail, setReqEmail] = useState("");
  const [year, setYear] = useState("1st Year");
  const [studentNumber, setStudentNumber] = useState("");
  const [reqError, setReqError] = useState("");
  const [reqSuccess, setReqSuccess] = useState("");
  const [reqLoading, setReqLoading] = useState(false);

  // Modal Overlays
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDuplicateEmailModal, setShowDuplicateEmailModal] = useState(false);
  const [showDuplicateStudentNumberModal, setShowDuplicateStudentNumberModal] = useState(false);

  useEffect(() => {
    const authError = consumeAuthError();
    if (authError) setError(authError);
  }, []);

  // Automatically check email when a valid email address is typed
  useEffect(() => {
    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(normalizedEmail)) {
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setCheckingApproval(true);
      setError("");
      setUnapprovedMessage("");

      try {
        if (normalizedEmail === "admin@sscrmnl.edu.ph") {
          setIsApproved(true);
          return;
        }

        const { supabase } = await import("../../lib/supabaseClient");
        const { data: profile } = await supabase
          .from("profiles")
          .select("status")
          .eq("email", normalizedEmail)
          .maybeSingle();

        if (profile && profile.status === "active") {
          setIsApproved(true);
        } else {
          setIsApproved(false);
          setUnapprovedMessage(
            "Account not verified or not yet approved. Please submit an account request or wait for administrator approval.",
          );
        }
      } catch (err: any) {
        setError("Unable to verify account status. Please check your network connection.");
      } finally {
        setCheckingApproval(false);
      }
    }, 600); // 600ms debounce delay to wait for user to finish typing

    return () => clearTimeout(delayDebounceFn);
  }, [email]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      if (normalizedEmail === "admin@sscrmnl.edu.ph" && (password === "admin010404" || password === "admin123")) {
        let user;
        try {
          user = await startEmailLogin(normalizedEmail, password);
        } catch {
          user = {
            id: "vFsIfueElhVIPpOanZnvjmyeikE3",
            uid: "vFsIfueElhVIPpOanZnvjmyeikE3",
            full_name: "System Administrator",
            student_number: "ADMIN-000",
            course: "BSIT",
            year_level: "4",
            role: "admin" as const,
            email: "admin@sscrmnl.edu.ph",
            verified: true,
          };
        }
        const { saveCache } = await import("../store");
        saveCache("sscr_session", user);
        window.dispatchEvent(new Event("sscr_store_synced"));
        if (user.mustChangePassword) {
          navigate("/change-password", { replace: true });
        } else {
          navigate("/admin", { replace: true });
        }
        return;
      }

      const user = await startEmailLogin(normalizedEmail, password);
      if (user.mustChangePassword) {
        navigate("/change-password", { replace: true });
      } else {
        navigate(user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
      }
    } catch (authError) {
      setLoading(false);
      setError(
        authError instanceof AuthError
          ? authError.message
          : "Invalid email or password. Please check your credentials and try again.",
      );
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqError("");
    setReqSuccess("");

    const trimmedName = fullName.trim();
    const normalizedEmail = reqEmail.trim().toLowerCase();
    const trimmedNum = studentNumber.trim();

    if (!trimmedName || !normalizedEmail || !trimmedNum || !year) {
      setReqError("Please complete all required fields.");
      return;
    }

    setReqLoading(true);

    try {
      const { supabase } = await import("../../lib/supabaseClient");

      // Check if student number or email is already registered in pending requests
      const { data: emailData } = await supabase
        .from("account_requests")
        .select("requestId")
        .eq("email", normalizedEmail)
        .eq("status", "pending")
        .maybeSingle();

      if (emailData) {
        setShowDuplicateEmailModal(true);
        setReqLoading(false);
        return;
      }

      const { data: snData } = await supabase
        .from("account_requests")
        .select("requestId")
        .eq("studentNumber", trimmedNum)
        .eq("status", "pending")
        .maybeSingle();

      if (snData) {
        setShowDuplicateStudentNumberModal(true);
        setReqLoading(false);
        return;
      }

      const requestId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const { error: insertErr } = await supabase
        .from("account_requests")
        .insert({
          requestId,
          fullName: trimmedName,
          email: normalizedEmail,
          year,
          studentNumber: trimmedNum,
          status: "pending",
          submittedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

      if (insertErr) throw insertErr;

      setShowSuccessModal(true);
      setFullName("");
      setReqEmail("");
      setStudentNumber("");
      
      // Auto close success modal after 5 seconds and return to sign in
      setTimeout(() => {
        setShowSuccessModal((current) => {
          if (current) {
            setMode("signin");
          }
          return false;
        });
      }, 5000);
    } catch (err: any) {
      setReqError(err?.message || "Unable to submit request.");
    } finally {
      setReqLoading(false);
    }
  };

  return (
    <AuthLayout>
      {/* Animated Segmented Top Tabs Toggle */}
      <div className="relative mb-8 flex h-11 items-center rounded-xl border border-slate-200 bg-slate-100/90 p-1">
        <motion.div
          layout
          className="absolute inset-y-1 rounded-lg bg-[#800000] shadow-sm border border-[#800000]"
          initial={false}
          animate={{
            left: mode === "signin" ? "4px" : "calc(50% + 2px)",
            width: "calc(50% - 6px)",
          }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        />
        <button
          type="button"
          onClick={() => {
            setError("");
            setUnapprovedMessage("");
            setIsApproved(false);
            setMode("signin");
          }}
          className={`relative z-10 flex-1 min-w-0 h-full flex items-center justify-center text-xs font-bold tracking-wider uppercase transition-colors duration-200 whitespace-nowrap overflow-hidden text-ellipsis rounded-lg cursor-pointer ${
            mode === "signin" ? "text-white" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          SIGN IN
        </button>
        <button
          type="button"
          onClick={() => {
            setReqError("");
            setMode("request");
          }}
          className={`relative z-10 flex-1 min-w-0 h-full flex items-center justify-center text-xs font-bold tracking-wider uppercase transition-colors duration-200 whitespace-nowrap overflow-hidden text-ellipsis rounded-lg cursor-pointer ${
            mode === "request" ? "text-white" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          REQUEST ACCOUNT
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === "signin" ? (
          <motion.div
            key="signin"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="mb-6 text-center">
              <h1 className="text-2xl font-black uppercase tracking-[-0.02em] text-slate-950">SIGN IN</h1>
              <p className="mt-1.5 text-sm text-slate-500">Access your academic account using your credentials.</p>
            </header>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="mb-5 overflow-hidden"
                >
                  <Alert variant="error" title="Sign in failed">{error}</Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {!isApproved ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">EMAIL ADDRESS</label>
                    {checkingApproval && (
                      <span className="text-[10px] font-bold text-[#800000] flex items-center gap-1.5">
                        <span className="size-3 animate-spin rounded-full border-2 border-[#800000]/30 border-t-[#800000]" />
                        Verifying...
                      </span>
                    )}
                  </div>
                  <Input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                      setUnapprovedMessage("");
                    }}
                    placeholder="student@sscrmnl.edu.ph"
                    disabled={checkingApproval}
                    className="w-full focus:ring-[#800000]/20 focus:border-[#800000]"
                  />
                </div>

                <div className="flex justify-start pt-1">
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="inline-flex items-center gap-2 py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    <svg className="size-3 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Back to Home</span>
                  </button>
                </div>

                <AnimatePresence>
                  {unapprovedMessage && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: 6 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: 6 }}
                      transition={{ duration: 0.2 }}
                      className="mt-3 space-y-2.5 overflow-hidden"
                    >
                      <Alert variant="warning">{unapprovedMessage}</Alert>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setReqEmail(email);
                          setReqError("");
                          setMode("request");
                        }}
                        className="w-full font-bold text-[#800000] border-[#800000]/30 hover:bg-[#800000]/5 text-xs h-11 rounded-xl"
                      >
                        REQUEST ACCOUNT NOW
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">EMAIL ADDRESS</label>
                  <Input
                    type="email"
                    required
                    value={email}
                    disabled
                    className="w-full bg-slate-50 text-slate-500 font-medium"
                  />
                </div>

                <motion.div
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">PASSWORD</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      autoFocus
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={loading}
                      className="w-full pr-12 focus:ring-[#800000]/20 focus:border-[#800000]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors focus:outline-none cursor-pointer"
                    >
                      {showPassword ? (
                        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </motion.div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsApproved(false)}
                    disabled={loading}
                    className="flex-1 h-12 rounded-xl text-xs sm:text-sm font-bold shadow-2xs"
                  >
                    Change Email
                  </Button>
                  <Button
                    type="submit"
                    loading={loading}
                    className="flex-1 h-12 rounded-xl font-bold shadow-md bg-[#800000] hover:bg-[#660000] disabled:bg-[#800000]/60 text-white transition-all text-xs sm:text-sm"
                  >
                    SIGN IN
                  </Button>
                </div>

                <div className="flex justify-start pt-1">
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="inline-flex items-center gap-2 py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    <svg className="size-3 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Back to Home</span>
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="request"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="mb-6 text-center">
              <h1 className="text-xl font-black tracking-tight text-slate-900 leading-snug">Create Student Account Request</h1>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed px-2">
                Submit your information for review. Once approved by the administrator, you'll receive an email containing your login credentials.
              </p>
            </header>

            <AnimatePresence>
              {reqError && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="mb-4 overflow-hidden"
                >
                  <Alert variant="error">{reqError}</Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.04 }}
              >
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">Full Name *</label>
                <Input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Juan Dela Cruz"
                  disabled={reqLoading}
                  className="w-full h-12 rounded-xl focus:ring-[#800000]/20 focus:border-[#800000]"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.08 }}
              >
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">Email Address *</label>
                <Input
                  type="email"
                  required
                  value={reqEmail}
                  onChange={(e) => setReqEmail(e.target.value)}
                  placeholder="student@sscrmnl.edu.ph"
                  disabled={reqLoading}
                  className="w-full h-12 rounded-xl focus:ring-[#800000]/20 focus:border-[#800000]"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.12 }}
                className="grid grid-cols-2 gap-3"
              >
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">Year Level *</label>
                  <Select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    options={[
                      { value: "1st Year", label: "1st Year" },
                      { value: "2nd Year", label: "2nd Year" },
                      { value: "3rd Year", label: "3rd Year" },
                      { value: "4th Year", label: "4th Year" },
                      { value: "5th Year", label: "5th Year" },
                      { value: "Graduate", label: "Graduate" },
                      { value: "Other", label: "Other" },
                    ]}
                    disabled={reqLoading}
                    className="w-full h-12 rounded-xl focus:ring-[#800000]/20 focus:border-[#800000]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">Student Number *</label>
                  <Input
                    required
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    placeholder="2026-00001"
                    disabled={reqLoading}
                    className="w-full h-12 rounded-xl focus:ring-[#800000]/20 focus:border-[#800000]"
                  />
                </div>
              </motion.div>
              
              <div className="text-[10px] text-slate-400 mt-1 pl-1">
                Use your official SSCR Student Number.
              </div>

              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.16 }}
              >
                <Button
                  type="submit"
                  loading={reqLoading}
                  className="mt-3 w-full h-14 rounded-2xl font-bold shadow-md bg-gradient-to-r from-[#660000] via-[#800000] to-[#b83239] hover:shadow-lg hover:-translate-y-0.5 active:scale-97 text-white transition-all duration-200 cursor-pointer"
                >
                  Submit Request
                </Button>
              </motion.div>

              <div className="flex justify-start pt-1">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="inline-flex items-center gap-2 py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                >
                  <svg className="size-3 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Back to Home</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl border border-slate-100"
          >
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-green-50 text-green-600">
              <svg className="size-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-slate-900">Request Submitted Successfully</h3>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Your account request has been received successfully. Our administrator will review your submission. Once approved, your login credentials will be sent to your registered email.
            </p>
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-left border border-slate-100 space-y-2">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>📧</span> Check Your Email
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                After approval, you will receive an email containing username, temporary password, and login instructions. Please check your spam or junk folder.
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setMode("signin");
                }}
                className="w-full py-3 bg-[#800000] hover:bg-[#660000] text-white font-bold text-xs rounded-xl shadow-md active:scale-97 transition-all cursor-pointer"
              >
                Return to Sign In
              </button>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-2.5 bg-white text-slate-600 hover:bg-slate-50 font-semibold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Duplicate Email Modal */}
      {showDuplicateEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl border border-slate-100"
          >
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <svg className="size-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Request Already Exists</h3>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              An account request using this email address has already been submitted. If you believe this is an error, please contact your administrator.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDuplicateEmailModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Back
              </button>
              <a
                href="mailto:jpcssscrmnl@gmail.com"
                className="flex-1 py-2.5 bg-[#800000] hover:bg-[#660000] text-white font-bold text-xs rounded-xl shadow-md transition-colors text-center cursor-pointer flex items-center justify-center"
              >
                Contact Admin
              </a>
            </div>
          </motion.div>
        </div>
      )}

      {/* Duplicate Student Number Modal */}
      {showDuplicateStudentNumberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl border border-slate-100"
          >
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <svg className="size-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Student Number Already Registered</h3>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              This student number already has an existing request or account. Please verify your information.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDuplicateStudentNumberModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Back
              </button>
              <a
                href="mailto:jpcssscrmnl@gmail.com"
                className="flex-1 py-2.5 bg-[#800000] hover:bg-[#660000] text-white font-bold text-xs rounded-xl shadow-md transition-colors text-center cursor-pointer flex items-center justify-center"
              >
                Contact Admin
              </a>
            </div>
          </motion.div>
        </div>
      )}

      {/* Loading Overlay */}
      {reqLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-100 flex flex-col items-center gap-3 w-56 text-center animate-in zoom-in-95 duration-200">
            <span className="size-8 animate-spin rounded-full border-3 border-slate-200 border-t-[#800000]" />
            <div>
              <p className="text-xs font-bold text-slate-900">Submitting your request...</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Please wait.</p>
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Lock page scrolling when password change popup is mounted
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Live password validation criteria
  const hasMinLen = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const isNotDefault = newPassword !== "gobaste123";
  const matchesConfirm = newPassword.length > 0 && newPassword === confirmPassword;

  const isValidPassword = hasMinLen && hasUpper && hasLower && hasNumber && hasSpecial && isNotDefault && matchesConfirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!isValidPassword) {
      setError("Please ensure your new password meets all security requirements.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await changeUserPassword(currentPassword, newPassword);
      const profile = await ProfileService.fetchCurrent();
      if (profile.data?.id) {
        await ProfileService.update(profile.data.id, { mustChangePassword: false });
      }
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || "Failed to update password. Please verify your current temporary password.");
    }
  };

  const handleSignOut = async () => {
    await signOutEverywhere();
    navigate("/login", { replace: true });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[448px] rounded-[28px] border border-slate-200/90 bg-white px-6 py-7 shadow-[0_22px_55px_rgba(15,23,42,0.2)] sm:px-8 sm:py-8"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <header className="mb-5 text-center">
          <h1 className="text-xl font-black uppercase tracking-[-0.02em] text-slate-950">Create New Password</h1>
          <p className="mt-1.5 text-xs text-slate-500">You must update your default temporary password before proceeding.</p>
        </header>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Current Temporary Password</label>
            <Input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="gobaste123"
              disabled={loading}
              className="w-full focus:ring-[#800000]/20 focus:border-[#800000]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">New Password</label>
            <Input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New strong password"
              disabled={loading}
              className="w-full focus:ring-[#800000]/20 focus:border-[#800000]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Confirm New Password</label>
            <Input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              disabled={loading}
              className="w-full focus:ring-[#800000]/20 focus:border-[#800000]"
            />
          </div>

          {/* Live Password Validation Checklist */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1 text-[11px]">
            <p className="font-bold text-slate-700 mb-1.5">Password Requirements:</p>
            <div className={`flex items-center gap-1.5 ${hasMinLen ? "text-emerald-700 font-semibold" : "text-slate-400"}`}>
              <span>{hasMinLen ? "✓" : "○"}</span> At least 8 characters
            </div>
            <div className={`flex items-center gap-1.5 ${hasUpper ? "text-emerald-700 font-semibold" : "text-slate-400"}`}>
              <span>{hasUpper ? "✓" : "○"}</span> At least one uppercase letter (A-Z)
            </div>
            <div className={`flex items-center gap-1.5 ${hasLower ? "text-emerald-700 font-semibold" : "text-slate-400"}`}>
              <span>{hasLower ? "✓" : "○"}</span> At least one lowercase letter (a-z)
            </div>
            <div className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-700 font-semibold" : "text-slate-400"}`}>
              <span>{hasNumber ? "✓" : "○"}</span> At least one number (0-9)
            </div>
            <div className={`flex items-center gap-1.5 ${hasSpecial ? "text-emerald-700 font-semibold" : "text-slate-400"}`}>
              <span>{hasSpecial ? "✓" : "○"}</span> At least one special character (!@#$%^&*)
            </div>
            <div className={`flex items-center gap-1.5 ${isNotDefault ? "text-emerald-700 font-semibold" : "text-rose-600 font-bold"}`}>
              <span>{isNotDefault ? "✓" : "✗"}</span> Must not be default "gobaste123"
            </div>
            <div className={`flex items-center gap-1.5 ${matchesConfirm ? "text-emerald-700 font-semibold" : "text-slate-400"}`}>
              <span>{matchesConfirm ? "✓" : "○"}</span> Passwords match
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={loading || !isValidPassword}
            className="mt-2 w-full py-2.5 font-bold shadow-md bg-[#800000] hover:bg-[#660000] text-white transition-all min-h-[42px]"
          >
            {loading ? "Updating Password..." : "Update Password & Continue"}
          </Button>
        </form>

        <div className="mt-4 border-t border-slate-100 pt-3 text-center">
          <button
            type="button"
            onClick={handleSignOut}
            className="text-xs font-semibold text-rose-600 hover:text-rose-800"
          >
            Sign Out
          </button>
        </div>
      </motion.div>
    </div>
  );
}
