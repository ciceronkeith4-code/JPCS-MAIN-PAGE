import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();

export const checkAccountApproval = onCall(async (request) => {
  const { email } = request.data || {};
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new HttpsError("invalid-argument", "Valid email address is required.");
  }

  const auth = getAuth();
  const db = getFirestore();

  try {
    const userRecord = await auth.getUserByEmail(normalizedEmail);
    if (userRecord.disabled) {
      return { approved: false, reason: "disabled" };
    }

    const userDoc = await db.collection("users").doc(userRecord.uid).get();
    if (!userDoc.exists) {
      return { approved: false, reason: "no_profile" };
    }

    const userData = userDoc.data() || {};
    if (userData.status !== "active") {
      return { approved: false, reason: "inactive_profile" };
    }

    return { approved: true };
  } catch (err: any) {
    if (err.code === "auth/user-not-found") {
      return { approved: false, reason: "not_found" };
    }
    throw new HttpsError("internal", "Unable to verify account status.");
  }
});

export const submitAccountRequest = onCall(async (request) => {
  const { fullName, email, year, studentNumber } = request.data || {};

  const normalizedFullName = typeof fullName === "string" ? fullName.trim() : "";
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const selectedYear = typeof year === "string" ? year.trim() : "";
  const normalizedStudentNumber = typeof studentNumber === "string" ? studentNumber.trim() : "";

  if (
    !normalizedFullName ||
    normalizedFullName.length < 2 ||
    !normalizedEmail ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    !selectedYear ||
    !normalizedStudentNumber
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Valid full name, email, year level, and student number are required.",
    );
  }

  const auth = getAuth();
  const db = getFirestore();

  // 1. Check for existing pending request with same email
  const pendingEmailSnap = await db
    .collection("accountRequests")
    .where("email", "==", normalizedEmail)
    .where("status", "==", "pending")
    .limit(1)
    .get();

  if (!pendingEmailSnap.empty) {
    throw new HttpsError(
      "already-exists",
      "An account request for this email address is already pending review.",
    );
  }

  // 2. Check for existing pending request with same student number
  const pendingStudentNumSnap = await db
    .collection("accountRequests")
    .where("studentNumber", "==", normalizedStudentNumber)
    .where("status", "==", "pending")
    .limit(1)
    .get();

  if (!pendingStudentNumSnap.empty) {
    throw new HttpsError(
      "already-exists",
      "An account request for this student number is already pending review.",
    );
  }

  // 3. Check if email already has a Firebase Authentication account
  try {
    const existingUser = await auth.getUserByEmail(normalizedEmail);
    if (existingUser) {
      throw new HttpsError(
        "already-exists",
        "An account with this email address already exists.",
      );
    }
  } catch (err: any) {
    if (err.code !== "auth/user-not-found") {
      if (err instanceof HttpsError) throw err;
      throw new HttpsError("internal", "Unable to verify email availability.");
    }
  }

  // 4. Check if Firestore user profile already uses the same student number
  const profileSnap = await db
    .collection("users")
    .where("studentNumber", "==", normalizedStudentNumber)
    .limit(1)
    .get();

  if (!profileSnap.empty) {
    throw new HttpsError(
      "already-exists",
      "A user account with this student number already exists.",
    );
  }

  const newDocRef = db.collection("accountRequests").doc();
  const requestId = newDocRef.id;

  await newDocRef.set({
    requestId,
    fullName: normalizedFullName,
    email: normalizedEmail,
    year: selectedYear,
    studentNumber: normalizedStudentNumber,
    status: "pending",
    submittedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    createdUserUid: null,
  });

  return {
    success: true,
    requestId,
    message: "Your account request has been submitted successfully. Please wait for an administrator to review and approve your request.",
  };
});

