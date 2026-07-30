# Firebase Google login setup

The portal uses Firebase Authentication, Firestore, Firebase Storage, and
Firebase Authentication blocking functions. Google is the only supported
provider. No browser or server code uses a second identity system.

## Firebase Console

1. Open **Build > Authentication > Sign-in method**.
2. Enable **Google** and choose the official SSCR Manila support email.
3. Disable email/password, anonymous authentication, and every other provider.
4. Enable **Identity Platform** so blocking functions are available.
5. Under **Authentication > Settings > Authorized domains**, add:

   ```text
   localhost
   jpcs-sscrmnl.vercel.app
   ```

6. Copy the Firebase web configuration into `.env.local` using `.env.example`.
   These browser values are public project configuration; never put the Admin
   service account in a `VITE_` variable.

## Blocking functions

The functions in `functions/src/index.ts` implement both `beforeUserCreated`
and `beforeUserSignedIn`. They require a verified Google identity whose email
domain is exactly `sscrmnl.edu.ph`, and the sign-in function adds the trusted
`sscrAuthorized` session claim.

```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions
```

Register both deployed blocking functions in Firebase Authentication >
Blocking functions. If Identity Platform is not enabled, Firebase cannot
perform true pre-account and pre-token rejection; do not treat the client
validator as a replacement for that control.

## Environment

The browser requires:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Server-only tooling requires:

```text
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

For local development, place the values in `.env.local`, restart Vite, and
open `http://localhost:5173/login`. For Vercel, set the six `VITE_FIREBASE_*`
values at build time and `FIREBASE_SERVICE_ACCOUNT` only as a server variable.

## Profiles, claims, and rules

The first authorized Google login creates `/users/{uid}` with identity fields
derived from Firebase and a default `student` application role. Firestore and
Storage rules independently require a verified Google token, the exact domain,
and trusted admin claims. The displayed profile role is never authoritative;
administrator access uses the Firebase `admin` custom claim.

Assign an administrator only from the trusted script:

```bash
node tools/set-firebase-admin.mjs FIREBASE_UID
```

Inspect existing accounts safely before any cleanup:

```bash
node tools/cleanup-firebase-users.mjs
node tools/cleanup-firebase-users.mjs --execute
```

The second command revokes refresh tokens and disables unauthorized accounts;
it never deletes Firestore records.

## Local verification

```bash
npm install
npx tsc --noEmit
npm run build
npm run dev
```

Test an approved verified school Google account and reject Gmail, deceptive
suffix/prefix domains, unverified accounts, and non-Google providers. Refresh,
direct private-route navigation, token refresh, logout, Firestore reads, and
Storage uploads must all enforce the same policy.

Deploy policies and functions only after checking the active Firebase project:

```bash
firebase use
firebase deploy --only functions,firestore:rules,storage
```

## How the flow works

- The client app uses Firebase Auth with Google sign-in and only accepts a configured
  `VITE_FIREBASE_*` environment.
- The browser login is gated by `@sscrmnl.edu.ph` and a verified Google identity,
  but the authoritative enforcement happens in Firebase blocking functions.
- `beforeUserCreated` prevents account creation for unauthorized identities.
- `beforeUserSignedIn` rejects invalid sign-ins and issues the trusted
  `sscrAuthorized` session claim for valid users.
- App route guards and server logic require the same claim before granting access.

## Why blocking functions are required

Client-side checks are useful for UX, but they can be bypassed by a malicious
browser or non-browser client. Firebase Identity Platform blocking functions
ensure the domain and verified Google provider are enforced before the user
account or session token is finalized.

## Troubleshooting

- If login fails with a configuration error, verify the six `VITE_FIREBASE_*`
  variables are set correctly in Vercel or `.env.local`.
- If Google sign-in opens a popup but does not complete, allow popups and
  rerun the login flow.
- If an approved `sscrmnl.edu.ph` account is rejected, confirm the Google identity
  is verified and the user is signing in with the Google provider.
- After deploying, check `Authentication > Blocking functions` in the Firebase
  Console to confirm both functions are registered and active.

## Notes

- Do not add `FIREBASE_SERVICE_ACCOUNT` to client-side `.env` files.
- Admin access is controlled through the Firebase custom claim `admin`, not the
  displayed role on the profile page.
- The `sessionClaims.sscrAuthorized` claim is required for all protected routes
  and storage/firestore access under this project’s security model.
