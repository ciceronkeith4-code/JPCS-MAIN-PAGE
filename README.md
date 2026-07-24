# JPCS–SSCR Manila Website and Member Portal

The public website includes four routes:

- `/` — homepage
- `/programs` — technical, professional, and leadership programs
- `/community` — student, officer, partner, and alumni experiences
- `/about` — mission, values, and leadership preview

All photographic areas are intentionally rendered as black placeholders. Each slot shows the filename expected under `/public/images/`, making it straightforward to add approved chapter photography later.

## Local setup

1. Install dependencies with `npm install`.
2. Copy the required Supabase values into `.env` for member-portal authentication.
3. Start the local site with `npm run dev`.
4. Open `http://localhost:5173/`. Vite is configured to open the homepage automatically.

The four public routes work without Supabase credentials. Authentication and member/admin routes require a configured Supabase project.

## Production checks

- Run `npx tsc --noEmit` for TypeScript validation.
- Run `npm run build` to create the Vite production bundle in `dist/`.

Vercel SPA rewrites are configured in `vercel.json`, so direct visits and refreshes on `/programs`, `/community`, and `/about` resolve through `index.html`.
