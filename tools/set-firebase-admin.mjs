import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const [uid] = process.argv.slice(2);
if (!uid) throw new Error("Usage: node tools/set-firebase-admin.mjs FIREBASE_UID");
if (!process.env.FIREBASE_SERVICE_ACCOUNT) throw new Error("Set FIREBASE_SERVICE_ACCOUNT first.");

const app = getApps()[0] || initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
await getAuth(app).setCustomUserClaims(uid, { admin: true, sscrAuthorized: true });
console.log(`Admin claims assigned to ${uid}. Ask the user to sign out/in or refresh their ID token.`);
