import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const execute = process.argv.includes("--execute");
const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) throw new Error("Set FIREBASE_SERVICE_ACCOUNT before running this script.");

const app = getApps()[0] || initializeApp({ credential: cert(JSON.parse(raw)) });
const auth = getAuth(app);
const unauthorized = [];
let nextPageToken;

do {
  const page = await auth.listUsers(1000, nextPageToken);
  for (const user of page.users) {
    const hasGoogle = user.providerData.some((provider) => provider.providerId === "google.com");
    const email = user.email?.trim().toLowerCase() || "";
    const parts = email.split("@");
    const allowed = parts.length === 2 && parts[0].length > 0 && parts[1] === "sscrmnl.edu.ph";
    if (!allowed || user.emailVerified !== true || !hasGoogle) unauthorized.push(user);
  }
  nextPageToken = page.pageToken;
} while (nextPageToken);

console.log(`${unauthorized.length} unauthorized Firebase Auth account(s) found.`);
for (const user of unauthorized) console.log(`- ${user.uid} ${user.email || "(no email)"}`);

if (!execute) {
  console.log("Dry run only. Re-run with --execute to revoke tokens and disable accounts.");
} else {
  for (const user of unauthorized) {
    await auth.revokeRefreshTokens(user.uid);
    await auth.updateUser(user.uid, { disabled: true });
  }
  console.log("Unauthorized accounts were revoked and disabled. Firestore records were not deleted.");
}