export const approveAccountRequest = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }
  if (request.auth.token.admin !== true || request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Administrator access is required.");
  }

  const { requestId } = request.data || {};
  if (!requestId || typeof requestId !== "string") {
    throw new HttpsError("invalid-argument", "Valid request ID is required.");
  }

  const auth = getAuth();
  const db = getFirestore();

  const reqRef = db.collection("accountRequests").doc(requestId);
  const reqSnap = await reqRef.get();

  if (!reqSnap.exists) {
    throw new HttpsError("not-found", "Account request was not found.");
  }

  const reqData = reqSnap.data() || {};
  if (reqData.status !== "pending") {
    throw new HttpsError("failed-precondition", `This request has already been ${reqData.status}.`);
  }

  const { fullName, email, year, studentNumber } = reqData;
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const trimmedName = typeof fullName === "string" ? fullName.trim() : "";
  const trimmedStudentNumber = typeof studentNumber === "string" ? studentNumber.trim() : "";
  const selectedYear = typeof year === "string" ? year.trim() : "1st Year";

  if (!normalizedEmail || !trimmedName || !trimmedStudentNumber) {
    throw new HttpsError("invalid-argument", "Account request contains invalid student data.");
  }

  // Check if Auth account already exists
  try {
    const existingUser = await auth.getUserByEmail(normalizedEmail);
    if (existingUser) {
      throw new HttpsError("already-exists", "An Authentication account already exists for this email.");
    }
  } catch (err: any) {
    if (err.code !== "auth/user-not-found") {
      if (err instanceof HttpsError) throw err;
    }
  }

  let createdUser;
  try {
    createdUser = await auth.createUser({
      email: normalizedEmail,
      password: "gobaste123",
      displayName: trimmedName,
      emailVerified: true,
      disabled: false,
    });

    await auth.setCustomUserClaims(createdUser.uid, {
      role: "student",
      student: true,
    });

    const now = new Date().toISOString();
    await db.collection("users").doc(createdUser.uid).set({
      id: createdUser.uid,
      uid: createdUser.uid,
      full_name: trimmedName,
      fullName: trimmedName,
      email: normalizedEmail,
      year: selectedYear,
      year_level: selectedYear.replace(/[^0-9]/g, "") || "1",
      studentNumber: trimmedStudentNumber,
      student_number: trimmedStudentNumber,
      course: "BSIT",
      role: "student",
      status: "active",
      mustChangePassword: true,
      createdBy: request.auth.uid,
      approvedRequestId: requestId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      created_at: now,
      updated_at: now,
      lastLoginAt: null,
    });

    await reqRef.update({
      status: "approved",
      reviewedAt: FieldValue.serverTimestamp(),
      reviewedBy: request.auth.uid,
      updatedAt: FieldValue.serverTimestamp(),
      createdUserUid: createdUser.uid,
      rejectionReason: null,
    });

    return {
      success: true,
      uid: createdUser.uid,
    };
  } catch (error: any) {
    if (createdUser?.uid) {
      await auth.deleteUser(createdUser.uid).catch(() => undefined);
      await db.collection("users").doc(createdUser.uid).delete().catch(() => undefined);
    }
    throw new HttpsError(
      "internal",
      error?.message || "Failed to approve account request.",
    );
  }
});

export const rejectAccountRequest = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }
  if (request.auth.token.admin !== true || request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Administrator access is required.");
  }

  const { requestId, rejectionReason } = request.data || {};
  const trimmedReason = typeof rejectionReason === "string" ? rejectionReason.trim() : "";

  if (!requestId || typeof requestId !== "string" || !trimmedReason) {
    throw new HttpsError("invalid-argument", "Valid request ID and rejection reason are required.");
  }

  const db = getFirestore();
  const reqRef = db.collection("accountRequests").doc(requestId);
  const reqSnap = await reqRef.get();

  if (!reqSnap.exists) {
    throw new HttpsError("not-found", "Account request was not found.");
  }

  const reqData = reqSnap.data() || {};
  if (reqData.status !== "pending") {
    throw new HttpsError("failed-precondition", `This request has already been ${reqData.status}.`);
  }

  await reqRef.update({
    status: "rejected",
    rejectionReason: trimmedReason,
    reviewedAt: FieldValue.serverTimestamp(),
    reviewedBy: request.auth.uid,
    updatedAt: FieldValue.serverTimestamp(),
    createdUserUid: null,
  });

  return { success: true };
});

