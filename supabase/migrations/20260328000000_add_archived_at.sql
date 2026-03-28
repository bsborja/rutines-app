-- Add archived_at column for soft-delete/archiving routines
ALTER TABLE routines ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;
