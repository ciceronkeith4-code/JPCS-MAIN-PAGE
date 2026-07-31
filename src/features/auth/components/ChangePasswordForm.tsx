import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Input } from "../../../app/components/ui";
import { changeUserPassword } from "../../../app/auth/auth";

export function ChangePasswordForm() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const hasMinLen = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isPasswordValid = hasMinLen && hasUpper && hasLower && hasNumber;
  const matches = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setError("Please ensure your new password meets all validation requirements.");
      return;
    }
    if (!matches) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await changeUserPassword(currentPassword, newPassword);
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Failed to change password. Please verify your current password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="text-center mb-4">
        <h2 className="text-xl font-bold text-slate-900">Change Password Required</h2>
        <p className="text-xs text-slate-500 mt-1">Please set a new password before continuing.</p>
      </header>

      {error && <Alert variant="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Current Password</label>
          <Input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 mb-1">New Password</label>
          <Input
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Confirm New Password</label>
          <Input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <Button type="submit" loading={loading} className="w-full h-11 bg-[#800000] text-white font-bold rounded-xl">
          Update Password
        </Button>
      </form>
    </div>
  );
}
