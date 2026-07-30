import { createWorker } from "tesseract.js";

export interface ScannedSubject {
  id: string;
  subject_code: string;
  subject_name: string;
  units: number;
  grade: number;
  status: "Graded" | "Currently Taking" | "Waiting";
  instructor: string;
}

export interface ScanResult {
  academic_year: string;
  semester: string;
  subjects: ScannedSubject[];
  rawText: string;
  error?: string;
}

// ── Known Subject Mappings ────────────────────────────────────────────────────
const KNOWN_SUBJECTS: Record<string, { name: string; units: number }> = {
  // BSIT Core
  ITE101: { name: "INTRODUCTION TO COMPUTING", units: 3 },
  ITE102: { name: "PROGRAM LOGIC FORMULATION AND COMPUTER PROGRAMMING 1", units: 3 },
  ITE103: { name: "DATA STRUCTURES AND ALGORITHMS", units: 3 },
  ITE104: { name: "OBJECT-ORIENTED PROGRAMMING", units: 3 },
  ITE105: { name: "WEB DEVELOPMENT", units: 3 },
  ITE201: { name: "DATABASE MANAGEMENT SYSTEMS", units: 3 },
  ITE202: { name: "OPERATING SYSTEMS", units: 3 },
  ITE203: { name: "COMPUTER NETWORKS", units: 3 },
  ITE204: { name: "SOFTWARE ENGINEERING", units: 3 },
  ITE301: { name: "SYSTEM ANALYSIS AND DESIGN", units: 3 },
  ITE302: { name: "MOBILE PROGRAMMING", units: 3 },
  ITE303: { name: "INFORMATION ASSURANCE AND SECURITY", units: 3 },
  ITE401: { name: "CAPSTONE PROJECT 1", units: 3 },
  ITE402: { name: "CAPSTONE PROJECT 2", units: 3 },
  ITE403: { name: "ON-THE-JOB TRAINING", units: 6 },
  // ITP / GEE / REL / PHE codes (seen in student portal screenshots)
  ITP113: { name: "FUNDAMENTALS INFORMATION ASSURANCE AND SECURITY", units: 3 },
  ITP114: { name: "ADVANCED INFORMATION ASSURANCE AND SECURITY", units: 3 },
  ITP115: { name: "SYSTEM ANALYSIS AND DESIGN WITH PROJECT MANAGEMENT", units: 3 },
  ITP116: { name: "ADVANCED DATABASE MANAGEMENT SYSTEM", units: 3 },
  ITP120: { name: "DATA COMMUNICATION AND NETWORKING 2", units: 3 },
  ITP121: { name: "PLATFORM TECHNOLOGIES", units: 3 },
  ITP133: { name: "SOFTWARE ENGINEERING", units: 3 },
  GEE105: { name: "ACCOUNTING TECHNOLOGY", units: 3 },
  REL201: { name: "CHRISTIAN MORALITY", units: 3 },
  REL301: { name: "MYSTERIES OF CHRISTIAN FAITH", units: 3 },
  PHE401: { name: "PHYSICAL ACTIVITY TOWARDS HEALTH AND FITNESS II : GAMES AND SPORTS", units: 2 },
  // GEC
  GEC101: { name: "UNDERSTANDING THE SELF", units: 3 },
  GEC102: { name: "READINGS IN PHILIPPINE HISTORY", units: 3 },
  GEC103: { name: "THE CONTEMPORARY WORLD", units: 3 },
  GEC104: { name: "ETHICS", units: 3 },
  GEC105: { name: "MATHEMATICS IN THE MODERN WORLD", units: 3 },
  GEC106: { name: "ART APPRECIATION", units: 3 },
  GEC107: { name: "SCIENCE, TECHNOLOGY, AND SOCIETY", units: 3 },
  GEC108: { name: "ETHICS", units: 3 },
  GEC109: { name: "LIFE AND WORKS OF RIZAL", units: 3 },
  GEC110: { name: "ART APPRECIATION", units: 3 },
  GEC111: { name: "THE ENTREPRENEURIAL MIND", units: 3 },
  // Others
  MRC101: { name: "LIFE AND WORKS OF RIZAL", units: 3 },
  CWTS1: { name: "CIVIC WELFARE TRAINING SERVICE 1", units: 3 },
  CWTS2: { name: "CIVIC WELFARE TRAINING SERVICE 2", units: 3 },
  PHE101: { name: "MOVEMENT ENHANCEMENT", units: 2 },
  PHETC1: { name: "MOVEMENT ENHANCEMENT", units: 2 },
  PHE102: { name: "FITNESS EXERCISES", units: 2 },
  PHE103: { name: "TEAM SPORTS", units: 2 },
  PHE104: { name: "INDIVIDUAL AND DUAL SPORTS", units: 2 },
  SSC101: { name: "SEBASTINIAN IDENTITY", units: 3 },
  IPE1: { name: "PROFESSIONAL ELECTIVE 1", units: 3 },
  IPE2: { name: "PROFESSIONAL ELECTIVE 2", units: 3 },
  IPE3: { name: "PROFESSIONAL ELECTIVE 3", units: 3 },
  GEC170: { name: "ART APPRECIATION", units: 3 },
  MATH101: { name: "COLLEGE ALGEBRA", units: 3 },
  MATH102: { name: "CALCULUS 1", units: 3 },
  MATH103: { name: "DISCRETE MATHEMATICS", units: 3 },
};

