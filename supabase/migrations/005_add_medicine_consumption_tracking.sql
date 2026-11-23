-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 005: Add Medicine Consumption & Daily Adherence Tracking
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add last_consumed_date column to public.medicines
ALTER TABLE public.medicines
  ADD COLUMN IF NOT EXISTS last_consumed_date date DEFAULT CURRENT_DATE;

-- 2. Backfill existing records: default to today or created_at date
UPDATE public.medicines
SET last_consumed_date = COALESCE(created_at::date, CURRENT_DATE)
WHERE last_consumed_date IS NULL;
