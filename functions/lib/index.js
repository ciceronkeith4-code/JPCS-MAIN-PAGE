"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteStudentAccount = exports.setStudentStatus = exports.resetStudentPassword = exports.createStudentAccount = exports.completeInitialPasswordChange = exports.rejectAccountRequest = exports.approveAccountRequest = exports.submitAccountRequest = exports.checkAccountApproval = void 0;
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
(0, app_1.initializeApp)();
exports.checkAccountApproval = (0, https_1.onCall)(async (request) => {
    const { email } = request.data || {};
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        throw new https_1.HttpsError("invalid-argument", "Valid email address is required.");
    }
    const auth = (0, auth_1.getAuth)();
    const db = (0, firestore_1.getFirestore)();
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
    }
    catch (err) {
        if (err.code === "auth/user-not-found") {
            return { approved: false, reason: "not_found" };
        }
        throw new https_1.HttpsError("internal", "Unable to verify account status.");
    }
});
exports.submitAccountRequest = (0, https_1.onCall)(async (request) => {
    const { fullName, email, year, studentNumber } = request.data || {};
    const normalizedFullName = typeof fullName === "string" ? fullName.trim() : "";
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const selectedYear = typeof year === "string" ? year.trim() : "";
    const normalizedStudentNumber = typeof studentNumber === "string" ? studentNumber.trim() : "";
    if (!normalizedFullName ||
        normalizedFullName.length < 2 ||
        !normalizedEmail ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
        !selectedYear ||
        !normalizedStudentNumber) {
        throw new https_1.HttpsError("invalid-argument", "Valid full name, email, year level, and student number are required.");
    }
    const auth = (0, auth_1.getAuth)();
    const db = (0, firestore_1.getFirestore)();
    // 1. Check for existing pending request with same email
    const pendingEmailSnap = await db
        .collection("accountRequests")
        .where("email", "==", normalizedEmail)
        .where("status", "==", "pending")
        .limit(1)
        .get();
    if (!pendingEmailSnap.empty) {
        throw new https_1.HttpsError("already-exists", "An account request for this email address is already pending review.");
    }
    // 2. Check for existing pending request with same student number
    const pendingStudentNumSnap = await db
        .collection("accountRequests")
        .where("studentNumber", "==", normalizedStudentNumber)
        .where("status", "==", "pending")
        .limit(1)
        .get();
    if (!pendingStudentNumSnap.empty) {
        throw new https_1.HttpsError("already-exists", "An account request for this student number is already pending review.");
    }
    // 3. Check if email already has a Firebase Authentication account
    try {
        const existingUser = await auth.getUserByEmail(normalizedEmail);
        if (existingUser) {
            throw new https_1.HttpsError("already-exists", "An account with this email address already exists.");
        }
    }
    catch (err) {
        if (err.code !== "auth/user-not-found") {
            if (err instanceof https_1.HttpsError)
                throw err;
            throw new https_1.HttpsError("internal", "Unable to verify email availability.");
        }
    }
    // 4. Check if Firestore user profile already uses the same student number
    const profileSnap = await db
        .collection("users")
        .where("studentNumber", "==", normalizedStudentNumber)
        .limit(1)
        .get();
    if (!profileSnap.empty) {
        throw new https_1.HttpsError("already-exists", "A user account with this student number already exists.");
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
        submittedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
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
exports.approveAccountRequest = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication is required.");
    }
    if (request.auth.token.admin !== true || request.auth.token.role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Administrator access is required.");
    }
    const { requestId } = request.data || {};
    if (!requestId || typeof requestId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "Valid request ID is required.");
    }
    const auth = (0, auth_1.getAuth)();
    const db = (0, firestore_1.getFirestore)();
    const reqRef = db.collection("accountRequests").doc(requestId);
    const reqSnap = await reqRef.get();
    if (!reqSnap.exists) {
        throw new https_1.HttpsError("not-found", "Account request was not found.");
    }
    const reqData = reqSnap.data() || {};
    if (reqData.status !== "pending") {
        throw new https_1.HttpsError("failed-precondition", `This request has already been ${reqData.status}.`);
    }
    const { fullName, email, year, studentNumber } = reqData;
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const trimmedName = typeof fullName === "string" ? fullName.trim() : "";
    const trimmedStudentNumber = typeof studentNumber === "string" ? studentNumber.trim() : "";
    const selectedYear = typeof year === "string" ? year.trim() : "1st Year";
    if (!normalizedEmail || !trimmedName || !trimmedStudentNumber) {
        throw new https_1.HttpsError("invalid-argument", "Account request contains invalid student data.");
    }
    // Check if Auth account already exists
    try {
        const existingUser = await auth.getUserByEmail(normalizedEmail);
        if (existingUser) {
            throw new https_1.HttpsError("already-exists", "An Authentication account already exists for this email.");
        }
    }
    catch (err) {
        if (err.code !== "auth/user-not-found") {
            if (err instanceof https_1.HttpsError)
                throw err;
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
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            created_at: now,
            updated_at: now,
            lastLoginAt: null,
        });
        await reqRef.update({
            status: "approved",
            reviewedAt: firestore_1.FieldValue.serverTimestamp(),
            reviewedBy: request.auth.uid,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            createdUserUid: createdUser.uid,
            rejectionReason: null,
        });
        return {
            success: true,
            uid: createdUser.uid,
        };
    }
    catch (error) {
        if (createdUser?.uid) {
            await auth.deleteUser(createdUser.uid).catch(() => undefined);
            await db.collection("users").doc(createdUser.uid).delete().catch(() => undefined);
        }
        throw new https_1.HttpsError("internal", error?.message || "Failed to approve account request.");
    }
});
exports.rejectAccountRequest = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication is required.");
    }
    if (request.auth.token.admin !== true || request.auth.token.role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Administrator access is required.");
    }
    const { requestId, rejectionReason } = request.data || {};
    const trimmedReason = typeof rejectionReason === "string" ? rejectionReason.trim() : "";
    if (!requestId || typeof requestId !== "string" || !trimmedReason) {
        throw new https_1.HttpsError("invalid-argument", "Valid request ID and rejection reason are required.");
    }
    const db = (0, firestore_1.getFirestore)();
    const reqRef = db.collection("accountRequests").doc(requestId);
    const reqSnap = await reqRef.get();
    if (!reqSnap.exists) {
        throw new https_1.HttpsError("not-found", "Account request was not found.");
    }
    const reqData = reqSnap.data() || {};
    if (reqData.status !== "pending") {
        throw new https_1.HttpsError("failed-precondition", `This request has already been ${reqData.status}.`);
    }
    await reqRef.update({
        status: "rejected",
        rejectionReason: trimmedReason,
        reviewedAt: firestore_1.FieldValue.serverTimestamp(),
        reviewedBy: request.auth.uid,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        createdUserUid: null,
    });
    return { success: true };
});
exports.completeInitialPasswordChange = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication is required.");
    }
    const uid = request.auth.uid;
    const db = (0, firestore_1.getFirestore)();
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
        throw new https_1.HttpsError("not-found", "User profile not found.");
    }
    await userRef.update({
        mustChangePassword: false,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        updated_at: new Date().toISOString(),
    });
    return { success: true };
});
exports.createStudentAccount = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication is required.");
    }
    if (request.auth.token.admin !== true) {
        throw new https_1.HttpsError("permission-denied", "Administrator access is required.");
    }
    const { email, password, fullName, studentId, course, yearLevel, section, } = request.data || {};
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const trimmedName = typeof fullName === "string" ? fullName.trim() : "";
    const trimmedStudentId = typeof studentId === "string" ? studentId.trim() : "";
    const studentCourse = typeof course === "string" ? course.trim() : "BSIT";
    const studentYearLevel = typeof yearLevel === "string" ? yearLevel.trim() : "1";
    const studentSection = typeof section === "string" ? section.trim() : "";
    if (!normalizedEmail ||
        typeof password !== "string" ||
        password.length < 8 ||
        !trimmedName ||
        !trimmedStudentId) {
        throw new https_1.HttpsError("invalid-argument", "Valid student information and a password of at least 8 characters are required.");
    }
    const auth = (0, auth_1.getAuth)();
    const db = (0, firestore_1.getFirestore)();
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
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return {
            success: true,
            uid: createdUser.uid,
        };
    }
    catch (error) {
        if (createdUser?.uid) {
            await auth.deleteUser(createdUser.uid).catch(() => undefined);
        }
        throw new https_1.HttpsError("internal", error?.message || "The student account could not be created.");
    }
});
exports.resetStudentPassword = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication is required.");
    }
    if (request.auth.token.admin !== true) {
        throw new https_1.HttpsError("permission-denied", "Administrator access is required.");
    }
    const { uid, newPassword } = request.data || {};
    if (!uid || typeof uid !== "string" || !newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
        throw new https_1.HttpsError("invalid-argument", "Valid UID and temporary password are required.");
    }
    const auth = (0, auth_1.getAuth)();
    const db = (0, firestore_1.getFirestore)();
    try {
        await auth.updateUser(uid, {
            password: newPassword,
        });
        await auth.revokeRefreshTokens(uid);
        await db.collection("users").doc(uid).update({
            mustChangePassword: true,
            updated_at: new Date().toISOString(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError("internal", error?.message || "Failed to reset student password.");
    }
});
exports.setStudentStatus = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication is required.");
    }
    if (request.auth.token.admin !== true) {
        throw new https_1.HttpsError("permission-denied", "Administrator access is required.");
    }
    const { uid, status } = request.data || {};
    if (!uid || typeof uid !== "string" || !status || typeof status !== "string") {
        throw new https_1.HttpsError("invalid-argument", "Valid UID and status are required.");
    }
    const auth = (0, auth_1.getAuth)();
    const db = (0, firestore_1.getFirestore)();
    try {
        const disabled = status === "disabled";
        await auth.updateUser(uid, { disabled });
        if (disabled) {
            await auth.revokeRefreshTokens(uid);
        }
        await db.collection("users").doc(uid).update({
            status,
            updated_at: new Date().toISOString(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError("internal", error?.message || "Failed to update student status.");
    }
});
exports.deleteStudentAccount = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication is required.");
    }
    if (request.auth.token.admin !== true) {
        throw new https_1.HttpsError("permission-denied", "Administrator access is required.");
    }
    const { uid } = request.data || {};
    if (!uid || typeof uid !== "string") {
        throw new https_1.HttpsError("invalid-argument", "Valid student UID is required.");
    }
    const auth = (0, auth_1.getAuth)();
    const db = (0, firestore_1.getFirestore)();
    try {
        await auth.deleteUser(uid).catch(() => undefined);
        await db.collection("users").doc(uid).delete();
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError("internal", error?.message || "Failed to delete student account.");
    }
});
