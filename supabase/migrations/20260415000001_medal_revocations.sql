-- Medal revocations table — tracks temporary revocation of mastery medals
-- A revocation is keyed by (profile_id, medal_key). Most recent row per
-- (profile_id, medal_key) is the active one. After a revocation, the girl
-- needs half the usual bones (10 instead of 20, or 5 instead of 10 for
-- weekend-only routines) logged as 'good' AFTER the revocation date to regain
-- the medal.

CREATE TABLE IF NOT EXISTS medal_revocations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  medal_key    text NOT NULL,
  revoked_at   timestamptz NOT NULL DEFAULT now(),
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS medal_revocations_profile_idx
  ON medal_revocations(profile_id, medal_key, revoked_at DESC);

-- RLS (if enabled elsewhere — keep consistent with app policy)
ALTER TABLE medal_revocations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow all on medal_revocations" ON medal_revocations FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
