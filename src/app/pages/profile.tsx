import React, { useEffect, useState } from "react";
import { Card, Button, Input, Select, PageHeader, Alert } from "../components/ui";
import { StorageService } from "../../services/storage.service";
import { ProfileService } from "../../services/profile.service";
import type { User } from "../../types";

const COURSES = [
  { value: "BSIT", label: "BS Information Technology" },
];

const YEAR_LEVELS = [
  { value: "1", label: "1st Year" },
  { value: "2", label: "2nd Year" },
  { value: "3", label: "3rd Year" },
  { value: "4", label: "4th Year" },
  { value: "5", label: "5th Year" },
];

export function ProfilePage({ user, onUpdate }: { user: User; onUpdate: (u: User) => void }) {
  // Account Form State
  const [pForm, setPForm] = useState({
    full_name: user.full_name,
    student_number: user.student_number,
    course: user.course,
    year_level: user.year_level,
    email: user.email,
  });
  const [pSuccess, setPSuccess] = useState(false);
  const [pError, setPError] = useState("");
  const [pLoading, setPLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    setPForm({
      full_name: user.full_name,
      student_number: user.student_number,
      course: user.course,
      year_level: user.year_level,
      email: user.email,
    });
  }, [user]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPError("");
    setPSuccess(false);
    setPLoading(true);
    try {
      const result = await ProfileService.updateCurrent({
        full_name: pForm.full_name,
        student_number: pForm.student_number,
        course: pForm.course,
        year_level: pForm.year_level,
      });
      if (!result.success || !result.data) throw new Error(result.error || "Profile update failed.");

      onUpdate(result.data);
      setPSuccess(true);
      setTimeout(() => setPSuccess(false), 3000);
    } catch (err: any) {
      console.error("Profile update failed", err);
      setPError(err?.message || "Failed to save profile changes.");
    } finally {
      setPLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");

    try {
      // Upload first so a failed upload never removes the current avatar.
      const uploadRes = await StorageService.uploadAvatar(file, user.id);
      if (uploadRes.success && uploadRes.data) {
        const result = await ProfileService.updateCurrent({
          full_name: user.full_name,
          student_number: user.student_number,
          course: user.course,
          year_level: user.year_level,
          profile_photo: uploadRes.data,
        });
        if (!result.success || !result.data) {
          await StorageService.deleteAvatar(uploadRes.data);
          throw new Error(result.error || "Profile photo could not be saved.");
        }
        onUpdate(result.data);
      } else {
        setUploadError(uploadRes.error || "Upload failed");
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to process image");
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!user.profile_photo || !window.confirm("Remove your profile photo?")) return;

    const previousPhoto = user.profile_photo;
    setRemovingPhoto(true);
    setUploadError("");

    try {
      const result = await ProfileService.updateCurrent({
        full_name: user.full_name,
        student_number: user.student_number,
        course: user.course,
        year_level: user.year_level,
        profile_photo: "",
      });
      if (!result.success || !result.data) {
        throw new Error(result.error || "Profile photo could not be removed.");
      }

      onUpdate(result.data);

      const deleteResult = await StorageService.deleteAvatar(previousPhoto);
      if (!deleteResult.success) {
        setUploadError("The photo was removed from your profile, but its stored file could not be deleted.");
      }
    } catch (err: any) {
      setUploadError(err?.message || "Failed to remove profile photo.");
    } finally {
      setRemovingPhoto(false);
    }
  };

  const fullName = user?.full_name || "User";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";
  const isAdmin = user?.role === "admin";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="p-6 bg-white border border-slate-200 rounded-xl shadow-2xs">
        {/* Profile Header & Avatar Upload */}
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100">
          <div className="relative size-24 shrink-0">
            <div className="size-full rounded-full bg-primary/10 border border-slate-200 flex items-center justify-center text-primary font-bold overflow-hidden shadow-2xs">
              {user.profile_photo ? (
                <img
                  src={user.profile_photo}
                  alt={user.full_name}
                  className="block size-full min-w-full object-cover object-center"
                />
              ) : (
                <span className="text-2xl font-black">{initials}</span>
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-primary hover:bg-primary-hover text-white p-2 rounded-full cursor-pointer shadow-md transition-colors flex items-center justify-center border border-white" title="Upload Photo">
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          </div>
          <div className="text-center sm:text-left space-y-1">
            <h2 className="text-xl font-bold text-slate-900">{user.full_name}</h2>
            <p className="text-sm text-slate-500">{user.email}</p>
            {uploading && <p className="text-xs text-slate-500 animate-pulse mt-1">Uploading and compressing photo...</p>}
            {user.profile_photo && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={removingPhoto}
                disabled={uploading}
                onClick={handleAvatarRemove}
                className="mt-2 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
              >
                Remove photo
              </Button>
            )}
            {uploadError && <Alert variant="error" className="text-left text-[11px] mt-1">{uploadError}</Alert>}
          </div>
        </div>

        {/* Account details */}
        <div className="space-y-8 pt-6">
          {/* Account Details Form */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Account Information</h3>
            <form onSubmit={handleProfileSave} className="space-y-4">
              {pSuccess && <Alert variant="success">Profile details saved successfully.</Alert>}
              {pError && <Alert variant="error">{pError}</Alert>}
              <Input label="Full Name" value={pForm.full_name} onChange={(e) => setPForm((f) => ({ ...f, full_name: e.target.value }))} />
              {!isAdmin && (
                <>
                  <Input label="Student Number" value={pForm.student_number} onChange={(e) => setPForm((f) => ({ ...f, student_number: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-4">
                    <Select label="Course" value={pForm.course} onChange={(e) => setPForm((f) => ({ ...f, course: e.target.value }))} options={COURSES} />
                    <Select label="Year Level" value={pForm.year_level} onChange={(e) => setPForm((f) => ({ ...f, year_level: e.target.value }))} options={YEAR_LEVELS} />
                  </div>
                </>
              )}
              <Input label="Email Address" type="email" value={pForm.email} readOnly />
              <div className="flex justify-end pt-2">
                <Button type="submit" loading={pLoading}>Save Changes</Button>
              </div>
            </form>
          </div>

        </div>
      </Card>
    </div>
  );
}
