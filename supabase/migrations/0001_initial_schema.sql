-- ==========================================
-- 1. EXTENSIONS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 2. TABLES
-- ==========================================

-- Alter tables to add columns if they already exist in production
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS course TEXT DEFAULT 'BSIT';
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS year_level TEXT DEFAULT '1';
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS schedule_day TEXT;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS schedule_start TEXT;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS schedule_end TEXT;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS room TEXT;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE;

-- Users / Profiles Table (Targeted as 'users' in the application code)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    student_number TEXT UNIQUE,
    course TEXT DEFAULT 'BSIT',
    year_level TEXT DEFAULT '1',
    section TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    verified BOOLEAN NOT NULL DEFAULT false,
    officer_position TEXT DEFAULT 'None',
    profile_photo TEXT,
    action_photo TEXT,
    password TEXT, -- For offline / fallback authentication purposes
    department TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Semesters Table
CREATE TABLE IF NOT EXISTS public.semesters (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL,
    semester TEXT NOT NULL,
    gwa NUMERIC(5, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Subjects Table
CREATE TABLE IF NOT EXISTS public.subjects (
    id TEXT PRIMARY KEY,
    semester_id TEXT NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    subject_code TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    units NUMERIC(3, 1) NOT NULL DEFAULT 3.0,
    grade NUMERIC(5, 2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'Graded' CHECK (status IN ('Graded', 'Currently Taking', 'Waiting')),
    course TEXT DEFAULT 'BSIT',
    year_level TEXT DEFAULT '1',
    schedule_day TEXT,
    schedule_start TEXT,
    schedule_end TEXT,
    room TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Curriculum Table
CREATE TABLE IF NOT EXISTS public.curriculum (
    id TEXT PRIMARY KEY,
    course TEXT NOT NULL DEFAULT 'BSIT',
    year_level TEXT NOT NULL,
    semester TEXT NOT NULL,
    subject_code TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    units NUMERIC(3, 1) NOT NULL DEFAULT 3.0,
    lec_units NUMERIC(3, 1) DEFAULT 0.0,
    lab_units NUMERIC(3, 1) DEFAULT 0.0,
    schedule_days TEXT,
    schedule_time TEXT,
    room TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    publish_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Award Settings Table
CREATE TABLE IF NOT EXISTS public.award_settings (
    id TEXT PRIMARY KEY,
    award_name TEXT NOT NULL,
    minimum_average NUMERIC(5, 2) NOT NULL,
    minimum_subject_grade NUMERIC(5, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- 3. FUNCTIONS & TRIGGERS
-- ==========================================

-- Function to handle updated_at timestamps dynamically (safely ignores tables missing the column)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    BEGIN
        NEW.updated_at = TIMEZONE('utc'::text, NOW());
    EXCEPTION WHEN undefined_column THEN
        -- Safely ignore if the table doesn't have an updated_at column
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger updated_at for all tables (idempotent setup)
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_semesters_updated_at ON public.semesters;
CREATE TRIGGER update_semesters_updated_at BEFORE UPDATE ON public.semesters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_subjects_updated_at ON public.subjects;
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_curriculum_updated_at ON public.curriculum;
CREATE TRIGGER update_curriculum_updated_at BEFORE UPDATE ON public.curriculum FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_announcements_updated_at ON public.announcements;
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_award_settings_updated_at ON public.award_settings;
CREATE TRIGGER update_award_settings_updated_at BEFORE UPDATE ON public.award_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM public.users WHERE id::text = user_uuid::text;
    RETURN COALESCE(user_role, '') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create a user profile after Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role, verified)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
        CASE WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'student') = 'admin' THEN true ELSE false END
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 4. ROW LEVEL SECURITY (RLS) & POLICIES
-- ==========================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_settings ENABLE ROW LEVEL SECURITY;

-- Users / Profiles Policies
DROP POLICY IF EXISTS "Users can view all user profiles" ON public.users;
CREATE POLICY "Users can view all user profiles" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profiles" ON public.users;
CREATE POLICY "Users can update their own profiles" ON public.users FOR UPDATE USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "Admins can update any profile" ON public.users;
CREATE POLICY "Admins can update any profile" ON public.users FOR UPDATE USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete any profile" ON public.users;
CREATE POLICY "Admins can delete any profile" ON public.users FOR DELETE USING (public.is_admin(auth.uid()));

-- Semesters Policies
DROP POLICY IF EXISTS "Users can select their own semesters" ON public.semesters;
CREATE POLICY "Users can select their own semesters" ON public.semesters FOR SELECT USING (auth.uid()::text = user_id::text OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own semesters" ON public.semesters;
CREATE POLICY "Users can insert their own semesters" ON public.semesters FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update their own semesters" ON public.semesters;
CREATE POLICY "Users can update their own semesters" ON public.semesters FOR UPDATE USING (auth.uid()::text = user_id::text OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own semesters" ON public.semesters;
CREATE POLICY "Users can delete their own semesters" ON public.semesters FOR DELETE USING (auth.uid()::text = user_id::text OR public.is_admin(auth.uid()));

-- Subjects Policies
DROP POLICY IF EXISTS "Users can select their own subjects" ON public.subjects;
CREATE POLICY "Users can select their own subjects" ON public.subjects FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.semesters
        WHERE public.semesters.id = public.subjects.semester_id
        AND (public.semesters.user_id::text = auth.uid()::text OR public.is_admin(auth.uid()))
    )
);

DROP POLICY IF EXISTS "Users can insert their own subjects" ON public.subjects;
CREATE POLICY "Users can insert their own subjects" ON public.subjects FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.semesters
        WHERE public.semesters.id = semester_id
        AND public.semesters.user_id::text = auth.uid()::text
    )
);

DROP POLICY IF EXISTS "Users can update their own subjects" ON public.subjects;
CREATE POLICY "Users can update their own subjects" ON public.subjects FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.semesters
        WHERE public.semesters.id = public.subjects.semester_id
        AND (public.semesters.user_id::text = auth.uid()::text OR public.is_admin(auth.uid()))
    )
);

DROP POLICY IF EXISTS "Users can delete their own subjects" ON public.subjects;
CREATE POLICY "Users can delete their own subjects" ON public.subjects FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.semesters
        WHERE public.semesters.id = public.subjects.semester_id
        AND (public.semesters.user_id::text = auth.uid()::text OR public.is_admin(auth.uid()))
    )
);