export const completeInitialPasswordChange = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  const uid = request.auth.uid;
  const db = getFirestore();
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    throw new HttpsError("not-found", "User profile not found.");
  }

  await userRef.update({
    mustChangePassword: false,
    updatedAt: FieldValue.serverTimestamp(),
    updated_at: new Date().toISOString(),
  });

  return { success: true };
});

export const createStudentAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  if (request.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Administrator access is required.");
  }

  const {
    email,
    password,
    fullName,
    studentId,
    course,
    yearLevel,
    section,
  } = request.data || {};

  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const trimmedName = typeof fullName === "string" ? fullName.trim() : "";
  const trimmedStudentId = typeof studentId === "string" ? studentId.trim() : "";
  const studentCourse = typeof course === "string" ? course.trim() : "BSIT";
  const studentYearLevel = typeof yearLevel === "string" ? yearLevel.trim() : "1";
  const studentSection = typeof section === "string" ? section.trim() : "";

  if (
    !normalizedEmail ||
    typeof password !== "string" ||
    password.length < 8 ||
    !trimmedName ||
    !trimmedStudentId
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Valid student information and a password of at least 8 characters are required.",
    );
  }

  const auth = getAuth();
  const db = getFirestore();

  let createdUser;

  try {
    createdUser = await auth.createUser({
      email: normalizedEmail,
      password,
      displayName: trimmedName,
      emailVerified: true,
      disabled: false,
    });

    await auth.setCustomUserClaims(createdUser.uid, {
      role: "student",
      student: true,
    });

    const now = new Date().toISOString();
    await db.collection("users").doc(createdUser.uid).set({
      id: createdUser.uid,
      uid: createdUser.uid,
      email: normalizedEmail,
      full_name: trimmedName,
      fullName: trimmedName,
      student_number: trimmedStudentId,
      studentNumber: trimmedStudentId,
      course: studentCourse,
      year_level: studentYearLevel,
      year: `${studentYearLevel}st Year`,
      section: studentSection,
      role: "student",
      status: "active",
      mustChangePassword: true,
      createdBy: request.auth.uid,
      created_at: now,
      updated_at: now,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      uid: createdUser.uid,
    };
  } catch (error: any) {
    if (createdUser?.uid) {
      await auth.deleteUser(createdUser.uid).catch(() => undefined);
    }
    throw new HttpsError(
      "internal",
      error?.message || "The student account could not be created.",
    );
  }
});

export const resetStudentPassword = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }
  if (request.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Administrator access is required.");
  }

  const { uid, newPassword } = request.data || {};
  if (!uid || typeof uid !== "string" || !newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    throw new HttpsError("invalid-argument", "Valid UID and temporary password are required.");
  }

  const auth = getAuth();
  const db = getFirestore();

  try {
    await auth.updateUser(uid, {
      password: newPassword,
    });
    await auth.revokeRefreshTokens(uid);

    await db.collection("users").doc(uid).update({
      mustChangePassword: true,
      updated_at: new Date().toISOString(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError("internal", error?.message || "Failed to reset student password.");
  }
});

export const setStudentStatus = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }
  if (request.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Administrator access is required.");
  }

  const { uid, status } = request.data || {};
  if (!uid || typeof uid !== "string" || !status || typeof status !== "string") {
    throw new HttpsError("invalid-argument", "Valid UID and status are required.");
  }

  const auth = getAuth();
  const db = getFirestore();

  try {
    const disabled = status === "disabled";
    await auth.updateUser(uid, { disabled });
    if (disabled) {
      await auth.revokeRefreshTokens(uid);
    }

    await db.collection("users").doc(uid).update({
      status,
      updated_at: new Date().toISOString(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError("internal", error?.message || "Failed to update student status.");
  }
});

export const deleteStudentAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }
  if (request.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Administrator access is required.");
  }

  const { uid } = request.data || {};
  if (!uid || typeof uid !== "string") {
    throw new HttpsError("invalid-argument", "Valid student UID is required.");
  }

  const auth = getAuth();
  const db = getFirestore();

  try {
    await auth.deleteUser(uid).catch(() => undefined);
    await db.collection("users").doc(uid).delete();
    return { success: true };
  } catch (error: any) {
    throw new HttpsError("internal", error?.message || "Failed to delete student account.");
  }
});
