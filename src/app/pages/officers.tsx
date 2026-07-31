import React, { useState, useEffect } from "react";
import { PageHeader, EmptyState } from "../components/ui";
import { getAllUsers } from "../store";
import type { User } from "../../types";
import { OfficerPhoto } from "../public-site/components";

function OfficerPhotoCard({ officer, index }: { officer: User; index: number }) {
  const [showDetail, setShowDetail] = useState(false);

  // Fallbacks for demo officer (Keith)
  const isKeith = officer.full_name.includes("Keith");

  const defaultProfile = isKeith ? "/officers/keith_profile.png" : "";
  const defaultAction = isKeith ? "/officers/keith_action.png" : defaultProfile;

  const profileImg = officer.profile_photo || defaultProfile;
  const actionImg = officer.action_photo || defaultAction || profileImg;

  const getBadgeStyle = (pos: string) => {
    if (pos === "President") return "bg-amber-100 text-amber-955 border-amber-300";
    if (pos === "Vice - President") return "bg-amber-50 text-amber-900 border-amber-200";
    if (pos === "Secretary" || pos === "Treasurer" || pos === "Auditor") return "bg-rose-50 text-rose-900 border-rose-200";
    if (pos.includes("(HEAD)")) return "bg-sky-50 text-sky-900 border-sky-200";
    return "bg-slate-100 text-slate-800 border-slate-200";
  };

  const initials = officer.full_name
    ? officer.full_name.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "O";

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-lg hover:border-slate-300 transition-all duration-300 flex flex-col justify-between group">
        {/* Top Image Frame with Hover / Drag Animation */}
        <div className="relative w-full aspect-4/5 select-none">
          {/* Rank Number Badge #1, #2 */}
          <div className="absolute top-3 left-3 z-30 size-8 rounded-full bg-slate-950/80 backdrop-blur-xs text-white text-xs font-black flex items-center justify-center shadow-xs">
            #{index + 1}
          </div>

          <OfficerPhoto
            name={officer.full_name}
            role={officer.officer_position || "Officer"}
            profilePhoto={profileImg || undefined}
            actionPhoto={actionImg || undefined}
            index={index}
          />
        </div>

        {/* Card Content Footer */}
        <div className="p-5 space-y-3 flex-1 flex flex-col justify-between bg-white">
          <div>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border mb-2 ${getBadgeStyle(officer.officer_position || "")}`}>
              {officer.officer_position || "JPCS Officer"}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-base font-extrabold text-slate-900 leading-snug">{officer.full_name}</h3>
              {officer.verified && (
                <span className="text-xs bg-green-100 text-green-800 font-black px-1.5 py-0.5 rounded border border-green-200">Verified</span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              San Sebastian College Recoletos-Manila
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="bg-sky-50 text-sky-800 px-2.5 py-1 rounded-md border border-sky-200 font-bold">
                {officer.course} · Year {officer.year_level || "1"}
              </span>
              <span className="text-slate-400 font-mono text-[11px]">{officer.student_number}</span>
            </div>

            <button
              onClick={() => setShowDetail(true)}
              className="w-full text-center py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors"
            >
              View Profile
            </button>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowDetail(false)} />
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">Officer Profile Details</h3>
              <button onClick={() => setShowDetail(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-full border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                  {profileImg ? (
                    <img src={profileImg} alt={officer.full_name} className="size-full object-cover" />
                  ) : (
                    <span className="text-slate-500 font-bold text-lg">{initials}</span>
                  )}
                </div>
                <div>
                  <h4 className="font-black text-slate-950 text-lg leading-tight flex items-center gap-1.5">
                    {officer.full_name}
                    {officer.verified && (
                      <span className="text-xs bg-green-100 text-green-800 font-extrabold px-1.5 py-0.2 rounded border border-green-200">✓ Verified</span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-500 font-bold mt-1 text-primary">{officer.officer_position}</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="font-medium text-slate-400">Student Number:</span>
                  <span className="font-bold text-slate-800">{officer.student_number || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-400">Email:</span>
                  <span className="font-bold text-slate-800">{officer.email || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-400">Program / Course:</span>
                  <span className="font-bold text-slate-800">{officer.course || "BSIT"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-400">Year Level:</span>
                  <span className="font-bold text-slate-800">{officer.year_level || "1"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-400">Department:</span>
                  <span className="font-bold text-slate-800">{officer.department || "IT Department"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-400">Campus:</span>
                  <span className="font-bold text-slate-800">Manila Campus</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowDetail(false)}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-lg border border-slate-200 transition-colors"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function OfficersPage({ user }: { user: User }) {
  const [allUsers, setAllUsers] = useState(() => getAllUsers());

  useEffect(() => {
    const syncUsers = () => setAllUsers(getAllUsers());
    window.addEventListener("sscr_store_synced", syncUsers);
    window.addEventListener("focus", syncUsers);
    return () => {
      window.removeEventListener("sscr_store_synced", syncUsers);
      window.removeEventListener("focus", syncUsers);
    };
  }, []);

  // Filter all active JPCS officers
  const officers = allUsers.filter(
    (u) => u.officer_position && u.officer_position !== "None" && u.officer_position !== ""
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="JPCS Officers Directory"
        subtitle="Official San Sebastian College - Recoletos Junior Philippine Computer Society Officer Roster."
      />

      {officers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {officers.map((officer, index) => (
            <OfficerPhotoCard key={officer.id} officer={officer} index={index} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <EmptyState
            title="No JPCS Officers Assigned Yet"
            description="The Admin has not marked any student as a JPCS Officer yet. Ask the administrator to assign officer positions in Student & Officer Management."
          />
        </div>
      )}
    </div>
  );
}
