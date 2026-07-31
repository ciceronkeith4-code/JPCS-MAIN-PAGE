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
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="auth-surface relative w-full max-w-[448px] overflow-hidden rounded-[28px] border border-slate-200/90 bg-white px-6 py-7 shadow-[0_22px_55px_rgba(15,23,42,0.12)] sm:px-8 sm:py-8 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#800000] via-[#800000] to-amber-500" />
        <div className="mb-5 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-700 ring-1 ring-slate-200/80">
            JPCS Academic Portal
          </div>
        </div>

        {/* Smooth Animated Toggle Tabs */}
        <div className="relative mb-8 flex h-11 items-center rounded-xl border border-slate-200 bg-slate-100/90 p-1">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`relative z-10 flex-1 min-w-0 h-full flex items-center justify-center text-xs font-bold tracking-wider uppercase transition-colors duration-200 cursor-pointer ${
              mode === "signin" ? "text-white font-extrabold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {mode === "signin" && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-[#800000] rounded-lg shadow-xs"
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              />
            )}
            <span className="relative z-10">SIGN IN</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("request")}
            className={`relative z-10 flex-1 min-w-0 h-full flex items-center justify-center text-xs font-bold tracking-wider uppercase transition-colors duration-200 cursor-pointer ${
              mode === "request" ? "text-white font-extrabold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {mode === "request" && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-[#800000] rounded-lg shadow-xs"
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              />
            )}
            <span className="relative z-10">REQUEST ACCOUNT</span>
          </button>
        </div>

        {/* Smooth Form Mode Switch Animation */}
        <AnimatePresence mode="wait" initial={false}>
          {mode === "signin" ? (
            <motion.div
              key="signin"
              initial={{ opacity: 0, x: -16, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: 16, filter: "blur(4px)" }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <LoginForm onSwitchToRequest={() => setMode("request")} />
            </motion.div>
          ) : (
            <motion.div
              key="request"
              initial={{ opacity: 0, x: 16, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -16, filter: "blur(4px)" }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <AccountRequestForm
                onSuccess={() => {
                  setShowSuccessModal(true);
                  setMode("signin");
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl border border-slate-100"
            >
              <div className="mx-auto size-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg mb-3">
                ✓
              </div>
              <h3 className="text-lg font-black text-slate-900">Request Submitted Successfully</h3>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                Your account request has been received. Once approved by the administrator, credentials will be sent to your email.
              </p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="mt-6 w-full py-3 bg-[#800000] hover:bg-[#660000] text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                Return to Sign In
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
