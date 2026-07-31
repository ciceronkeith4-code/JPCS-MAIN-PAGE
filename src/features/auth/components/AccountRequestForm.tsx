import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Input, Select } from "../../../app/components/ui";
import { AccountRequestService } from "../../../services/accountRequest.service";

interface AccountRequestFormProps {
  onSuccess: () => void;
}

export function AccountRequestForm({ onSuccess }: AccountRequestFormProps) {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [year, setYear] = useState("1st Year");
  const [studentNumber, setStudentNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showDuplicateEmailModal, setShowDuplicateEmailModal] = useState(false);
  const [showDuplicateStudentNumberModal, setShowDuplicateStudentNumberModal] = useState(false);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedNum = studentNumber.trim();

    if (!trimmedName || !normalizedEmail || !trimmedNum || !year) {
      setError("Please complete all required fields.");
      return;
    }

    setLoading(true);

    try {
      const emailExists = await AccountRequestService.checkExistingPendingEmail(normalizedEmail);
      if (emailExists) {
        setShowDuplicateEmailModal(true);
        setLoading(false);
        return;
      }

      const snExists = await AccountRequestService.checkExistingPendingStudentNumber(trimmedNum);
      if (snExists) {
        setShowDuplicateStudentNumberModal(true);
        setLoading(false);
        return;
      }

      await AccountRequestService.createAccountRequest({
        fullName: trimmedName,
        email: normalizedEmail,
        year,
        studentNumber: trimmedNum,
      });

      setFullName("");
      setEmail("");
      setStudentNumber("");
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Unable to submit request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <header className="mb-6 text-center">
        <h1 className="text-xl font-black tracking-tight text-slate-900 leading-snug">Create Student Account Request</h1>
        <p className="mt-2 text-xs text-slate-500 leading-relaxed px-2">
          Submit your information for review. Once approved by the administrator, you'll receive an email containing your login credentials.
        </p>
      </header>

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <form onSubmit={handleRequestSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">Full Name *</label>
          <Input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Juan Dela Cruz"
            disabled={loading}
            className="w-full h-12 rounded-xl focus:ring-[#800000]/20 focus:border-[#800000]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">Email Address *</label>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@sscrmnl.edu.ph"
            disabled={loading}
            className="w-full h-12 rounded-xl focus:ring-[#800000]/20 focus:border-[#800000]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
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
              disabled={loading}
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
              disabled={loading}
              className="w-full h-12 rounded-xl focus:ring-[#800000]/20 focus:border-[#800000]"
            />
          </div>
        </div>

        <div className="text-[10px] text-slate-400 mt-1 pl-1">
          Use your official SSCR Student Number.
        </div>

        <Button
          type="submit"
          loading={loading}
          className="mt-3 w-full h-14 rounded-2xl font-bold shadow-md bg-gradient-to-r from-[#660000] via-[#800000] to-[#b83239] hover:shadow-lg hover:-translate-y-0.5 active:scale-97 text-white transition-all duration-200 cursor-pointer"
        >
          Submit Request
        </Button>

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

      {/* Duplicate Modals */}
      {showDuplicateEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl border border-slate-100">
            <h3 className="text-base font-extrabold text-slate-900">Request Already Exists</h3>
            <p className="mt-2 text-xs text-slate-500">An account request using this email address has already been submitted.</p>
            <button
              onClick={() => setShowDuplicateEmailModal(false)}
              className="mt-4 w-full py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {showDuplicateStudentNumberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl border border-slate-100">
            <h3 className="text-base font-extrabold text-slate-900">Student Number Registered</h3>
            <p className="mt-2 text-xs text-slate-500">This student number already has an existing request or account.</p>
            <button
              onClick={() => setShowDuplicateStudentNumberModal(false)}
              className="mt-4 w-full py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
