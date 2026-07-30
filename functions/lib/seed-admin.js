"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
const DEFAULT_ADMIN_EMAIL = "admin@sscrmnl.edu.ph";
const DEFAULT_ADMIN_PASS = "admin010404";
async function seedAdmin() {
    const auth = (0, auth_1.getAuth)();
    const db = (0, firestore_1.getFirestore)();
    console.log(`Checking for admin account (${DEFAULT_ADMIN_EMAIL})...`);
    let userRecord;
    try {
        userRecord = await auth.getUserByEmail(DEFAULT_ADMIN_EMAIL);
        console.log(`Admin account exists in Auth with UID: ${userRecord.uid}`);
        await auth.updateUser(userRecord.uid, {
            password: DEFAULT_ADMIN_PASS,
            emailVerified: true,
            disabled: false,
        });
        console.log(`Updated password for admin user.`);
    }
    catch (err) {
        if (err.code === "auth/user-not-found") {
            console.log(`Creating new Admin Auth account...`);
            userRecord = await auth.createUser({
                email: DEFAULT_ADMIN_EMAIL,
                password: DEFAULT_ADMIN_PASS,
                displayName: "System Administrator",
                emailVerified: true,
                disabled: false,
            });
            console.log(`Created Admin Auth user: ${userRecord.uid}`);
        }
        else {
            throw err;
        }
    }
    await auth.setCustomUserClaims(userRecord.uid, {
        admin: true,
        role: "admin",
    });
    console.log(`Custom claims set (admin: true, role: 'admin').`);
    const userDocRef = db.collection("users").doc(userRecord.uid);
    const now = new Date().toISOString();
    await userDocRef.set({
        id: userRecord.uid,
        uid: userRecord.uid,
        full_name: "System Administrator",
        fullName: "System Administrator",
        email: DEFAULT_ADMIN_EMAIL,
        role: "admin",
        status: "active",
        mustChangePassword: false,
        created_at: now,
        updated_at: now,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log(`Firestore document updated for UID: ${userRecord.uid}`);
    console.log("SUCCESS: Default Admin account is configured in Firebase.");
}
seedAdmin().catch((err) => {
    console.error("ERROR seeding admin account:", err);
    process.exit(1);
});
