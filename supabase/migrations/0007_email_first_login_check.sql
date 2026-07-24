-- Email-first login lookup. This intentionally exposes only the minimum state
-- requested by the sign-in UI and never returns a user id or profile data.
CREATE OR REPLACE FUNCTION public.check_login_email(login_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  account_status TEXT;
BEGIN
  SELECT CASE
    WHEN auth_user.email_confirmed_at IS NULL THEN 'unverified'
    ELSE 'verified'
  END
  INTO account_status
  FROM auth.users AS auth_user
  WHERE LOWER(auth_user.email) = LOWER(BTRIM(login_email))
  LIMIT 1;

  RETURN COALESCE(account_status, 'not_registered');
END;
$$;

REVOKE ALL ON FUNCTION public.check_login_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_login_email(TEXT) TO anon, authenticated;

-- Ensure PostgREST sees the new RPC immediately after this migration runs.
NOTIFY pgrst, 'reload schema';
