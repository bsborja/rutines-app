-- Add is_super / is_anti flags to routines.
-- is_super: highlighted as super-rutina (floating button + visual priority).
-- is_anti:  anti-rutina (penalty button). Uniqueness is enforced at the app level.
ALTER TABLE routines ADD COLUMN IF NOT EXISTS is_super BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE routines ADD COLUMN IF NOT EXISTS is_anti  BOOLEAN NOT NULL DEFAULT FALSE;

-- Only one super and one anti routine can be active at a time (partial unique indexes).
CREATE UNIQUE INDEX IF NOT EXISTS routines_single_super
  ON routines ((TRUE)) WHERE is_super = TRUE AND archived_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS routines_single_anti
  ON routines ((TRUE)) WHERE is_anti = TRUE AND archived_at IS NULL;
