-- ─────────────────────────────────────────────────────────────────────────────
-- MediConnect – Pharmacy Registration RLS and Automated Trigger Fix
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Fix RLS policy on pharmacies to allow pending registration insertion
DROP POLICY IF EXISTS "Owners insert pharmacy" ON public.pharmacies;
DROP POLICY IF EXISTS "Allow pharmacy registration" ON public.pharmacies;

CREATE POLICY "Allow pharmacy registration" ON public.pharmacies
  FOR INSERT WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = owner_id)
    OR (status = 'pending')
    OR public.is_admin()
  );

-- 2. Update trigger to automatically provision pharmacies for pharmacy_admin role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, full_name, role, phone, city, pincode, address)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'pincode',
    NEW.raw_user_meta_data->>'address'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    city = COALESCE(EXCLUDED.city, profiles.city),
    pincode = COALESCE(EXCLUDED.pincode, profiles.pincode),
    address = COALESCE(EXCLUDED.address, profiles.address);

  -- If pharmacy admin, automatically create pending pharmacy record
  IF (NEW.raw_user_meta_data->>'role' = 'pharmacy_admin') THEN
    INSERT INTO public.pharmacies (
      owner_id,
      name,
      license_number,
      phone,
      email,
      address,
      city,
      pincode,
      status
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'pharmacy_name', 'Pharmacy'),
      COALESCE(NEW.raw_user_meta_data->>'license_number', 'PENDING'),
      NEW.raw_user_meta_data->>'phone',
      LOWER(NEW.email),
      NEW.raw_user_meta_data->>'address',
      NEW.raw_user_meta_data->>'city',
      NEW.raw_user_meta_data->>'pincode',
      'pending'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Dedicated RPC to safely register pharmacy
CREATE OR REPLACE FUNCTION public.register_pharmacy(
  p_user_id uuid,
  p_name text,
  p_license_number text,
  p_phone text,
  p_email text,
  p_address text,
  p_city text,
  p_pincode text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.pharmacies (
    owner_id,
    name,
    license_number,
    phone,
    email,
    address,
    city,
    pincode,
    status
  ) VALUES (
    p_user_id,
    p_name,
    p_license_number,
    p_phone,
    LOWER(TRIM(p_email)),
    p_address,
    p_city,
    p_pincode,
    'pending'
  );

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.register_pharmacy TO anon, authenticated, service_role;
