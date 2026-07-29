import React, { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button, Input, Select, Alert, Tabs } from "../components/ui";
import { checkLoginEmail, login, register, sendPasswordResetEmail, resendVerification } from "../store";
import { auth } from "../../firebase/config";
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
  signOut as firebaseSignOut,
} from "firebase/auth";
import type { User } from "../types";

interface AuthProps {
  onAuth: (user: User) => void;
}


const YEAR_LEVELS = [
  { value: "", label: "Select year level" },
  { value: "1", label: "1st Year" },
  { value: "2", label: "2nd Year" },
  { value: "3", label: "3rd Year" },
  { value: "4", label: "4th Year" },
  { value: "Irregular", label: "Irregular" },
];

function AuthTabs({ active }: { active: "login" | "register" }) {
  const navigate = useNavigate();

  const handleTabChange = (nextTab: string) => {
    navigate(nextTab === "login" ? "/login" : "/register");
  };

  return (
    <Tabs
      tabs={[
        { id: "login", label: "Sign In" },
        { id: "register", label: "Sign Up" },
      ]}
      active={active}
      onChange={handleTabChange}
      ariaLabel="Authentication"
      className="auth-tabs mb-6 w-full rounded-2xl [&_[data-tab-indicator]]:rounded-xl [&_button]:h-10 [&_button]:text-xs [&_button]:font-bold [&_button]:uppercase [&_button]:tracking-[0.12em]"
    />
  );
}
export function LoginPage({ onAuth }: AuthProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"not_registered" | "unverified" | "verified" | null>(null);
  const [emailNotice, setEmailNotice] = useState<{
    variant: "info" | "success" | "warning" | "error";
    title: string;
    message: string;
  } | null>(null);

  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState<{ variant: "success" | "error"; text: string } | null>(null);

  const passwordReady = emailStatus === "verified" || emailStatus === "unverified";

  // Cooldown timer handler
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailStatus(null);
    setEmailNotice(null);
    setError("");
    setPassword("");
    setShowPassword(false);
    setResendMessage(null);
  };

  const handleResendVerification = async () => {
    if (!email.trim() || !password) {
      setError("Please enter your password to request a new verification email.");
      return;
    }
    setResendLoading(true);
    setResendMessage(null);
    try {
      const res = await resendVerification(email, password);
      if (res.success) {
        setResendMessage({
          variant: "success",
          text: "Verification link dispatched! Please check your official email inbox.",
        });
        setResendCooldown(60);
      } else {
        setResendMessage({
          variant: "error",
          text: res.error || "Failed to resend verification email.",
        });
      }
    } catch (err: any) {
      setResendMessage({
        variant: "error",
        text: err.message || "An unexpected error occurred.",
      });
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResendMessage(null);

    if (!passwordReady) {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || !normalizedEmail.includes("@")) {
        setEmailNotice({
          variant: "error",
          title: "Invalid email",
          message: "Enter the email address you used when registering.",
        });
        return;
      }

      setLoading(true);
      const result = await checkLoginEmail(normalizedEmail);
      setLoading(false);

      if (result.error || !result.status) {
        setEmailNotice({
          variant: "error",
          title: "Unable to check email",
          message: result.error || "Please try again in a moment.",
        });
        return;
      }

      setEmailStatus(result.status);
      if (result.status === "not_registered") {
        setEmailNotice({
          variant: "error",
          title: "Account not found",
          message: "This email is not registered. Select Sign Up to create an account.",
        });
        return;
      }
      if (result.status === "unverified") {
        setEmailNotice({
          variant: "warning",
          title: "Email not verified",
          message: "Your account exists, but your email is not verified yet. Enter your password below to log in or request a new verification link.",
        });
        return;
      }

      setEmailNotice(null);
      return;
    }

    if (!password) {
      setError("Enter your password to continue.");
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.error || !result.user) {
      setError(result.error || "Invalid email or password. Please try again.");
      return;
    }
    onAuth(result.user);
    navigate(result.user.role === "admin" ? "/admin" : "/dashboard");
  };

  const isUnverifiedError = error && (error.includes("not been verified") || emailStatus === "unverified");

  return (
    <AuthLayout publicChrome>
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-black uppercase tracking-[-0.02em] text-slate-950">Welcome Back</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          {passwordReady ? "Enter your password to access your dashboard" : "Enter your registered email to continue"}
        </p>
      </header>

      <AuthTabs active="login" />

      {error && <Alert variant="error" className="mb-5" title="Sign in failed">{error}</Alert>}

      {resendMessage && (
        <Alert variant={resendMessage.variant} className="mb-5" title={resendMessage.variant === "success" ? "Success" : "Error"}>
          {resendMessage.text}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="relative">
          <label htmlFor="login-email" className="sr-only">Official Email</label>
          <svg aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm0 0v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.2 6.9" />
          </svg>
          <input
            id="login-email"
            type="email"
            placeholder="Official email address"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            autoComplete="username"
            autoFocus
            className={`h-12 w-full rounded-xl border bg-slate-50/70 pl-11 pr-11 text-sm text-slate-900 shadow-2xs outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:bg-white focus:ring-2 ${
              passwordReady
                ? "border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/15"
                : "border-slate-200 focus:border-primary focus:ring-primary/15"
            }`}
          />
          {passwordReady && emailStatus === "verified" && (
            <svg aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="m5 12 4 4L19 6" />
            </svg>
          )}
        </div>

        {emailNotice && (
          <Alert variant={emailNotice.variant} title={emailNotice.title} className="text-xs">
            {emailNotice.message}
          </Alert>
        )}

        {passwordReady && (
          <div className="animate-in fade-in slide-in-from-top-2 space-y-3.5 duration-200">
            <div className="relative">
              <label htmlFor="login-password" className="sr-only">Password</label>
              <svg aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect width="14" height="10" x="5" y="10" rx="2" strokeWidth={1.8} />
                <path strokeLinecap="round" strokeWidth={1.8} d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                autoFocus
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-11 pr-12 text-sm text-slate-900 shadow-2xs outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                {showPassword ? (
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0 1 12 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 0 1 1.563-3.029m5.858.908a3 3 0 1 1 4.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88 6.59 6.59m7.532 7.532 3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0 1 12 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 0 1-4.132 5.411m0 0L21 21" /></svg>
                ) : (
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z" /></svg>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <Button type="submit" size="lg" loading={loading} className="h-12 w-full rounded-xl text-sm font-bold uppercase tracking-[0.12em] shadow-[0_8px_20px_rgba(139,30,36,0.18)]">
            {passwordReady ? "Sign In" : "Continue"}
          </Button>

          {isUnverifiedError && password && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              loading={resendLoading}
              disabled={resendCooldown > 0}
              onClick={handleResendVerification}
              className="h-12 w-full rounded-xl text-xs font-bold uppercase tracking-[0.08em]"
            >
              {resendCooldown > 0 ? `Resend Link (${resendCooldown}s)` : "Resend Verification Email"}
            </Button>
          )}
        </div>

        {passwordReady && (
          <div className="flex justify-center pt-1">
            <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
        )}
      </form>
    </AuthLayout>
  );
}
export function RegisterPage({ onAuth }: AuthProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "", student_number: "", course: "BSIT", year_level: "", email: "", password: "", confirm_password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const [confirmationSent, setConfirmationSent] = useState(false);
  const [createdUser, setCreatedUser] = useState<User | null>(null);

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim()) e.full_name = "Full name is required.";
    if (!form.student_number.trim()) e.student_number = "Student number is required.";
    if (!form.course) e.course = "Please select your course.";
    if (!form.year_level) e.year_level = "Please select your year level.";
    
    const emailLower = form.email.trim().toLowerCase();
    if (!emailLower.includes("@")) {
      e.email = "Please enter a valid email address.";
    }

    if (form.password.length < 8) e.password = "Password must be at least 8 characters.";
    if (form.password !== form.confirm_password) e.confirm_password = "Passwords do not match.";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const res = await register({
        full_name: form.full_name,
        student_number: form.student_number,
        course: form.course,
        year_level: form.year_level,
        email: form.email,
        password: form.password,
      });
      setLoading(false);
      if (res.error || !res.user) {
        setServerError(res.error || "An account with this email already exists.");
        return;
      }
      setCreatedUser(res.user);
      setConfirmationSent(true);
    } catch (err) {
      setLoading(false);
      setServerError("An error occurred during registration. Please try again.");
    }
  };

  const handleProceedToSignIn = () => {
    navigate("/login");
  };

  return (
    <AuthLayout wide publicChrome>
      {confirmationSent ? (
        <div className="py-4 text-center">
          <div className="size-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
            <svg className="size-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-1">Verify Your Email Address</h2>
          <p className="text-xs text-muted-foreground mb-4">
            We have sent a verification link to your official SSCR email:
            <br />
            <strong className="text-primary font-mono text-sm block mt-1">{form.email}</strong>
          </p>

          <Alert variant="info" className="mb-6 text-xs text-left">
            💡 Please check your <strong>@sscrmnl.edu.ph</strong> inbox or Gmail folder and click the confirmation link to complete registration.
          </Alert>

          <div className="flex flex-col gap-2">
            <a
              href="https://mail.google.com"
              target="_blank"
              rel="noreferrer"
              className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm"
            >
              📧 Open Gmail Inbox
            </a>
            <Button variant="outline" size="lg" className="w-full" onClick={handleProceedToSignIn}>
              Proceed to Sign In
            </Button>
          </div>
        </div>
      ) : (
        <>
          <header className="mb-6 text-center">
            <h1 className="text-2xl font-black uppercase tracking-[-0.02em] text-slate-950">Join the Portal</h1>
            <p className="mt-1.5 text-sm text-slate-500">Create your student account</p>
          </header>

          <AuthTabs active="register" />

          {serverError && <Alert variant="error" className="mb-5">{serverError}</Alert>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Full Name" placeholder="Maria Clara Santos" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} error={errors.full_name} />
              <Input label="Student Number" placeholder="2021-00123" value={form.student_number} onChange={(e) => set("student_number", e.target.value)} error={errors.student_number} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Course" value="BSIT" readOnly className="cursor-default bg-slate-50 font-semibold text-slate-700" />
              <Select label="Year Level" value={form.year_level} onChange={(e) => set("year_level", e.target.value)} options={YEAR_LEVELS} error={errors.year_level} />
            </div>
            <Input label="Email" type="email" placeholder="you@sscrmnl.edu.ph" value={form.email} onChange={(e) => set("email", e.target.value)} error={errors.email} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Password" type="password" placeholder="At least 8 characters" value={form.password} onChange={(e) => set("password", e.target.value)} error={errors.password} />
              <Input label="Confirm Password" type="password" placeholder="Re-enter password" value={form.confirm_password} onChange={(e) => set("confirm_password", e.target.value)} error={errors.confirm_password} />
            </div>
            
            <Button type="submit" size="lg" loading={loading} className="mt-2 h-12 w-full rounded-xl text-sm font-bold uppercase tracking-[0.12em] shadow-[0_8px_20px_rgba(139,30,36,0.18)]">
              Sign Up
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const emailLower = email.trim().toLowerCase();
    if (!emailLower) {
      setError("Please enter your official email address.");
      return;
    }
    if (!emailLower.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    const result = await sendPasswordResetEmail(emailLower);
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Unable to send the password reset email.");
      return;
    }
    setSent(true);
  };

  return (
    <AuthLayout>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold text-foreground">Reset your password</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-[285px] mx-auto leading-relaxed">
          {sent
            ? "We received a request to reset your password. An email with your reset link has been sent."
            : "Enter your official institutional email to receive a password reset link in Gmail."}
        </p>
      </div>

      {sent ? (
        <div className="space-y-4 mb-4 text-center">
          <Alert variant="success" className="text-xs text-left leading-relaxed">
            📩 Password reset link dispatched! We sent a password reset email to:
            <strong className="block mt-1 font-mono text-sm text-emerald-800">{email}</strong>
          </Alert>

          <a
            href="https://mail.google.com"
            target="_blank"
            rel="noreferrer"
            className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm"
          >
            📧 Open Gmail Inbox
          </a>

          <p className="text-xs text-muted-foreground">
            For security, use the reset link in the email. It contains the temporary recovery session required to change your password.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-4">
          {error && <Alert variant="error" className="text-xs">{error}</Alert>}
          <Input
            label="Official Email"
            type="email"
            placeholder="you@sscrmnl.edu.ph"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" size="lg" loading={loading} className="w-full">
            Send Reset Link to Gmail
          </Button>
        </form>
      )}

      <Link to="/login" className="w-full block">
        <Button variant="outline" size="lg" className="w-full">
          Back to Login
        </Button>
      </Link>
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);

  useEffect(() => {
    let active = true;

    const detectRecoverySession = async () => {
      const queryParams = new URLSearchParams(window.location.search);
      const oobCode = queryParams.get("oobCode");
      const errorParam = queryParams.get("error_description");

      if (errorParam) {
        if (active) setError(decodeURIComponent(errorParam.replace(/\+/g, " ")));
        return;
      }

      if (!oobCode) {
        if (active) setError("Invalid or missing password reset link. Please request a new one.");
        return;
      }

      try {
        // Verify the code is still valid before showing the form
        await verifyPasswordResetCode(auth, oobCode);
        if (active) setRecoveryReady(true);
      } catch (err: any) {
        if (active) setError(err?.message || "This reset link has expired or is invalid. Please request a new one.");
      }
    };

    void detectRecoverySession();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!recoveryReady) {
      setError("This reset link is invalid or has expired. Request a new password reset email.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    const queryParams = new URLSearchParams(window.location.search);
    const oobCode = queryParams.get("oobCode") || "";
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      await firebaseSignOut(auth);
      setLoading(false);
      setSuccess(true);
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || "Failed to reset password. Please request a new link.");
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold text-foreground">Set New Password</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-[285px] mx-auto leading-relaxed">
          Create a new secure password for your account.
        </p>
      </div>

      {success ? (
        <div className="space-y-4 mb-4 text-center">
          <Alert variant="success" className="text-xs text-left leading-relaxed">
            🎉 Your password has been reset successfully! You can now log in using your new credentials.
          </Alert>
          <Button size="lg" className="w-full" onClick={() => navigate("/login")}>
            Sign In Now
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-4">
          {error && <Alert variant="error" className="text-xs">{error}</Alert>}
          {!recoveryReady && !error && (
            <Alert variant="info" className="text-xs">
              Validating your password recovery link…
            </Alert>
          )}
          <Input
            label="New Password"
            type="password"
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            label="Confirm New Password"
            type="password"
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Button type="submit" size="lg" loading={loading} disabled={!recoveryReady} className="w-full">
            Update Password
          </Button>
        </form>
      )}

      <Link to="/login" className="w-full block">
        <Button variant="outline" size="lg" className="w-full">
          Back to Login
        </Button>
      </Link>
    </AuthLayout>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────

function AuthLayout({ children, wide, publicChrome = false }: { children: React.ReactNode; wide?: boolean; publicChrome?: boolean }) {
  return (
    <div className={`auth-organic-bg relative flex flex-col items-center justify-center overflow-hidden px-4 py-8 ${publicChrome ? "min-h-[calc(100vh-86px)] pt-[118px] sm:pt-[126px]" : "min-h-screen"}`}>
      <section className={`auth-surface relative w-full overflow-hidden ${wide ? "max-w-[560px]" : "max-w-[448px]"} rounded-[28px] border border-slate-200/90 bg-white px-6 py-7 shadow-[0_22px_55px_rgba(15,23,42,0.12)] sm:px-8 sm:py-8`}>
        <div aria-hidden="true" className="absolute inset-x-7 top-0 h-1 rounded-b-full bg-gradient-to-r from-primary via-primary to-amber-400" />

        <div className="mb-5 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-700 ring-1 ring-slate-200/80">
            <svg aria-hidden="true" className="size-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m8 9 3 3-3 3m5 0h3M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
            </svg>
            JPCS Academic Portal
          </div>
        </div>

        {children}
      </section>

      <p className="relative mt-5 whitespace-nowrap text-center text-[9px] leading-5 text-slate-400 sm:text-[11px]">
        Secure access for enrolled students of San Sebastian College–Recoletos Manila.
      </p>
    </div>
  );
}

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Verification token is missing. Please check your verification link.");
      return;
    }

    const performVerification = async () => {
      try {
        const response = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setStatus("success");
        } else {
          setStatus("error");
          setErrorMessage(data.error || "Verification failed. The token may be expired or already used.");
        }
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(err.message || "An unexpected error occurred during email verification.");
      }
    };

    performVerification();
  }, [token]);

  return (
    <AuthLayout publicChrome>
      <div className="py-4 text-center">
        {status === "loading" && (
          <div className="flex flex-col items-center py-6">
            <div className="size-12 rounded-full border-4 border-slate-200 border-t-primary animate-spin mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-1">Verifying Your Email</h2>
            <p className="text-xs text-muted-foreground">Please wait while we activate your account...</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center">
            <div className="size-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200 animate-bounce">
              <svg className="size-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="m5 12 4 4L19 6" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-1">Email Verified!</h2>
            <p className="text-xs text-muted-foreground mb-6">
              Your account has been successfully verified and activated. You can now sign in to access the portal.
            </p>
            <Link to="/login" className="w-full">
              <Button size="lg" className="w-full">
                Proceed to Sign In
              </Button>
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center">
            <div className="size-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-200">
              <svg className="size-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-1">Verification Failed</h2>
            <p className="text-xs text-rose-600 font-semibold mb-4">{errorMessage}</p>
            <p className="text-xs text-muted-foreground mb-6">
              If the link expired, please log in with your credentials to request a new verification email.
            </p>
            <Link to="/login" className="w-full">
              <Button variant="outline" size="lg" className="w-full">
                Back to Sign In
              </Button>
            </Link>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
