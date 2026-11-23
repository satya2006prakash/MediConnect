-- ─────────────────────────────────────────────────────────────────────────────
-- MediConnect – Smart Medicine Reordering System
-- Complete Database Setup & Migration Script
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/zhenijqolswpsifqtaxr/sql/new
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CREATE TABLES (Using native gen_random_uuid())
-- ─────────────────────────────────────────────────────────────────────────────

-- 1.1 profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text UNIQUE,
  role        text NOT NULL CHECK (role IN ('patient', 'pharmacy_admin', 'admin')) DEFAULT 'patient',
  full_name   text NOT NULL,
  phone       text,
  avatar_url  text,
  city        text,
  pincode     text,
  address     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 1.2 pharmacies
CREATE TABLE IF NOT EXISTS public.pharmacies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name            text NOT NULL,
  license_number  text UNIQUE,
  phone           text,
  email           text,
  address         text,
  city            text,
  pincode         text,
  latitude        numeric,
  longitude       numeric,
  status          text NOT NULL CHECK (status IN ('pending', 'verified', 'suspended')) DEFAULT 'pending',
  document_url    text,
  verified_at     timestamptz,
  verified_by     uuid REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 1.3 medicines
CREATE TABLE IF NOT EXISTS public.medicines (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name                text NOT NULL,
  brand               text,
  dosage              text,
  form                text CHECK (form IN ('tablet','capsule','syrup','injection','cream','drops','other')),
  current_quantity    numeric NOT NULL DEFAULT 0,
  unit                text NOT NULL DEFAULT 'tablet',
  daily_dose          numeric NOT NULL DEFAULT 1,
  reminder_threshold  integer NOT NULL DEFAULT 7,
  is_prescription     boolean NOT NULL DEFAULT false,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 1.4 pharmacy_inventory
CREATE TABLE IF NOT EXISTS public.pharmacy_inventory (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id     uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  medicine_name   text NOT NULL,
  brand           text,
  form            text CHECK (form IN ('tablet','capsule','syrup','injection','cream','drops','other')),
  dosage          text,
  price           numeric NOT NULL,
  stock_quantity  integer NOT NULL DEFAULT 0,
  is_available    boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 1.5 orders
CREATE TABLE IF NOT EXISTS public.orders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE RESTRICT,
  status      text NOT NULL CHECK (status IN (
                'pending','accepted','bill_generated','bill_approved',
                'processing','dispatched','delivered','rejected','cancelled'
              )) DEFAULT 'pending',
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 1.6 order_items
CREATE TABLE IF NOT EXISTS public.order_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  medicine_id         uuid REFERENCES public.medicines(id) ON DELETE SET NULL,
  medicine_name       text NOT NULL,
  quantity_requested  numeric NOT NULL,
  unit                text NOT NULL DEFAULT 'tablet'
);

-- 1.7 bills
CREATE TABLE IF NOT EXISTS public.bills (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  subtotal      numeric NOT NULL,
  delivery_fee  numeric NOT NULL DEFAULT 0,
  tax           numeric NOT NULL DEFAULT 0,
  total         numeric NOT NULL,
  status        text NOT NULL CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  patient_note  text,
  generated_at  timestamptz NOT NULL DEFAULT now(),
  responded_at  timestamptz
);

-- 1.8 bill_items
CREATE TABLE IF NOT EXISTS public.bill_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id         uuid NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  medicine_name   text NOT NULL,
  quantity        numeric NOT NULL,
  unit_price      numeric NOT NULL,
  total_price     numeric NOT NULL
);

-- 1.9 notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type          text NOT NULL,
  title         text NOT NULL,
  body          text,
  reference_id  uuid,
  is_read       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 1.10 complaints
