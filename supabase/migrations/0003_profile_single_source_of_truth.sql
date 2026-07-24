-- PROPOSED: apply through the Supabase migration workflow after reviewing it.
-- public.users is the single application profile table. Its id is already the
-- primary key and foreign key to auth.users(id), which guarantees one profile
-- row per authenticated user.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id, email, full_name, student_number, course, year_level, role, verified
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NEW.email),
    NULLIF(NEW.raw_user_meta_data->>'student_number', ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'course', ''), 'BSIT'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'year_level', ''), '1'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'student'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student') = 'admin'
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Remove the broad public policy introduced by 0002 and replace it with RLS
-- that reads and writes the same row id used by the application.
DROP POLICY IF EXISTS "Users can view all user profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.users;
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.users;
DROP POLICY IF EXISTS "Allow public update on users" ON public.users;
DROP POLICY IF EXISTS "Allow public delete on users" ON public.users;
DROP POLICY IF EXISTS "Allow public insert on users" ON public.users;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are visible to owner or admin"
  ON public.users FOR SELECT TO authenticated
  USING (id::text = auth.uid()::text OR public.is_admin(auth.uid()));

CREATE POLICY "Profiles are created only for the owner"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (id::text = auth.uid()::text);

CREATE POLICY "Profile owner or admin can update permitted row"
  ON public.users FOR UPDATE TO authenticated
  USING (id::text = auth.uid()::text OR public.is_admin(auth.uid()))
  WITH CHECK (id::text = auth.uid()::text OR public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete profile rows"
  ON public.users FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Students may update only their editable fields. Admin-only fields are
-- intentionally excluded and can only be changed through the RPC below.
REVOKE UPDATE ON public.users FROM anon, authenticated;
GRANT UPDATE (full_name, student_number, course, year_level, profile_photo, action_photo, updated_at)
  ON public.users TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_profile(
  target_user_id UUID,
  profile_changes JSONB
)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_profile public.users;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can update other user profiles';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_object_keys(profile_changes) AS field_name
    WHERE field_name NOT IN (
      'full_name', 'student_number', 'course', 'year_level', 'officer_position',
      'role', 'profile_photo', 'action_photo', 'status'
    )
  ) THEN
    RAISE EXCEPTION 'Profile update contains a protected field';
  END IF;

  IF profile_changes ? 'role' AND profile_changes->>'role' NOT IN ('student', 'admin') THEN
    RAISE EXCEPTION 'Invalid profile role';
  END IF;

  UPDATE public.users
  SET
    full_name = CASE WHEN profile_changes ? 'full_name' THEN NULLIF(profile_changes->>'full_name', '') ELSE full_name END,
    student_number = CASE WHEN profile_changes ? 'student_number' THEN NULLIF(profile_changes->>'student_number', '') ELSE student_number END,
    course = CASE WHEN profile_changes ? 'course' THEN NULLIF(profile_changes->>'course', '') ELSE course END,
    year_level = CASE WHEN profile_changes ? 'year_level' THEN NULLIF(profile_changes->>'year_level', '') ELSE year_level END,
    officer_position = CASE WHEN profile_changes ? 'officer_position' THEN COALESCE(profile_changes->>'officer_position', '') ELSE officer_position END,
    role = CASE WHEN profile_changes ? 'role' THEN profile_changes->>'role' ELSE role END,
    profile_photo = CASE WHEN profile_changes ? 'profile_photo' THEN NULLIF(profile_changes->>'profile_photo', '') ELSE profile_photo END,
    action_photo = CASE WHEN profile_changes ? 'action_photo' THEN NULLIF(profile_changes->>'action_photo', '') ELSE action_photo END,
    status = CASE WHEN profile_changes ? 'status' THEN COALESCE(profile_changes->>'status', status) ELSE status END,
    updated_at = TIMEZONE('utc'::text, NOW())
  WHERE id::text = target_user_id::text
  RETURNING * INTO updated_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile row not found';
  END IF;

  RETURN updated_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_profile(UUID, JSONB) TO authenticated;

-- Existing upload policies assumed a flat avatars/<uuid>_name.webp path. The
-- application now uses stable avatars/<uuid>/profile.webp and action.webp paths.
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload to officers bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update in officers bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete from officers bucket" ON storage.objects;

CREATE POLICY "Users or admins can upload profile images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'officers'
    AND (storage.foldername(name))[1] = 'avatars'
    AND ((storage.foldername(name))[2] = auth.uid()::text OR public.is_admin(auth.uid()))
  );

CREATE POLICY "Users or admins can update profile images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'officers'
    AND (storage.foldername(name))[1] = 'avatars'
    AND ((storage.foldername(name))[2] = auth.uid()::text OR public.is_admin(auth.uid()))
  );

CREATE POLICY "Users or admins can delete profile images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'officers'
    AND (storage.foldername(name))[1] = 'avatars'
    AND ((storage.foldername(name))[2] = auth.uid()::text OR public.is_admin(auth.uid()))
  );
