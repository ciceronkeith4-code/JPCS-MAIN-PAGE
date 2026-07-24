import React, { useState, useEffect, useCallback } from "react";
import { Modal, Button, Input, Select, Badge, Alert } from "./ui";
import { parseGradeSheetImage, ScanResult, ScannedSubject } from "../utils/ocrScanner";
import { addSemester, addSubject, getSemesters } from "../store";

interface ImageOcrImportModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  targetSemesterId?: string;
  onSuccess?: () => void;
}

export function ImageOcrImportModal({
  open,
  onClose,
  userId,
  targetSemesterId,
  onSuccess,
}: ImageOcrImportModalProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scannedSubjects, setScannedSubjects] = useState<ScannedSubject[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("2024–2025");
  const [selectedSemester, setSelectedSemester] = useState("First Semester");
  const [isDragging, setIsDragging] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string>("");
  const [showRaw, setShowRaw] = useState(false);

  // ── Core image processor (shared by file picker, paste, and drag-drop) ──
  const processImageFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    setLoading(true);
    setProgress(10);
    setStatusText("Preparing image scanner...");

    try {
      const result = await parseGradeSheetImage(file, (prog, text) => {
        setProgress(prog);
        setStatusText(text);
      });
      setScanResult(result);
      setScannedSubjects(result.subjects);
      setRawText(result.rawText ?? "");
      setScanError(result.error ?? null);
      if (result.academic_year) setSelectedAcademicYear(result.academic_year);
      if (result.semester) setSelectedSemester(result.semester);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Unexpected scan error.");
      console.error("Scan error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Global paste listener: fires when modal is open and no image loaded ──
  useEffect(() => {
    if (!open || imagePreview) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) processImageFile(file);
          break;
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [open, imagePreview, processImageFile]);


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  const handleSubjectChange = (id: string, field: keyof ScannedSubject, value: any) => {
    setScannedSubjects((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleDeleteSubject = (id: string) => {
    setScannedSubjects((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddRow = () => {
    setScannedSubjects((prev) => [
      ...prev,
      {
        id: "custom_" + Math.random().toString(36).substring(2, 9),
        subject_code: "NEW101",
        subject_name: "NEW SUBJECT",
        units: 3,
        grade: 90,
        status: "Graded",
        instructor: "FACULTY NAME",
      },
    ]);
  };

  const handleImportAll = () => {
    if (scannedSubjects.length === 0) return;

    let semId = targetSemesterId;

    // If no specific target semester, find or create one
    if (!semId) {
      const userSemesters = getSemesters(userId);
      const existing = userSemesters.find(
        (s) => s.academic_year === selectedAcademicYear && s.semester === selectedSemester
      );

      if (existing) {
        semId = existing.id;
      } else {
        const newSem = addSemester({
          user_id: userId,
          academic_year: selectedAcademicYear,
          semester: selectedSemester,
        });
        semId = newSem.id;
      }
    }

    // Batch add all scanned subjects
    scannedSubjects.forEach((sub) => {
      addSubject({
        semester_id: semId!,
        subject_code: sub.subject_code,
        subject_name: sub.subject_name,
        units: Number(sub.units) || 3,
        grade: Number(sub.grade) || 0,
        status: sub.status,
      });
    });

    onSuccess?.();
    onClose();
    resetState();
  };

  const resetState = () => {
    setImagePreview(null);
    setScanResult(null);
    setScannedSubjects([]);
    setScanError(null);
    setRawText("");
    setShowRaw(false);
    setLoading(false);
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        resetState();
      }}
      title="📷 AI Grade Sheet Image Reader & Auto-Importer"
      size="lg"
    >
      <div className="p-6">
        <p className="text-xs text-muted-foreground mb-3">
          Upload any student portal grade screenshot. The system will automatically read every subject code, name, grades, and instructor using OCR.
        </p>
        {/* Tips for best results */}
        <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex gap-2 items-start">
          <span className="text-base shrink-0">💡</span>
          <span><strong>Tips for best accuracy:</strong> Use a <strong>full-screen, high-resolution</strong> screenshot. Avoid cropping, blurry, or low-contrast images. The grade table must be fully visible.</span>
        </div>

        {!imagePreview ? (
          <label
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all text-center ${
              isDragging
                ? "border-primary bg-primary/10 scale-[1.01]"
                : "border-border hover:border-primary/60 bg-muted/20 hover:bg-primary/5"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) processImageFile(file);
            }}
          >
            <div className="size-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
              <svg className="size-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-bold text-foreground">Click, drag, or paste a screenshot here</p>
            <p className="text-xs text-muted-foreground mt-1">Supports PNG, JPG — or press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">Ctrl+V</kbd> to paste directly from clipboard</p>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
        ) : (
          <div>
            {/* Image & Scanner Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="md:col-span-1 border border-border rounded-xl p-2 bg-white flex flex-col items-center justify-center">
                <img src={imagePreview} alt="Uploaded Grade Sheet" className="max-h-36 object-contain rounded-lg border border-border/40" />
                <button
                  type="button"
                  onClick={resetState}
                  className="text-xs text-primary font-semibold hover:underline mt-2"
                >
                  Change Image
                </button>
              </div>

              <div className="md:col-span-2 bg-muted/30 border border-border/60 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">Target Semester Cohort</span>
                    <Badge variant="success">Auto-Detected</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <Select
                      label="Academic Year"
                      value={selectedAcademicYear}
                      onChange={(e) => setSelectedAcademicYear(e.target.value)}
                      options={[
                        { value: "2023–2024", label: "2023–2024" },
                        { value: "2024–2025", label: "2024–2025" },
                        { value: "2025–2026", label: "2025–2026" },
                        { value: "2026–2027", label: "2026–2027" },
                      ]}
                    />
                    <Select
                      label="Semester"
                      value={selectedSemester}
                      onChange={(e) => setSelectedSemester(e.target.value)}
                      options={[
                        { value: "First Semester", label: "First Semester" },
                        { value: "Second Semester", label: "Second Semester" },
                        { value: "Summer", label: "Summer" },
                      ]}
                    />
                  </div>
                </div>

                {loading && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-primary">{statusText}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div className="bg-primary h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Extracted Subjects Editor Table */}
            {scannedSubjects.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Extracted Subjects ({scannedSubjects.length})
                  </h4>
                  <Button variant="outline" size="sm" onClick={handleAddRow}>
                    + Add Subject Row
                  </Button>
                </div>

                <div className="border border-border rounded-xl overflow-hidden mb-6 bg-white shadow-xs">
                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/40 text-left border-b border-border sticky top-0">
                        <tr>
                          <th className="px-3 py-2 font-semibold text-muted-foreground w-24">Code</th>
                          <th className="px-3 py-2 font-semibold text-muted-foreground">Subject Name</th>
                          <th className="px-3 py-2 font-semibold text-muted-foreground w-36">Faculty / Instructor</th>
                          <th className="px-3 py-2 font-semibold text-muted-foreground w-16 text-center">Units</th>
                          <th className="px-3 py-2 font-semibold text-muted-foreground w-20 text-center">Grade</th>
                          <th className="px-3 py-2 font-semibold text-muted-foreground w-28">Status</th>
                          <th className="px-3 py-2 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {scannedSubjects.map((s) => (
                          <tr key={s.id} className="hover:bg-muted/10">
                            <td className="p-2">
                              <input
                                type="text"
                                value={s.subject_code}
                                onChange={(e) => handleSubjectChange(s.id, "subject_code", e.target.value)}
                                className="w-full font-mono font-bold text-primary bg-transparent border border-border/60 rounded px-1.5 py-1 text-xs"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={s.subject_name}
                                onChange={(e) => handleSubjectChange(s.id, "subject_name", e.target.value)}
                                className="w-full font-medium text-foreground bg-transparent border border-border/60 rounded px-1.5 py-1 text-xs"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={s.instructor}
                                onChange={(e) => handleSubjectChange(s.id, "instructor", e.target.value)}
                                className="w-full text-muted-foreground bg-transparent border border-border/60 rounded px-1.5 py-1 text-xs"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                value={s.units}
                                onChange={(e) => handleSubjectChange(s.id, "units", parseInt(e.target.value) || 0)}
                                className="w-full text-center font-bold text-foreground bg-transparent border border-border/60 rounded px-1 py-1 text-xs"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.5"
                                value={s.grade}
                                onChange={(e) => handleSubjectChange(s.id, "grade", parseFloat(e.target.value) || 0)}
                                className="w-full text-center font-bold text-foreground bg-amber-50 border border-amber-300 rounded px-1 py-1 text-xs"
                              />
                            </td>
                            <td className="p-2">
                              <select
                                value={s.status}
                                onChange={(e) => handleSubjectChange(s.id, "status", e.target.value)}
                                className="w-full text-xs font-semibold bg-transparent border border-border/60 rounded px-1 py-1"
                              >
                                <option value="Graded">Graded</option>
                                <option value="Currently Taking">Taking</option>
                                <option value="Waiting">Waiting</option>
                              </select>
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteSubject(s.id)}
                                className="text-muted-foreground hover:text-destructive p-1"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => { onClose(); resetState(); }}>
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={handleImportAll}>
                    Import All {scannedSubjects.length} Subjects
                  </Button>
                </div>
              </div>
            )}

            {/* Error banner when scan finds nothing */}
            {!loading && scanError && scannedSubjects.length === 0 && (
              <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-base shrink-0">⚠️</span>
                  <div>
                    <p className="font-bold mb-1">No subjects detected</p>
                    <p>{scanError}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button type="button" onClick={handleAddRow} className="text-xs font-semibold text-primary hover:underline">
                    + Add subjects manually
                  </button>
                  <span className="text-red-300">·</span>
                  <button type="button" onClick={resetState} className="text-xs font-semibold text-red-700 hover:underline">
                    Try a different image
                  </button>
                </div>
              </div>
            )}

            {/* Raw OCR text viewer (debug / verification) */}
            {!loading && rawText && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowRaw((v) => !v)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <svg className={`size-3 transition-transform ${showRaw ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {showRaw ? "Hide" : "Show"} raw OCR text (for verification)
                </button>
                {showRaw && (
                  <pre className="mt-2 p-3 rounded-xl bg-muted/40 border border-border text-[10px] text-muted-foreground font-mono max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {rawText}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
