import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LoginForm } from "../../features/auth/components/LoginForm";
import { AccountRequestForm } from "../../features/auth/components/AccountRequestForm";

export function LoginPage() {
  const [mode, setMode] = useState<"signin" | "request">("signin");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  return (
    <div className="auth-organic-bg relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-8 cursor-pointer">
      <motion.section
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="auth-surface relative w-full max-w-[448px] overflow-hidden rounded-[28px] border border-slate-200/90 bg-white px-6 py-7 shadow-[0_22px_55px_rgba(15,23,42,0.12)] sm:px-8 sm:py-8 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#800000] via-[#800000] to-amber-500" />
        <div className="mb-5 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-700 ring-1 ring-slate-200/80">
            JPCS Academic Portal
          </div>
        </div>

        {/* Toggle Tabs */}
        <div className="relative mb-8 flex h-11 items-center rounded-xl border border-slate-200 bg-slate-100/90 p-1">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`relative z-10 flex-1 min-w-0 h-full flex items-center justify-center text-xs font-bold tracking-wider uppercase transition-colors duration-200 rounded-lg cursor-pointer ${
              mode === "signin" ? "bg-[#800000] text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            SIGN IN
          </button>
          <button
            type="button"
            onClick={() => setMode("request")}
            className={`relative z-10 flex-1 min-w-0 h-full flex items-center justify-center text-xs font-bold tracking-wider uppercase transition-colors duration-200 rounded-lg cursor-pointer ${
              mode === "request" ? "bg-[#800000] text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            REQUEST ACCOUNT
          </button>
        </div>

        <AnimatePresence mode="wait">
          {mode === "signin" ? (
            <LoginForm key="signin" onSwitchToRequest={() => setMode("request")} />
          ) : (
            <AccountRequestForm
              key="request"
              onSuccess={() => {
                setShowSuccessModal(true);
                setMode("signin");
              }}
            />
          )}
        </AnimatePresence>
      </motion.section>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl border border-slate-100">
            <h3 className="text-lg font-black text-slate-900">Request Submitted Successfully</h3>
            <p className="mt-2 text-xs text-slate-500">Your account request has been received. Once approved by the administrator, credentials will be sent to your email.</p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="mt-6 w-full py-3 bg-[#800000] text-white font-bold text-xs rounded-xl shadow-md"
            >
              Return to Sign In
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