// ── Image Preprocessing ────────────────────────────────────────────────────────
async function preprocessImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // Scale up image to ~2000px width for optimal OCR resolution
      const scale = Math.max(1, Math.min(2400 / img.width, 2.5));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(url); return; }

      // Smooth upscaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Soft grayscale + moderate contrast enhancement (no hard binarization)
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        // Moderate contrast (factor 1.25) around midpoint 128
        const contrast = 1.25;
        const val = Math.min(255, Math.max(0, contrast * (gray - 128) + 128));
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }

      ctx.putImageData(imageData, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(url); };
    img.src = url;
  });
}

// ── Term detection ─────────────────────────────────────────────────────────────
function detectTermInfo(lines: string[]): { year: string; semester: string } {
  let year = "";
  let semester = "First Semester";
  for (const line of lines) {
    if (/semester|term|S\.?Y\.?/i.test(line)) {
      const m = line.match(/(\d{4})\s*[-–—]\s*(\d{4})/);
      if (m) year = `${m[1]}–${m[2]}`;
      if (/1st|first/i.test(line)) semester = "First Semester";
      else if (/2nd|second/i.test(line)) semester = "Second Semester";
      else if (/summer/i.test(line)) semester = "Summer";
      if (year) break;
    }
    if (!year) {
      const m = line.match(/(\d{4})\s*[-–—]\s*(\d{4})/);
      if (m) year = `${m[1]}–${m[2]}`;
    }
  }
  if (!year) {
    const now = new Date();
    const calYear = now.getFullYear();
    const month = now.getMonth() + 1;
    const ayStart = month >= 8 ? calYear : calYear - 1;
    year = `${ayStart}–${ayStart + 1}`;
  }
  return { year, semester };
}

// ── Extract standalone grade numbers from a string ────────────────────────────
// Grade numbers: 0–100, including decimals. They appear as standalone tokens.
// We explicitly exclude numbers embedded inside word-like strings (e.g. "ITP114").
function extractGradeNumbers(text: string): number[] {
  // Match numbers that are surrounded by spaces/start/end — not attached to letters
  const tokens = text.split(/\s+/);
  const grades: number[] = [];
  for (const token of tokens) {
    // Pure number token (integer or decimal)
    if (/^\d{1,3}(\.\d{1,2})?$/.test(token)) {
      const val = parseFloat(token);
      if (val >= 0 && val <= 100) {
        grades.push(val);
      }
    }
  }
  return grades;
}

// ── Subject code pattern ───────────────────────────────────────────────────────
// Matches: MRC101, REL301, ITP114, ITP121, ITP133, IPE2, IPE1, GEC101, PHE101
// Also special codes like "IT TRACK 1" or "IT TRACK1"
const SUBJECT_CODE_RE = /\b([A-Z]{2,6}\d{1,3}[A-Z]?\d?)\b/g;
// Special multi-word codes
const SPECIAL_CODE_RE = /\b(IT\s+TRACK\s*\d+|CS\s+ELECTIVE\s*\d*|PE\s+\d+)\b/gi;

function findSubjectCode(text: string): { code: string; index: number; length: number } | null {
  // Try special codes first
  const specials = [...text.matchAll(SPECIAL_CODE_RE)];
  if (specials.length > 0) {
    const m = specials[0];
    return { code: m[0].trim().toUpperCase(), index: m.index!, length: m[0].length };
  }
  // Try known codes first (exact match)
  for (const known of Object.keys(KNOWN_SUBJECTS)) {
    const idx = text.toUpperCase().indexOf(known);
    if (idx >= 0) {
      return { code: known, index: idx, length: known.length };
    }
  }
  // General pattern
  SUBJECT_CODE_RE.lastIndex = 0;
  const matches = [...text.matchAll(SUBJECT_CODE_RE)];
  if (matches.length === 0) return null;
  const m = matches[0];
  return { code: m[1].toUpperCase(), index: m.index!, length: m[0].length };
}

