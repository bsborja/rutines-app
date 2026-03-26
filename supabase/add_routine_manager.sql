-- ============================================================
-- RUTINES APP - Routine Manager Migration
-- Run this in the Supabase SQL Editor to enable routine management
-- ============================================================

-- Add is_active column to routines (TRUE = visible in dashboard, FALSE = hidden)
ALTER TABLE routines ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Add missing RLS policies for routine management (create, update, delete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'routines' AND policyname = 'Allow all inserts on routines'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow all inserts on routines" ON routines FOR INSERT WITH CHECK (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'routines' AND policyname = 'Allow all updates on routines'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow all updates on routines" ON routines FOR UPDATE USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'routines' AND policyname = 'Allow all deletes on routines'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow all deletes on routines" ON routines FOR DELETE USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'routine_logs' AND policyname = 'Allow all deletes on routine_logs'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow all deletes on routine_logs" ON routine_logs FOR DELETE USING (true)';
  END IF;
END
$$;
