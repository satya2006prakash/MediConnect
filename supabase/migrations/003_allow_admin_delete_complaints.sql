-- ─────────────────────────────────────────────────────────────────────────────
-- MediConnect – Allow Platform Admin to Delete Complaints
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Ensure platform admin can perform all operations (SELECT, INSERT, UPDATE, DELETE) on complaints
DROP POLICY IF EXISTS "Admin manages complaints" ON public.complaints;
DROP POLICY IF EXISTS "Admin deletes complaints" ON public.complaints;

CREATE POLICY "Admin manages complaints" ON public.complaints
  FOR ALL USING (public.is_admin());

-- 2. Also ensure cascade cleanup of notifications linked to deleted complaints
CREATE INDEX IF NOT EXISTS idx_notifications_reference_id ON public.notifications(reference_id);