-- Curriculum Policies
DROP POLICY IF EXISTS "Anyone can view curriculum" ON public.curriculum;
CREATE POLICY "Anyone can view curriculum" ON public.curriculum FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can modify curriculum" ON public.curriculum;
CREATE POLICY "Only admins can modify curriculum" ON public.curriculum FOR ALL USING (public.is_admin(auth.uid()));

-- Announcements Policies
DROP POLICY IF EXISTS "Anyone can view announcements" ON public.announcements;
CREATE POLICY "Anyone can view announcements" ON public.announcements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can modify announcements" ON public.announcements;
CREATE POLICY "Only admins can modify announcements" ON public.announcements FOR ALL USING (public.is_admin(auth.uid()));

-- Award Settings Policies
DROP POLICY IF EXISTS "Anyone can view award settings" ON public.award_settings;
CREATE POLICY "Anyone can view award settings" ON public.award_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can modify award settings" ON public.award_settings;
CREATE POLICY "Only admins can modify award settings" ON public.award_settings FOR ALL USING (public.is_admin(auth.uid()));

-- ==========================================
-- 5. STORAGE POLICIES
-- ==========================================

-- Ensure storage schema policies for the 'officers' avatar bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('officers', 'officers', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can read avatars" ON storage.objects;
CREATE POLICY "Anyone can read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'officers');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'officers' 
    AND (
        (storage.foldername(name))[1] = 'avatars' 
        AND (split_part((storage.foldername(name))[2], '_', 1)) = auth.uid()::text
        OR public.is_admin(auth.uid())
    )
);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (
    bucket_id = 'officers' 
    AND (
        (storage.foldername(name))[1] = 'avatars' 
        AND (split_part((storage.foldername(name))[2], '_', 1)) = auth.uid()::text
        OR public.is_admin(auth.uid())
    )
);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (
    bucket_id = 'officers' 
    AND (
        (storage.foldername(name))[1] = 'avatars' 
        AND (split_part((storage.foldername(name))[2], '_', 1)) = auth.uid()::text
        OR public.is_admin(auth.uid())
    )
);

