-- ─────────────────────────────────────────────────────────────────────────────
-- MediConnect – Notifications RLS Policy Fix & Realtime Publication
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Clean existing notification policies
DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Notifications select" ON public.notifications;
DROP POLICY IF EXISTS "Notifications insert" ON public.notifications;
DROP POLICY IF EXISTS "Notifications update" ON public.notifications;
DROP POLICY IF EXISTS "Notifications delete" ON public.notifications;

-- 2. Allow users to select their own notifications (and admin to inspect all)
CREATE POLICY "Notifications select" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- 3. Allow users to update (mark read) their own notifications
CREATE POLICY "Notifications update" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

-- 4. Allow users to delete their own notifications
CREATE POLICY "Notifications delete" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- 5. Allow authenticated users (patients requesting medicines, pharmacies updating status, admins) to send notifications
CREATE POLICY "Notifications insert" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR public.is_admin());

-- 6. Add notifications to Supabase Realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore if already added or publication missing in development
  NULL;
END $$;
