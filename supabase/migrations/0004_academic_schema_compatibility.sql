BEGIN;

-- Existing production tables may predate the current application schema.
-- CREATE TABLE IF NOT EXISTS does not add columns to tables that already exist.
ALTER TABLE IF EXISTS public.semesters
  ADD COLUMN IF NOT EXISTS user_id TEXT,
  ADD COLUMN IF NOT EXISTS academic_year TEXT,
  ADD COLUMN IF NOT EXISTS semester TEXT,
  ADD COLUMN IF NOT EXISTS gwa NUMERIC(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Production public.users.id is TEXT. Repoint the legacy semester foreign key
-- to that canonical profile ID. NOT VALID preserves any historical orphan rows
-- while still enforcing the relationship for all new writes.
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'semesters'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.semesters',
      policy_record.policyname
    );
  END LOOP;
END;
$$;

-- Subject ownership policies also reference semesters.user_id and therefore
-- must be removed before PostgreSQL can change that column's type.
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subjects'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.subjects',
      policy_record.policyname
    );
  END LOOP;
END;
$$;

ALTER TABLE public.semesters
  DROP CONSTRAINT IF EXISTS semesters_user_id_fkey;

ALTER TABLE public.semesters
  ALTER COLUMN user_id TYPE TEXT USING user_id::text;

ALTER TABLE public.semesters
  ADD CONSTRAINT semesters_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON UPDATE CASCADE
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Semester owners or admins can view"
  ON public.semesters
  FOR SELECT TO authenticated
  USING (
    user_id::text = auth.uid()::text
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Semester owners can insert"
  ON public.semesters
  FOR INSERT TO authenticated
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Semester owners or admins can update"
  ON public.semesters
  FOR UPDATE TO authenticated
  USING (
    user_id::text = auth.uid()::text
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    user_id::text = auth.uid()::text
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Semester owners or admins can delete"
  ON public.semesters
  FOR DELETE TO authenticated
  USING (
    user_id::text = auth.uid()::text
    OR public.is_admin(auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.semesters
  TO authenticated;

-- Preserve values from common legacy names when those columns exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'semesters'
      AND column_name = 'semester_name'
  ) THEN
    EXECUTE '
      UPDATE public.semesters
      SET semester = COALESCE(semester, semester_name::text)
      WHERE semester IS NULL
    ';
    -- The current application writes to "semester". Keep the legacy column
    -- for compatibility, but do not require new rows to populate both names.
    EXECUTE '
      ALTER TABLE public.semesters
      ALTER COLUMN semester_name DROP NOT NULL
    ';
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'semesters'
      AND column_name = 'term'
  ) THEN
    EXECUTE '
      UPDATE public.semesters
      SET semester = COALESCE(semester, term::text)
      WHERE semester IS NULL
    ';
  END IF;
END;
$$;

ALTER TABLE IF EXISTS public.subjects
  ADD COLUMN IF NOT EXISTS semester_id TEXT,
  ADD COLUMN IF NOT EXISTS subject_code TEXT,
  ADD COLUMN IF NOT EXISTS subject_name TEXT,
  ADD COLUMN IF NOT EXISTS units NUMERIC(3, 1) NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS grade NUMERIC(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Currently Taking',
  ADD COLUMN IF NOT EXISTS course TEXT,
  ADD COLUMN IF NOT EXISTS year_level TEXT,
  ADD COLUMN IF NOT EXISTS schedule_day TEXT,
  ADD COLUMN IF NOT EXISTS schedule_start TEXT,
  ADD COLUMN IF NOT EXISTS schedule_end TEXT,
  ADD COLUMN IF NOT EXISTS room TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subject owners or admins can view"
  ON public.subjects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.semesters
      WHERE public.semesters.id::text = public.subjects.semester_id::text
        AND (
          public.semesters.user_id::text = auth.uid()::text
          OR public.is_admin(auth.uid())
        )
    )
  );

CREATE POLICY "Subject owners can insert"
  ON public.subjects
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.semesters
      WHERE public.semesters.id::text = public.subjects.semester_id::text
        AND public.semesters.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Subject owners or admins can update"
  ON public.subjects
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.semesters
      WHERE public.semesters.id::text = public.subjects.semester_id::text
        AND (
          public.semesters.user_id::text = auth.uid()::text
          OR public.is_admin(auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.semesters
      WHERE public.semesters.id::text = public.subjects.semester_id::text
        AND (
          public.semesters.user_id::text = auth.uid()::text
          OR public.is_admin(auth.uid())
        )
    )
  );

CREATE POLICY "Subject owners or admins can delete"
  ON public.subjects
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.semesters
      WHERE public.semesters.id::text = public.subjects.semester_id::text
        AND (
          public.semesters.user_id::text = auth.uid()::text
          OR public.is_admin(auth.uid())
        )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.subjects
  TO authenticated;

CREATE INDEX IF NOT EXISTS idx_semesters_user_id
  ON public.semesters(user_id);

CREATE INDEX IF NOT EXISTS idx_subjects_semester_id
  ON public.subjects(semester_id);

-- Ask PostgREST to immediately refresh its table/column metadata.
NOTIFY pgrst, 'reload schema';

COMMIT;