-- ==========================================
-- 6. INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_student_number ON public.users(student_number);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_verified ON public.users(verified);
CREATE INDEX IF NOT EXISTS idx_semesters_user_id ON public.semesters(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_semester_id ON public.subjects(semester_id);
CREATE INDEX IF NOT EXISTS idx_announcements_publish_date ON public.announcements(publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON public.announcements(priority);

-- ==========================================
-- 7. REALTIME CONFIGURATION (Idempotent Setup)
-- ==========================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.semesters;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subjects;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================
-- 8. SEED DATA
-- ==========================================

-- Seed Award Settings
INSERT INTO public.award_settings (id, award_name, minimum_average, minimum_subject_grade)
VALUES 
    ('1', 'Gold Medalist', 95.00, 91.50),
    ('2', 'Silver Medalist', 92.00, 88.50),
    ('3', 'Bronze Medalist', 85.00, 84.50)
ON CONFLICT (id) DO UPDATE 
SET minimum_average = EXCLUDED.minimum_average, 
    minimum_subject_grade = EXCLUDED.minimum_subject_grade;

-- Seed Announcements
INSERT INTO public.announcements (id, title, description, priority, publish_date, start_date)
VALUES 
    ('1', 'Enrollment for Second Semester 2025–2026 is now open', 'Students may now enroll for the upcoming semester. Please coordinate with your respective departments for pre-enlistment and clearance procedures.', 'high', '2026-01-10', '2026-01-10'),
    ('2', 'Grade submission deadline extended', 'The deadline for submitting final grades has been moved to January 20, 2026. Faculty members are advised to comply accordingly.', 'normal', '2026-01-08', '2026-01-08'),
    ('3', 'SSCR Academic Excellence Awards Night', 'The annual Academic Excellence Awards Night will be held on February 14, 2026. Top-performing students will be recognized for their achievements.', 'normal', '2026-01-05', '2026-02-14'),
    ('4', 'Official Start of Classes', '1st Semester AY 2026-2027', 'high', '2026-08-17', '2026-08-17')
ON CONFLICT (id) DO NOTHING;

-- Seed default BSIT Curriculum
INSERT INTO public.curriculum (id, course, year_level, semester, subject_code, subject_name, units)
VALUES
  ('c1', 'BSIT', '1', 'First Semester', 'RF1', 'Recoletos Formation 1', 1.0),
  ('c2', 'BSIT', '1', 'First Semester', 'GEC101', 'Understanding the Self', 3.0),
  ('c3', 'BSIT', '1', 'First Semester', 'ITE101', 'Introduction to Computing', 3.0),
  ('c4', 'BSIT', '1', 'First Semester', 'THEO 101', 'Renewal of Christian Faith', 3.0),
  ('c5', 'BSIT', '1', 'First Semester', 'ITE102', 'Program Logic Formulation & Computer Prog 1', 3.0),
  ('c6', 'BSIT', '1', 'First Semester', 'ITP 111', 'Human Computer Interaction', 3.0),
  ('c7', 'BSIT', '1', 'First Semester', 'GEC105', 'Mathematics in the Modern World', 3.0),
  ('c8', 'BSIT', '1', 'First Semester', 'PHE101', 'Movement Enhancement', 2.0),
  ('c9', 'BSIT', '1', 'First Semester', 'CWTS1', 'Civic Welfare Training Service 1', 3.0),
  ('c10', 'BSIT', '2', 'First Semester', 'GEC 102', 'Readings in Philippine History', 3.0),
  ('c11', 'BSIT', '2', 'First Semester', 'ITE 104', 'Data Structures & Algorithms', 3.0),
  ('c12', 'BSIT', '2', 'First Semester', 'ITP 121', 'Platform Technologies', 3.0),
  ('c13', 'BSIT', '2', 'First Semester', 'PE 103', 'PATHFit 3: Dance', 2.0),
  ('c14', 'BSIT', '2', 'First Semester', 'ITE 108', 'Quantitative Methods with Modeling & Simulation', 3.0),
  ('c15', 'BSIT', '2', 'First Semester', 'THEO 103', 'Mysteries of Christian Faith', 3.0),
  ('c16', 'BSIT', '2', 'First Semester', 'RF 104', 'Recoletos Formation 4', 1.0),
  ('c17', 'BSIT', '2', 'First Semester', 'IT TRACK1', 'IT Track1 (Cloud Computing)', 3.0),
  ('c18', 'BSIT', '2', 'First Semester', 'ITP 117', 'Object Oriented Programming', 3.0),
  ('c19', 'BSIT', '3', 'First Semester', 'ITP128', 'Capstone 1', 3.0),
  ('c20', 'BSIT', '3', 'First Semester', 'IPE3', 'Professional Elective 3 (Cyber Security)', 3.0),
  ('c21', 'BSIT', '3', 'First Semester', 'IPE 2', 'Professional Elective 2 (Data Analytics)', 3.0),
  ('c22', 'BSIT', '3', 'First Semester', 'GEC104', 'Ethics', 3.0),
  ('c23', 'BSIT', '3', 'First Semester', 'GEC110', 'Art Appreciation', 3.0),
  ('c24', 'BSIT', '3', 'First Semester', 'REL301', 'The Mysteries of Christian Faith', 3.0),
  ('c25', 'BSIT', '3', 'First Semester', 'ITP113', 'Information Assurance and Security', 3.0),
  ('c26', 'BSIT', '3', 'First Semester', 'IT TRACK 2', 'IT TRACK 2', 3.0),
  ('c27', 'BSIT', '3', 'First Semester', 'ITP130', 'Practicum 1', 3.0),
  ('c28', 'BSIT', '4', 'First Semester', 'ITP129', 'Capstone Project 2', 3.0),
  ('c29', 'BSIT', '4', 'First Semester', 'ITP131', 'Practicum 2', 3.0),
  ('c30', 'BSIT', '4', 'First Semester', 'ITP123', 'System Administration & Maintenance', 3.0),
  ('c31', 'BSIT', '4', 'First Semester', 'IT Track 4', 'IT Track 4 - (Integrative Programming & Technologies)', 3.0),
  ('c32', 'BSIT', '4', 'First Semester', 'IT Track 5', 'IT Track 5', 3.0)
ON CONFLICT (id) DO NOTHING;