// ── STUDENT GRADES table parser ───────────────────────────────────────────────
// Format: ROW | Faculty Name | Subject No | Subject | Prelim | Mid-Term | Pre-Final | Final
function parseStudentGradesTable(text: string): ScannedSubject[] {
  const lines = text.split("\n").map((l) => l.replace(/\s{2,}/g, " ").trim()).filter(Boolean);
  const subjects: ScannedSubject[] = [];
  const seenCodes = new Set<string>();

  // Find header row (contains ROW or Faculty)
  const headerIdx = lines.findIndex((l) =>
    /\bROW\b/i.test(l) ||
    (/faculty/i.test(l) && /subject/i.test(l)) ||
    (/prelim/i.test(l) && /final/i.test(l))
  );
  const dataStart = headerIdx >= 0 ? headerIdx + 1 : 0;

  for (let i = dataStart; i < lines.length; i++) {
    const line = lines[i];

    // Skip column header lines and empty lines
    if (/\bprelim\b|\bmid.term\b|\bpre.final\b|\bfinal\b/i.test(line)) continue;
    if (/^student grades$/i.test(line)) continue;

    // Must be a data row (either starting with a row number or containing a subject code)
    const hasRowNumber = /^\d{1,2}\s+/.test(line);
    const codeResult = findSubjectCode(line);
    if (!hasRowNumber && !codeResult) continue;

    // Tokenize line and find all numbers matching grade patterns (0-100)
    // Table columns: [ROW] [Faculty] [Subject No] [Subject Title] [Prelim] [Mid-Term] [Pre-Final] [Final]
    const lineNumbers = line.match(/\b\d{1,3}(?:\.\d{1,2})?\b/g);
    let gradeTokens: number[] = [];

    if (lineNumbers) {
      // Exclude the first number if it's the ROW number (e.g. 1, 2, 3...)
      const candidateNums = (hasRowNumber ? lineNumbers.slice(1) : lineNumbers).map(Number).filter((n) => n >= 0 && n <= 100);
      gradeTokens = candidateNums;
    }

    // Column order in portal: [Prelim (Col 1), Mid-Term (Col 2), Pre-Final (Col 3), Final (Col 4)]
    // We strictly record the Final grade (4th column / rightmost valid grade).
    let finalGrade = 0;
    if (gradeTokens.length >= 4) {
      finalGrade = gradeTokens[3]; // 4th column = Final Grade
    } else if (gradeTokens.length > 0) {
      finalGrade = gradeTokens[gradeTokens.length - 1]; // Rightmost column = Final Grade
    }

    if (!codeResult) continue;

    let { code, index: codeIdx, length: codeLen } = codeResult;

    // OCR Code Normalization for common misreads (e.g., ITEC2 -> ITE102, PHET01 -> PHE101)
    if (code === "ITEC2" || code === "ITE1O2") code = "ITE102";
    if (code === "PHET01" || code === "PHE1O1" || code === "PHETC1") code = "PHE101";
    if (code === "GEC1O5") code = "GEC105";

    const normalizedCode = code.replace(/\s+/g, "");

    // Faculty name = text before code (excluding row number)
    const facultyRaw = line.slice(0, codeIdx).replace(/^\d+\s*/, "").trim();
    const instructor = facultyRaw || "Faculty Instructor";

    // Subject name extraction: read actual text after subject code in the line up to the grade numbers
    let afterCode = line.slice(codeIdx + codeLen);
    // Strip trailing numbers (grades) and excess symbols
    let rawSubjectName = afterCode.replace(/[\d.\s,|-]+$/, "").replace(/^[\s,|-]+/, "").trim().toUpperCase();

    const known = KNOWN_SUBJECTS[code] ?? KNOWN_SUBJECTS[normalizedCode];
    // If OCR scanned a valid subject title (at least 3 characters and not purely digits), use the EXACT scanned title.
    // Only fall back to dictionary if scanned title is completely missing or unreadable.
    let subjectName = rawSubjectName;
    if (!subjectName || subjectName.length < 3 || /^\d+$/.test(subjectName)) {
      subjectName = known?.name ?? code;
    }
    const units = known?.units ?? 3;

    if (seenCodes.has(code)) continue;
    seenCodes.add(code);

    subjects.push({
      id: "scan_" + Math.random().toString(36).substring(2, 9),
      subject_code: code,
      subject_name: subjectName,
      units,
      grade: finalGrade,
      status: "Graded",
      instructor,
    });
  }

  return subjects;
}

