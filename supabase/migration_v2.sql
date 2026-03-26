-- ============================================================
-- MIGRATION V2: routine_schedule, profile_settings, reward_costs, animal_customizations
-- Execute this in the Supabase SQL Editor
-- ============================================================

-- 1. Routine schedule: per-profile, per-routine, per-day configuration
CREATE TABLE IF NOT EXISTS routine_schedule (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  routine_id    UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  day_of_week   INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=diumenge, 1=dilluns...6=dissabte
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(profile_id, routine_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_routine_schedule_profile ON routine_schedule(profile_id);
CREATE INDEX IF NOT EXISTS idx_routine_schedule_routine ON routine_schedule(routine_id);

ALTER TABLE routine_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on routine_schedule" ON routine_schedule FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE routine_schedule;

-- 2. Profile settings: per-profile economic settings
CREATE TABLE IF NOT EXISTS profile_settings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  max_weekly_euros  NUMERIC(10,2) NOT NULL DEFAULT 2.50,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_settings_profile ON profile_settings(profile_id);

ALTER TABLE profile_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on profile_settings" ON profile_settings FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE profile_settings;

-- 3. Reward costs: configurable per-reward cost in saldo/euros
CREATE TABLE IF NOT EXISTS reward_costs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id       TEXT NOT NULL UNIQUE, -- matches REWARD_TYPES.id
  euros_required  NUMERIC(10,2) NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reward_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on reward_costs" ON reward_costs FOR ALL USING (true) WITH CHECK (true);

-- Seed default reward costs
INSERT INTO reward_costs (reward_id, euros_required) VALUES
  ('activitat', 7.50),
  ('compra', 10.00),
  ('sopar', 15.00)
ON CONFLICT (reward_id) DO NOTHING;

-- 4. Animal customizations: per-profile, per-animal customization
CREATE TABLE IF NOT EXISTS animal_customizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  animal_id     TEXT NOT NULL,
  color         TEXT NOT NULL DEFAULT 'original',
  outfit        TEXT NOT NULL DEFAULT 'none',
  accessory     TEXT NOT NULL DEFAULT 'none',
  glasses       TEXT NOT NULL DEFAULT 'none',
  UNIQUE(profile_id, animal_id)
);

CREATE INDEX IF NOT EXISTS idx_animal_customizations_profile ON animal_customizations(profile_id);

ALTER TABLE animal_customizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on animal_customizations" ON animal_customizations FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE animal_customizations;

-- 5. Add "Llegir un llibre" weekend routine
INSERT INTO routines (name, description, category, base_points_good, base_points_ok, base_points_bad, is_weekend_only, emoji, order_index) VALUES
('Llegir un llibre',
 'Llegir almenys 15 minuts d''un llibre',
 'cap_de_setmana', 10, 3, -5, TRUE, '📖', 115)
ON CONFLICT DO NOTHING;

-- 6. Add delete policy for routine_logs (needed for re-scoring)
CREATE POLICY "Allow all deletes on routine_logs" ON routine_logs FOR DELETE USING (true);
