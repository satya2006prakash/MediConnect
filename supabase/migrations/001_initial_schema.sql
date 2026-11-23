-- ─────────────────────────────────────────────────────────────────────────────
-- MediConnect – Smart Medicine Reordering System
-- Complete Database Setup & Migration Script
-- Run this ONCE in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CREATE TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- 2.1 profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- 2.2 pharmacies
CREATE TABLE IF NOT EXISTS public.pharmacies (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 2.3 medicines
CREATE TABLE IF NOT EXISTS public.medicines (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 2.4 pharmacy_inventory
CREATE TABLE IF NOT EXISTS public.pharmacy_inventory (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 2.5 orders
CREATE TABLE IF NOT EXISTS public.orders (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 2.6 order_items
CREATE TABLE IF NOT EXISTS public.order_items (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id            uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  medicine_id         uuid REFERENCES public.medicines(id) ON DELETE SET NULL,
  medicine_name       text NOT NULL,
  quantity_requested  numeric NOT NULL,
  unit                text NOT NULL DEFAULT 'tablet'
);

-- 2.7 bills
CREATE TABLE IF NOT EXISTS public.bills (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 2.8 bill_items
CREATE TABLE IF NOT EXISTS public.bill_items (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id         uuid NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  medicine_name   text NOT NULL,
  quantity        numeric NOT NULL,
  unit_price      numeric NOT NULL,
  total_price     numeric NOT NULL
);

-- 2.9 notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type          text NOT NULL,
  title         text NOT NULL,
  body          text,
  reference_id  uuid,
  is_read       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 2.10 complaints
CREATE TABLE IF NOT EXISTS public.complaints (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. INDEXES FOR HIGH PERFORMANCE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_medicines_user_id ON public.medicines(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_patient_id ON public.orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_orders_pharmacy_id ON public.orders(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_pharmacy_id ON public.pharmacy_inventory(pharmacy_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. AUTOMATIC TIMESTAMP TRIGGER
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
-- 5. AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient'),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
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

-- Helper function to check if current user is admin
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

-- medicines
DROP POLICY IF EXISTS "Patients manage own medicines or admin views" ON public.medicines;
CREATE POLICY "Patients manage own medicines or admin views" ON public.medicines
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- pharmacies
DROP POLICY IF EXISTS "Anyone reads verified pharmacies or admin reads all" ON public.pharmacies;
CREATE POLICY "Anyone reads verified pharmacies or admin reads all" ON public.pharmacies
  FOR SELECT USING (status = 'verified' OR auth.uid() = owner_id OR public.is_admin());

DROP POLICY IF EXISTS "Owners or admin update pharmacy" ON public.pharmacies;
CREATE POLICY "Owners or admin update pharmacy" ON public.pharmacies
  FOR UPDATE USING (auth.uid() = owner_id OR public.is_admin());

DROP POLICY IF EXISTS "Owners insert pharmacy" ON public.pharmacies;
CREATE POLICY "Owners insert pharmacy" ON public.pharmacies
  FOR INSERT WITH CHECK (auth.uid() = owner_id OR public.is_admin());

-- pharmacy_inventory
DROP POLICY IF EXISTS "Anyone reads available inventory" ON public.pharmacy_inventory;
CREATE POLICY "Anyone reads available inventory" ON public.pharmacy_inventory
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Pharmacy owners manage inventory" ON public.pharmacy_inventory;
CREATE POLICY "Pharmacy owners manage inventory" ON public.pharmacy_inventory
  FOR ALL USING (
    auth.uid() IN (SELECT owner_id FROM public.pharmacies WHERE id = pharmacy_id)
    OR public.is_admin()
  );

-- orders
DROP POLICY IF EXISTS "Users view relevant orders or admin views all" ON public.orders;
CREATE POLICY "Users view relevant orders or admin views all" ON public.orders
  FOR SELECT USING (
    auth.uid() = patient_id
    OR pharmacy_id IN (SELECT id FROM public.pharmacies WHERE owner_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Patients create orders" ON public.orders;
CREATE POLICY "Patients create orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = patient_id OR public.is_admin());

DROP POLICY IF EXISTS "Patients, pharmacy or admin update order" ON public.orders;
CREATE POLICY "Patients, pharmacy or admin update order" ON public.orders
  FOR UPDATE USING (
    auth.uid() = patient_id
    OR pharmacy_id IN (SELECT id FROM public.pharmacies WHERE owner_id = auth.uid())
    OR public.is_admin()
  );

-- order_items
DROP POLICY IF EXISTS "Order items visible to order participants" ON public.order_items;
CREATE POLICY "Order items visible to order participants" ON public.order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE patient_id = auth.uid()
      OR pharmacy_id IN (SELECT id FROM public.pharmacies WHERE owner_id = auth.uid())
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Insert order items" ON public.order_items;
CREATE POLICY "Insert order items" ON public.order_items
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM public.orders WHERE patient_id = auth.uid())
    OR public.is_admin()
  );

-- bills
DROP POLICY IF EXISTS "Bills visible to order participants" ON public.bills;
CREATE POLICY "Bills visible to order participants" ON public.bills
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE patient_id = auth.uid()
      OR pharmacy_id IN (SELECT id FROM public.pharmacies WHERE owner_id = auth.uid())
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Pharmacy manages bills" ON public.bills;
CREATE POLICY "Pharmacy manages bills" ON public.bills
  FOR ALL USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.pharmacies p ON p.id = o.pharmacy_id
      WHERE p.owner_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Patient responds to bills" ON public.bills;
CREATE POLICY "Patient responds to bills" ON public.bills
  FOR UPDATE USING (
    order_id IN (SELECT id FROM public.orders WHERE patient_id = auth.uid())
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
CREATE POLICY "Users see own notifications" ON public.notifications
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());

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
-- 7. SEED ACCOUNTS & INITIAL DATA
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_admin_id    uuid := 'a0000000-0000-0000-0000-000000000001';
  v_patient_id  uuid := 'a0000000-0000-0000-0000-000000000002';
  v_pharmacy_id uuid := 'a0000000-0000-0000-0000-000000000003';
  v_store_id    uuid := 'b0000000-0000-0000-0000-000000000001';
  v_med1_id     uuid := 'c0000000-0000-0000-0000-000000000001';
  v_med2_id     uuid := 'c0000000-0000-0000-0000-000000000002';
  v_med3_id     uuid := 'c0000000-0000-0000-0000-000000000003';
  v_order_id    uuid := 'd0000000-0000-0000-0000-000000000001';
  v_bill_id     uuid := 'e0000000-0000-0000-0000-000000000001';
BEGIN

  -- ── 7.1 Admin Account ──
  -- Email: satya2006prakash@gmail.com
  -- Password: MediConnect@2006
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'satya2006prakash@gmail.com') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
    ) VALUES (
      v_admin_id, '00000000-0000-0000-0000-000000000000',
      'satya2006prakash@gmail.com',
      crypt('MediConnect@2006', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Satya Prakash","role":"admin"}',
      now(), now(), 'authenticated', 'authenticated'
    );
  ELSE
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'satya2006prakash@gmail.com';
    UPDATE auth.users SET
      encrypted_password = crypt('MediConnect@2006', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE id = v_admin_id;
  END IF;

  INSERT INTO public.profiles (id, role, full_name, phone, city, pincode, address)
  VALUES (v_admin_id, 'admin', 'Satya Prakash', '+91 98111 00000', 'Bengaluru', '560001', 'MediConnect Platform Governance, Indiranagar')
  ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = 'Satya Prakash';


  -- ── 7.2 Patient Account ──
  -- Email: patient@mediconnect.com
  -- Password: Password@123
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'patient@mediconnect.com') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
    ) VALUES (
      v_patient_id, '00000000-0000-0000-0000-000000000000',
      'patient@mediconnect.com',
      crypt('Password@123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Dr. Arjun Verma","role":"patient"}',
      now(), now(), 'authenticated', 'authenticated'
    );
  ELSE
    SELECT id INTO v_patient_id FROM auth.users WHERE email = 'patient@mediconnect.com';
  END IF;

  INSERT INTO public.profiles (id, role, full_name, phone, city, pincode, address)
  VALUES (v_patient_id, 'patient', 'Dr. Arjun Verma', '+91 98200 12345', 'Mumbai', '400001', '42 Marine Drive, Nariman Point')
  ON CONFLICT (id) DO UPDATE SET role = 'patient', full_name = 'Dr. Arjun Verma';


  -- ── 7.3 Pharmacy Account ──
  -- Email: pharmacy@mediconnect.com
  -- Password: Password@123
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'pharmacy@mediconnect.com') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
    ) VALUES (
      v_pharmacy_id, '00000000-0000-0000-0000-000000000000',
      'pharmacy@mediconnect.com',
      crypt('Password@123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Suresh Patel (Owner)","role":"pharmacy_admin"}',
      now(), now(), 'authenticated', 'authenticated'
    );
  ELSE
    SELECT id INTO v_pharmacy_id FROM auth.users WHERE email = 'pharmacy@mediconnect.com';
  END IF;

  INSERT INTO public.profiles (id, role, full_name, phone, city, pincode, address)
  VALUES (v_pharmacy_id, 'pharmacy_admin', 'Suresh Patel (Owner)', '+91 98333 45678', 'Mumbai', '400001', 'Apollo Pharmacy, Fort Commercial Centre')
  ON CONFLICT (id) DO UPDATE SET role = 'pharmacy_admin';


  -- ── 7.4 Seed Pharmacy Store ──
  INSERT INTO public.pharmacies (id, owner_id, name, license_number, phone, email, address, city, pincode, status, verified_at)
  VALUES (
    v_store_id, v_pharmacy_id, 'Apollo Pharmacy & Wellness', 'MH-MZ4-192837',
    '+91 98333 45678', 'pharmacy@mediconnect.com', 'Shop 4, Fort Commercial Plaza, Fort', 'Mumbai', '400001',
    'verified', now()
  )
  ON CONFLICT (id) DO UPDATE SET status = 'verified';


  -- ── 7.5 Seed Medicines for Patient ──
  INSERT INTO public.medicines (id, user_id, name, brand, dosage, form, current_quantity, unit, daily_dose, reminder_threshold, is_prescription, notes)
  VALUES
    (v_med1_id, v_patient_id, 'Metformin Hydrochloride', 'Glycomet', '500mg', 'tablet', 48, 'tablet', 2, 7, true, 'Take after breakfast and dinner'),
    (v_med2_id, v_patient_id, 'Atorvastatin Calcium', 'Lipitor', '20mg', 'tablet', 6, 'tablet', 1, 7, true, 'Take 1 tablet at night after food - LOW STOCK!'),
    (v_med3_id, v_patient_id, 'Lisinopril', 'Prinivil', '10mg', 'tablet', 30, 'tablet', 1, 7, true, 'Take 1 tablet every morning')
  ON CONFLICT (id) DO NOTHING;


  -- ── 7.6 Seed Pharmacy Inventory ──
  INSERT INTO public.pharmacy_inventory (pharmacy_id, medicine_name, brand, form, dosage, price, stock_quantity, is_available)
  VALUES
    (v_store_id, 'Metformin Hydrochloride', 'Glycomet', 'tablet', '500mg', 38.50, 450, true),
    (v_store_id, 'Atorvastatin Calcium', 'Lipitor', 'tablet', '20mg', 115.00, 200, true),
    (v_store_id, 'Lisinopril', 'Prinivil', 'tablet', '10mg', 62.00, 310, true),
    (v_store_id, 'Amlodipine Besylate', 'Norvasc', 'tablet', '5mg', 45.00, 180, true),
    (v_store_id, 'Paracetamol', 'Calpol', 'tablet', '650mg', 30.00, 800, true),
    (v_store_id, 'Omeprazole', 'Prilosec', 'capsule', '20mg', 85.00, 150, true),
    (v_store_id, 'Azithromycin', 'Zithromax', 'tablet', '500mg', 120.00, 90, true)
  ON CONFLICT DO NOTHING;


  -- ── 7.7 Seed Sample Refill Order & Bill ──
  INSERT INTO public.orders (id, patient_id, pharmacy_id, status, notes)
  VALUES (v_order_id, v_patient_id, v_store_id, 'bill_generated', 'Urgent monthly refill for Atorvastatin')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.order_items (order_id, medicine_id, medicine_name, quantity_requested, unit)
  VALUES (v_order_id, v_med2_id, 'Atorvastatin Calcium 20mg', 30, 'tablet')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.bills (id, order_id, subtotal, delivery_fee, tax, total, status)
  VALUES (v_bill_id, v_order_id, 115.00, 25.00, 6.00, 146.00, 'pending')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.bill_items (bill_id, medicine_name, quantity, unit_price, total_price)
  VALUES (v_bill_id, 'Atorvastatin Calcium 20mg (Strip of 30)', 1, 115.00, 115.00)
  ON CONFLICT DO NOTHING;

  -- ── 7.8 Seed Notifications ──
  INSERT INTO public.notifications (user_id, type, title, body, reference_id)
  VALUES
    (v_patient_id, 'low_stock', 'Low Stock Alert: Atorvastatin', 'Only 6 days of Atorvastatin remaining. Reorder now.', v_med2_id),
    (v_patient_id, 'bill_generated', 'Refill Bill Ready for Approval', 'Apollo Pharmacy has sent a bill of ₹146.00 for your refill request.', v_order_id)
  ON CONFLICT DO NOTHING;

END $$;

-- Verification query
SELECT
  u.email,
  p.role,
  p.full_name
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
ORDER BY p.role;
