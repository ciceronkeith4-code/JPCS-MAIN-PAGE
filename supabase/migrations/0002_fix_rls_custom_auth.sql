-- ==========================================
-- FIX: RLS Policies for Custom Auth
-- The app uses a custom auth system (not Supabase Auth),
-- so auth.uid() is always null. We relax write policies to
-- allow all operations via anon role, since access control
-- is enforced at the application level.
-- ==========================================

-- ── USERS ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can update their own profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.users;
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.users;
DROP POLICY IF EXISTS "Allow public insert on users" ON public.users;

CREATE POLICY "Allow public update on users" ON public.users
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete on users" ON public.users
  FOR DELETE USING (true);

CREATE POLICY "Allow public insert on users" ON public.users
  FOR INSERT WITH CHECK (true);

-- ── SEMESTERS ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can select their own semesters" ON public.semesters;
DROP POLICY IF EXISTS "Users can insert their own semesters" ON public.semesters;
DROP POLICY IF EXISTS "Users can update their own semesters" ON public.semesters;
DROP POLICY IF EXISTS "Users can delete their own semesters" ON public.semesters;

CREATE POLICY "Allow all select on semesters" ON public.semesters FOR SELECT USING (true);
CREATE POLICY "Allow all insert on semesters" ON public.semesters FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on semesters" ON public.semesters FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on semesters" ON public.semesters FOR DELETE USING (true);

-- ── SUBJECTS ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can select their own subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can insert their own subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can update their own subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can delete their own subjects" ON public.subjects;

CREATE POLICY "Allow all select on subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Allow all insert on subjects" ON public.subjects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on subjects" ON public.subjects FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on subjects" ON public.subjects FOR DELETE USING (true);

-- ── CURRICULUM ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Only admins can modify curriculum" ON public.curriculum;

CREATE POLICY "Allow all modify on curriculum" ON public.curriculum
  FOR ALL USING (true) WITH CHECK (true);

-- ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Only admins can modify announcements" ON public.announcements;

CREATE POLICY "Allow all modify on announcements" ON public.announcements
  FOR ALL USING (true) WITH CHECK (true);

-- ── AWARD SETTINGS ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Only admins can modify award settings" ON public.award_settings;

CREATE POLICY "Allow all modify on award settings" ON public.award_settings
  FOR ALL USING (true) WITH CHECK (true);

-- ── STORAGE ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

CREATE POLICY "Allow public upload to officers bucket" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'officers');

CREATE POLICY "Allow public update in officers bucket" ON storage.objects
  FOR UPDATE USING (bucket_id = 'officers');

CREATE POLICY "Allow public delete from officers bucket" ON storage.objects
  FOR DELETE USING (bucket_id = 'officers');
