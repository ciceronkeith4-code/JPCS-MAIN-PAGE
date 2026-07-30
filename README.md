# JPCS SSCR Manila Portal

This Vite React portal uses Firebase as its single authentication and data
authority. Google is the only supported sign-in provider, and only verified
accounts ending exactly in `@sscrmnl.edu.ph` can enter private pages.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Fill in the six public Firebase web values.
3. Run `npm install` and `npm run dev`.
4. Open `http://localhost:5173/login`.

Authentication blocking functions and the deployment checklist are documented
in [docs/google-oauth-setup.md](docs/google-oauth-setup.md).

The existing Firestore and Storage layers remain in use. Firebase Rules require
verified Google tokens and trusted admin custom claims; browser profile fields
cannot grant administrator access.
