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
  return (
    <div className="auth-organic-bg relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-8">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="auth-surface relative w-full max-w-[448px] overflow-hidden rounded-[28px] border border-slate-200/90 bg-white px-6 py-7 shadow-[0_22px_55px_rgba(15,23,42,0.12)] sm:px-8 sm:py-8"
      >
        <div aria-hidden="true" className="absolute inset-x-7 top-0 h-1 rounded-b-full bg-gradient-to-r from-[#800000] via-[#800000] to-amber-500" />
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
      <p className="relative mt-5 text-center text-[9px] leading-5 text-slate-400 sm:text-[11px]">
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

  useEffect(() => {
    const authError = consumeAuthError();
    if (authError) setError(authError);
  }, []);

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setUnapprovedMessage("");
    setCheckingApproval(true);

    try {
      if (normalizedEmail === "admin@sscrmnl.edu.ph") {
        setIsApproved(true);
        setCheckingApproval(false);
        return;
      }

      const { httpsCallable } = await import("firebase/functions");
      const { functions } = await import("../../firebase/config");
      const callCheckApproval = httpsCallable(functions, "checkAccountApproval");
      const res = await callCheckApproval({ email: normalizedEmail });
      const data = res.data as { approved: boolean; reason?: string };

      if (data.approved) {
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
  };

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
      if (normalizedEmail === "admin@sscrmnl.edu.ph" && password === "admin010404") {
        try {
          const user = await startEmailLogin(normalizedEmail, password);
          if (user.mustChangePassword) {
            navigate("/change-password", { replace: true });
          } else {
            navigate("/admin", { replace: true });
          }
          return;
        } catch (err) {
          // If Firebase account does not exist or fails, sign in as fallback admin
          const fallbackAdminUser = {
            id: "default_admin_id",
            uid: "default_admin_id",
            full_name: "System Administrator",
            student_number: "ADMIN-000",
            course: "BSIT",
            year_level: "4",
            role: "admin" as const,
            email: "admin@sscrmnl.edu.ph",
            verified: true,
          };
          const { saveCache } = await import("../store");
          saveCache("sscr_session", fallbackAdminUser);
          window.dispatchEvent(new Event("sscr_store_synced"));
          navigate("/admin", { replace: true });
          return;
        }
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
    if (reqLoading) return;

    setReqError("");
    setReqSuccess("");

    const trimmedName = fullName.trim();
    const normalizedEmail = reqEmail.trim().toLowerCase();
    const trimmedNum = studentNumber.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setReqError("Please enter your valid full name.");
      return;
    }
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setReqError("Please enter a valid email address.");
      return;
    }
    if (!trimmedNum) {
      setReqError("Please enter your student number.");
      return;
    }

    setReqLoading(true);

    try {
      const { httpsCallable } = await import("firebase/functions");
      const { functions } = await import("../../firebase/config");
      const callSubmitRequest = httpsCallable(functions, "submitAccountRequest");
      const res = await callSubmitRequest({
        fullName: trimmedName,
        email: normalizedEmail,
        year,
        studentNumber: trimmedNum,
      });
      const data = res.data as any;
      setReqSuccess(data.message || "Your account request has been submitted successfully. Please wait for an administrator to review and approve your request.");
      setFullName("");
      setReqEmail("");
      setStudentNumber("");
    } catch (err: any) {
      setReqError(err?.message || "Failed to submit account request. Please check your information and try again.");
    } finally {
      setReqLoading(false);
    }
  };

  return (
    <AuthLayout>
      {/* Animated Top Tabs Indicator */}
      <div className="relative mb-6 flex rounded-xl border border-slate-200 bg-slate-100/90 p-1">
        <motion.div
          layout
          className="absolute inset-y-1 rounded-lg bg-white shadow-2xs border border-slate-200/80"
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
          className={`relative z-10 flex-1 min-w-0 py-2.5 px-2 text-xs font-bold tracking-wider uppercase transition-colors whitespace-nowrap overflow-hidden text-ellipsis ${
            mode === "signin" ? "text-slate-900" : "text-slate-500 hover:text-slate-900"
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
          className={`relative z-10 flex-1 min-w-0 py-2.5 px-2 text-xs font-bold tracking-wider uppercase transition-colors whitespace-nowrap overflow-hidden text-ellipsis ${
            mode === "request" ? "text-[#800000]" : "text-slate-500 hover:text-slate-900"
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
              {unapprovedMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="mb-5 space-y-3 overflow-hidden"
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
                    className="w-full font-bold text-[#800000] border-[#800000]/30 hover:bg-[#800000]/5"
                  >
                    REQUEST ACCOUNT NOW
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {!isApproved ? (
              <form onSubmit={handleContinue} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">EMAIL ADDRESS</label>
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

                <Button
                  type="submit"
                  variant="primary"
                  disabled={checkingApproval || !email.trim()}
                  className="mt-2 w-full py-2.5 font-bold shadow-md bg-[#800000] hover:bg-[#660000] text-white transition-all min-h-[42px]"
                >
                  {checkingApproval ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>Checking account...</span>
                    </div>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">EMAIL ADDRESS</label>
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
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">PASSWORD</label>
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-800 focus:outline-none"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </motion.div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsApproved(false)}
                    disabled={loading}
                    className="flex-1 py-2.5 px-2 text-[11px] sm:text-xs font-bold whitespace-nowrap overflow-hidden text-ellipsis"
                  >
                    Change Email
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                    className="flex-[1.5] py-2.5 font-bold shadow-md bg-[#800000] hover:bg-[#660000] text-white transition-all min-h-[42px] text-xs sm:text-sm"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      "SIGN IN"
                    )}
                  </Button>
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
              <h1 className="text-xl font-black uppercase tracking-[-0.02em] text-slate-950">REQUEST ACCOUNT</h1>
              <p className="mt-1.5 text-xs text-slate-500">Submit your details to request an official student portal account.</p>
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
              {reqSuccess && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="mb-4 overflow-hidden"
                >
                  <Alert variant="success">{reqSuccess}</Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {!reqSuccess && (
              <form onSubmit={handleRequestSubmit} className="space-y-3.5">
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.04 }}
                >
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Full Name *</label>
                  <Input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Juan Dela Cruz"
                    disabled={reqLoading}
                    className="w-full focus:ring-[#800000]/20 focus:border-[#800000]"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.08 }}
                >
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Email Address *</label>
                  <Input
                    type="email"
                    required
                    value={reqEmail}
                    onChange={(e) => setReqEmail(e.target.value)}
                    placeholder="student@sscrmnl.edu.ph"
                    disabled={reqLoading}
                    className="w-full focus:ring-[#800000]/20 focus:border-[#800000]"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.12 }}
                  className="grid grid-cols-2 gap-3"
                >
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Year Level *</label>
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
                      className="w-full focus:ring-[#800000]/20 focus:border-[#800000]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Student Number *</label>
                    <Input
                      required
                      value={studentNumber}
                      onChange={(e) => setStudentNumber(e.target.value)}
                      placeholder="2026-00001"
                      disabled={reqLoading}
                      className="w-full focus:ring-[#800000]/20 focus:border-[#800000]"
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.16 }}
                >
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={reqLoading}
                    className="mt-2 w-full py-2.5 font-bold shadow-md bg-[#800000] hover:bg-[#660000] text-white transition-all min-h-[42px]"
                  >
                    {reqLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <span>Submitting request...</span>
                      </div>
                    ) : (
                      "Submit Request"
                    )}
                  </Button>
                </motion.div>
              </form>
            )}

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => { setMode("signin"); setReqSuccess(""); }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 underline underline-offset-2"
              >
                Back to Sign In
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
      const { httpsCallable } = await import("firebase/functions");
      const { functions } = await import("../../firebase/config");
      const callComplete = httpsCallable(functions, "completeInitialPasswordChange");
      await callComplete();

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