// ── Fallback: generic subject-code-anchored parser ────────────────────────────
function parseGeneric(text: string): ScannedSubject[] {
  const lines = text.split("\n").map((l) => l.replace(/\s{2,}/g, " ").trim()).filter(Boolean);
  const subjects: ScannedSubject[] = [];
  const seenCodes = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\bprelim\b|\bmid.term\b|\bpre.final\b|\bfinal\b/i.test(line)) continue;

    const codeResult = findSubjectCode(line);
    if (!codeResult) continue;

    const { code, index: codeIdx, length: codeLen } = codeResult;
    if (seenCodes.has(code)) continue;

    // Get numbers AFTER the subject code position
    const afterCode = line.slice(codeIdx + codeLen);
    const gradeNums = extractGradeNumbers(afterCode);

    // Take 4th (Final) or last
    let finalGrade = 0;
    if (gradeNums.length >= 4) finalGrade = gradeNums[3];
    else if (gradeNums.length > 0) finalGrade = gradeNums[gradeNums.length - 1];

    const known = KNOWN_SUBJECTS[code];
    let subjectName = afterCode.replace(/[\d.\s]+$/, "").trim().toUpperCase();
    if (!subjectName || subjectName.length < 3) subjectName = known?.name ?? code;
    const units = known?.units ?? 3;

    const instructor = line.slice(0, codeIdx).match(/([A-Z][A-Z\s,'-]+)/)?.[1]?.trim() ?? "Faculty Instructor";

    seenCodes.add(code);
    subjects.push({
      id: "scan_" + Math.random().toString(36).substring(2, 9),
      subject_code: code,
      subject_name: subjectName,
      units,
      grade: finalGrade,
      status: "Graded",
      instructor,
    });
  }
  return subjects;
}

// ── Main exported function ─────────────────────────────────────────────────────
export async function parseGradeSheetImage(
  imageFile: File | string,
  onProgress?: (progress: number, status: string) => void
): Promise<ScanResult> {
  let text = "";
  let error: string | undefined;

  try {
    onProgress?.(5, "Initializing dual-pass OCR engine...");
    
    // Pass 1: Scan original image directly (prevents resolution loss on crisp portal screenshots)
    const worker1 = await createWorker("eng", 1);
    onProgress?.(25, "Pass 1: Scanning original screenshot...");
    const ret1 = await worker1.recognize(imageFile);
    const text1 = ret1.data.text;
    await worker1.terminate();

    let text2 = "";
    if (imageFile instanceof File) {
      try {
        onProgress?.(50, "Pass 2: Scanning contrast-enhanced image...");
        const preprocessed = await preprocessImage(imageFile);
        const res = await fetch(preprocessed);
        const blob = await res.blob();
        const input2 = new File([blob], "preprocessed.png", { type: "image/png" });

        const worker2 = await createWorker("eng", 1);
        const ret2 = await worker2.recognize(input2);
        text2 = ret2.data.text;
        await worker2.terminate();
      } catch (err) {
        console.warn("Pass 2 preprocessing skipped:", err);
      }
    }

    // Evaluate both OCR text outputs and choose the one that extracted more valid subjects
    const subjects1 = parseStudentGradesTable(text1).concat(parseGeneric(text1));
    const subjects2 = text2 ? parseStudentGradesTable(text2).concat(parseGeneric(text2)) : [];

    // Use whichever pass found more subjects
    text = subjects2.length > subjects1.length ? text2 : text1;

    onProgress?.(85, "Structuring extracted grade records...");
  } catch (err) {
    console.error("OCR engine error:", err);
    error = err instanceof Error ? err.message : "OCR engine failed to start.";
  }

  if (!text.trim()) {
    onProgress?.(100, "No text detected.");
    return {
      academic_year: "",
      semester: "First Semester",
      subjects: [],
      rawText: "",
      error: error ?? "No text could be read from this image. Please use a clearer, full-screen screenshot.",
    };
  }

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const { year, semester } = detectTermInfo(lines);

  // Strategy 1: STUDENT GRADES table format (row-number anchored)
  let subjects = parseStudentGradesTable(text);

  // Strategy 2: Fallback generic parser
  if (subjects.length === 0) {
    subjects = parseGeneric(text);
  }

  const found = subjects.length;
  onProgress?.(
    100,
    found > 0
      ? `✅ Found ${found} subject${found > 1 ? "s" : ""}!`
      : "⚠️ No subjects detected — please check image clarity."
  );

  return {
    academic_year: year,
    semester,
    subjects,
    rawText: text,
    error:
      found === 0
        ? "No subjects were detected. Ensure the grade table is fully visible, well-lit, and not blurry."
        : undefined,
  };
}
