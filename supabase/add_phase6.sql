-- ============================================================
-- MIGRATION: Phase 6
-- - active_weekdays bitmask on routines
-- - 'skip' score type
-- - fantastic_animals catalog + profile_animals
-- - Esport de força higher base points
-- Execute in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. active_weekdays bitmask on routines
-- Bit 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
-- Default 127 = all 7 days
-- ============================================================
ALTER TABLE routines ADD COLUMN IF NOT EXISTS active_weekdays SMALLINT NOT NULL DEFAULT 127;

-- Dutxa: Monday(2) + Wednesday(8) + Saturday(64) = 74
UPDATE routines SET active_weekdays = 74  WHERE name = 'Dutxa';

-- Weekday-only: Mon(2)+Tue(4)+Wed(8)+Thu(16)+Fri(32) = 62
UPDATE routines SET active_weekdays = 62  WHERE name = 'Horari';
UPDATE routines SET active_weekdays = 62  WHERE name = 'Sortida escola';
UPDATE routines SET active_weekdays = 62  WHERE name = 'Motxilla';
UPDATE routines SET active_weekdays = 62  WHERE name = 'Conte';

-- ============================================================
-- 2. Esport de força: higher base points
-- ============================================================
UPDATE routines
SET base_points_good = 15,
    base_points_ok   = 5,
    base_points_bad  = -7
WHERE name = 'Esport de força';

-- ============================================================
-- 3. Add 'skip' to routine_logs score
-- ============================================================
ALTER TABLE routine_logs DROP CONSTRAINT IF EXISTS routine_logs_score_check;
ALTER TABLE routine_logs ADD CONSTRAINT routine_logs_score_check
  CHECK (score IN ('good', 'ok', 'bad', 'skip'));

-- ============================================================
-- 4. Fantastic animals catalog
-- ============================================================
CREATE TABLE IF NOT EXISTS fantastic_animals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_required INTEGER NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  emoji          TEXT NOT NULL,
  description    TEXT NOT NULL
);

INSERT INTO fantastic_animals (level_required, name, emoji, description) VALUES
(2,  'Drac de Foc',          '🐉',    'Petit però ferotge, primer company de viatge'),
(4,  'Sirena Lluminosa',     '🧜',    'Brillant com la lluna, viu entre les ones'),
(6,  'Fènix',                '🔥',    'Reneix de les cendres, més fort cada vegada'),
(8,  'Unicorn Daurat',       '🦄',    'Màgic i pur, galopa entre els arcs de Sant Martí'),
(10, 'Salamandra Voladora',  '🦎',    'Vola entre les flames sense cremar-se mai'),
(12, 'Grifó',                '🦅',    'Meitat àguila meitat lleó, guardià dels tresors'),
(14, 'Kitsune',              '🦊',    'Guineu màgica de 9 cues, antiga i sàvia'),
(16, 'Pegàs',                '🐴',    'Cavall alat dels déus, vola fins als núvols'),
(18, 'Gat de les Estrelles', '🐱',    'Guardià del cel nocturn, salta entre constel·lacions'),
(20, 'Lleó dels Núvols',     '🦁',    'El més poderós de tots, regna als cims del món')
ON CONFLICT (level_required) DO NOTHING;

-- ============================================================
-- 5. Profile animals (unlocked)
-- ============================================================
CREATE TABLE IF NOT EXISTS profile_animals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  animal_id   UUID NOT NULL REFERENCES fantastic_animals(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, animal_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_animals_profile ON profile_animals(profile_id);

ALTER TABLE profile_animals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on profile_animals" ON profile_animals FOR ALL USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE profile_animals;

-- ============================================================
-- 6. Unlock animals for existing profiles (retroactive)
-- ============================================================
INSERT INTO profile_animals (profile_id, animal_id)
SELECT p.id, fa.id
FROM profiles p
CROSS JOIN fantastic_animals fa
WHERE p.role = 'nena'
  AND p.level >= fa.level_required
ON CONFLICT DO NOTHING;