CREATE TABLE IF NOT EXISTS public.complaints (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filed_by          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  against_pharmacy  uuid REFERENCES public.pharmacies(id) ON DELETE SET NULL,
  against_order     uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  subject           text NOT NULL,
  description       text,
  status            text NOT NULL CHECK (status IN ('open','under_review','resolved','dismissed')) DEFAULT 'open',
  admin_note        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- 1.11 system_logs
CREATE TABLE IF NOT EXISTS public.system_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action      text NOT NULL,
  details     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. INDEXES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_medicines_user_id ON public.medicines(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_patient_id ON public.orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_orders_pharmacy_id ON public.orders(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_pharmacy_id ON public.pharmacy_inventory(pharmacy_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. AUTOMATIC TIMESTAMP TRIGGER
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['profiles','pharmacies','medicines','pharmacy_inventory','orders','complaints'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%s;', tbl, tbl);
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%s FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', tbl, tbl);
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
-- ─────────────────────────────────────────────────────────────────────────────
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4.1 EMAIL AVAILABILITY & ROLE LOOKUP RPC
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

  -- 1. Check in auth.users by normalized email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(TRIM(lookup_email))
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    SELECT role, full_name INTO v_role, v_name
    FROM public.profiles
    WHERE id = v_user_id
    LIMIT 1;

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

  -- 2. Check in pharmacies table directly
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

GRANT EXECUTE ON FUNCTION public.check_email_registered(text) TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- profiles
DROP POLICY IF EXISTS "Users view own or admin views all profiles" ON public.profiles;
CREATE POLICY "Users view own or admin views all profiles" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users update own profile or admin updates" ON public.profiles;
CREATE POLICY "Users update own profile or admin updates" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR public.is_admin());

-- pharmacies
DROP POLICY IF EXISTS "Public can view verified pharmacies" ON public.pharmacies;
CREATE POLICY "Public can view verified pharmacies" ON public.pharmacies
  FOR SELECT USING (status = 'verified' OR owner_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Owners manage pharmacy" ON public.pharmacies;
DROP POLICY IF EXISTS "Allow pharmacy registration" ON public.pharmacies;
CREATE POLICY "Allow pharmacy registration" ON public.pharmacies
  FOR INSERT WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = owner_id)
    OR (status = 'pending')
    OR public.is_admin()
  );

CREATE POLICY "Owners or admin update pharmacy" ON public.pharmacies
  FOR UPDATE USING (owner_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins delete pharmacy" ON public.pharmacies
  FOR DELETE USING (public.is_admin());

-- medicines
DROP POLICY IF EXISTS "Users view own medicines" ON public.medicines;
CREATE POLICY "Users view own medicines" ON public.medicines
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users manage own medicines" ON public.medicines;
CREATE POLICY "Users manage own medicines" ON public.medicines
  FOR ALL USING (user_id = auth.uid() OR public.is_admin());

-- pharmacy_inventory
DROP POLICY IF EXISTS "Public view inventory" ON public.pharmacy_inventory;
CREATE POLICY "Public view inventory" ON public.pharmacy_inventory
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Pharmacy manage inventory" ON public.pharmacy_inventory;
CREATE POLICY "Pharmacy manage inventory" ON public.pharmacy_inventory
  FOR ALL USING (
    pharmacy_id IN (SELECT id FROM public.pharmacies WHERE owner_id = auth.uid())
    OR public.is_admin()
  );

-- orders
DROP POLICY IF EXISTS "Order view policy" ON public.orders;
CREATE POLICY "Order view policy" ON public.orders
  FOR SELECT USING (
    patient_id = auth.uid()
    OR pharmacy_id IN (SELECT id FROM public.pharmacies WHERE owner_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Patients create orders" ON public.orders;
CREATE POLICY "Patients create orders" ON public.orders
  FOR INSERT WITH CHECK (patient_id = auth.uid());

DROP POLICY IF EXISTS "Order update policy" ON public.orders;
CREATE POLICY "Order update policy" ON public.orders
  FOR UPDATE USING (
    patient_id = auth.uid()
    OR pharmacy_id IN (SELECT id FROM public.pharmacies WHERE owner_id = auth.uid())
    OR public.is_admin()
  );

-- order_items
DROP POLICY IF EXISTS "Order items select" ON public.order_items;
CREATE POLICY "Order items select" ON public.order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE patient_id = auth.uid()
         OR pharmacy_id IN (SELECT id FROM public.pharmacies WHERE owner_id = auth.uid())
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Order items insert" ON public.order_items;
CREATE POLICY "Order items insert" ON public.order_items
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM public.orders WHERE patient_id = auth.uid())
    OR public.is_admin()
  );

-- bills
DROP POLICY IF EXISTS "Bills select" ON public.bills;
CREATE POLICY "Bills select" ON public.bills
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE patient_id = auth.uid()
         OR pharmacy_id IN (SELECT id FROM public.pharmacies WHERE owner_id = auth.uid())
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Pharmacy generates bills" ON public.bills;
CREATE POLICY "Pharmacy generates bills" ON public.bills
  FOR INSERT WITH CHECK (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.pharmacies p ON p.id = o.pharmacy_id
      WHERE p.owner_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Bills update" ON public.bills;
CREATE POLICY "Bills update" ON public.bills
  FOR UPDATE USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.pharmacies p ON p.id = o.pharmacy_id
      WHERE p.owner_id = auth.uid() OR o.patient_id = auth.uid()
    )
    OR public.is_admin()
  );

-- bill_items
DROP POLICY IF EXISTS "Bill items select" ON public.bill_items;
CREATE POLICY "Bill items select" ON public.bill_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Pharmacy manages bill items" ON public.bill_items;
CREATE POLICY "Pharmacy manages bill items" ON public.bill_items
  FOR ALL USING (
    bill_id IN (
      SELECT b.id FROM public.bills b
      JOIN public.orders o ON o.id = b.order_id
      JOIN public.pharmacies p ON p.id = o.pharmacy_id
      WHERE p.owner_id = auth.uid()
    )
    OR public.is_admin()
  );

-- notifications
DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Notifications select" ON public.notifications;
DROP POLICY IF EXISTS "Notifications insert" ON public.notifications;
DROP POLICY IF EXISTS "Notifications update" ON public.notifications;
DROP POLICY IF EXISTS "Notifications delete" ON public.notifications;

CREATE POLICY "Notifications select" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Notifications update" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Notifications delete" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Notifications insert" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR public.is_admin());

-- complaints
DROP POLICY IF EXISTS "Complaints view" ON public.complaints;
CREATE POLICY "Complaints view" ON public.complaints
  FOR SELECT USING (auth.uid() = filed_by OR public.is_admin());

DROP POLICY IF EXISTS "Users file complaints" ON public.complaints;
CREATE POLICY "Users file complaints" ON public.complaints
  FOR INSERT WITH CHECK (auth.uid() = filed_by OR public.is_admin());

DROP POLICY IF EXISTS "Admin manages complaints" ON public.complaints;
CREATE POLICY "Admin manages complaints" ON public.complaints
  FOR ALL USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. SEED PLATFORM ADMIN PROFILE
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Retrieve pre-created Auth user UUID
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'satya2006prakash@gmail.com' LIMIT 1;
  v_admin_id := COALESCE(v_admin_id, '1f287e2d-087f-42ce-a893-3e2f1aa5ead1'::uuid);

  -- Admin Profile
  INSERT INTO public.profiles (id, role, full_name, phone, city, pincode, address)
  VALUES (v_admin_id, 'admin', 'Satya Prakash', '+91 98111 00000', 'Bengaluru', '560001', 'MediConnect Platform Governance, Indiranagar')
  ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = 'Satya Prakash';
END $$;
