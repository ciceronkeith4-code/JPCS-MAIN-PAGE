import React from "react";
import { ChangePasswordForm } from "../../features/auth/components/ChangePasswordForm";

export function ChangePasswordPage() {
  return (
    <div className="auth-organic-bg relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-8">
      <div className="auth-surface relative w-full max-w-[448px] overflow-hidden rounded-[28px] border border-slate-200/90 bg-white px-6 py-7 shadow-[0_22px_55px_rgba(15,23,42,0.12)] sm:px-8 sm:py-8">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
