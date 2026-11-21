-- ─────────────────────────────────────────────────────────────────────────────
-- MediConnect: Email Uniqueness & Cross-Role Registration Protection
-- Run this in your Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Ensure email column exists on public.profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email text UNIQUE;
  END IF;
END $$;

-- 2. Populate profiles.email from auth.users for existing accounts
UPDATE public.profiles p
SET email = LOWER(u.email)
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email != LOWER(u.email));

-- 3. Update handle_new_user() trigger to automatically persist lowercase email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, phone)
  VALUES (
    NEW.id,
    LOWER(NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient'),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create check_email_registered function accessible to public/anon
CREATE OR REPLACE FUNCTION public.check_email_registered(lookup_email text)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_role text;
  v_name text;
BEGIN
  IF lookup_email IS NULL OR TRIM(lookup_email) = '' THEN
    RETURN jsonb_build_object('exists', false);
  END IF;

  -- Step 1: Check in auth.users by normalized email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(TRIM(lookup_email))
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Look up role and name in profiles
    SELECT role, full_name INTO v_role, v_name
    FROM public.profiles
    WHERE id = v_user_id
    LIMIT 1;

    -- If no profile role found, check pharmacies table
    IF v_role IS NULL THEN
      IF EXISTS (SELECT 1 FROM public.pharmacies WHERE owner_id = v_user_id) THEN
        v_role := 'pharmacy_admin';
      ELSE
        v_role := 'patient';
      END IF;
    END IF;

    RETURN jsonb_build_object(
      'exists', true,
      'email', LOWER(TRIM(lookup_email)),
      'role', COALESCE(v_role, 'patient'),
      'name', COALESCE(v_name, '')
    );
  END IF;

  -- Step 2: Also check if registered in pharmacies table directly
  SELECT owner_id, name INTO v_user_id, v_name
  FROM public.pharmacies
  WHERE LOWER(email) = LOWER(TRIM(lookup_email))
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'exists', true,
      'email', LOWER(TRIM(lookup_email)),
      'role', 'pharmacy_admin',
      'name', COALESCE(v_name, '')
    );
  END IF;

  RETURN jsonb_build_object(
    'exists', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to all client tiers (anon, authenticated, service_role)
GRANT EXECUTE ON FUNCTION public.check_email_registered(text) TO anon, authenticated, service_role;
