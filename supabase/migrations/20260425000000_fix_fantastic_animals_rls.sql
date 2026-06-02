-- ============================================================
-- FIX/RECOVERY: fantastic_animals + profile_animals
-- Recreates tables, seeds catalog, sets correct RLS, and
-- retroactively unlocks animals based on current profile levels.
-- Safe to run multiple times (idempotent).
-- ============================================================

-- 1. Catalog table
CREATE TABLE IF NOT EXISTS fantastic_animals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_required INTEGER NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  emoji          TEXT NOT NULL,
  description    TEXT NOT NULL
);

INSERT INTO fantastic_animals (level_required, name, emoji, description) VALUES
(2,  'Drac de Foc',          '🐉', 'Petit però ferotge, primer company de viatge'),
(4,  'Sirena Lluminosa',     '🧜', 'Brillant com la lluna, viu entre les ones'),
(6,  'Fènix',                '🔥', 'Reneix de les cendres, més fort cada vegada'),
(7,  'Unicorn Daurat',       '🦄', 'Màgic i pur, galopa entre els arcs de Sant Martí'),
(8,  'Salamandra Voladora',  '🦎', 'Vola entre les flames sense cremar-se mai'),
(9,  'Grifó',                '🦅', 'Meitat àguila meitat lleó, guardià dels tresors'),
(10, 'Kitsune',              '🦊', 'Guineu màgica de 9 cues, antiga i sàvia'),
(11, 'Pegàs',                '🐴', 'Cavall alat dels déus, vola fins als núvols'),
(12, 'Gat de les Estrelles', '🐱', 'Guardià del cel nocturn, salta entre constel·lacions'),
(13, 'Lleó dels Núvols',     '🦁', 'El més poderós de tots, regna als cims del món')
ON CONFLICT (level_required) DO NOTHING;

-- 2. Profile-animal join table
CREATE TABLE IF NOT EXISTS profile_animals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  animal_id   UUID NOT NULL REFERENCES fantastic_animals(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, animal_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_animals_profile ON profile_animals(profile_id);

-- 3. RLS — both tables
ALTER TABLE fantastic_animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_animals   ENABLE ROW LEVEL SECURITY;

-- Drop any prior policies so this script is re-runnable
DROP POLICY IF EXISTS "Allow all on fantastic_animals"             ON fantastic_animals;
DROP POLICY IF EXISTS "Allow all reads on fantastic_animals"       ON fantastic_animals;
DROP POLICY IF EXISTS "Enable read access for all users"           ON fantastic_animals;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON fantastic_animals;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON fantastic_animals;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON fantastic_animals;

DROP POLICY IF EXISTS "Allow all on profile_animals"               ON profile_animals;
DROP POLICY IF EXISTS "Allow all reads on profile_animals"         ON profile_animals;
DROP POLICY IF EXISTS "Allow all inserts on profile_animals"       ON profile_animals;

-- fantastic_animals: read-only for everyone (catalog), no writes
CREATE POLICY "Allow all reads on fantastic_animals"
  ON fantastic_animals FOR SELECT USING (true);

-- profile_animals: app needs read + insert (unlock); no update/delete needed
CREATE POLICY "Allow all reads on profile_animals"
  ON profile_animals FOR SELECT USING (true);
CREATE POLICY "Allow all inserts on profile_animals"
  ON profile_animals FOR INSERT WITH CHECK (true);

-- 4. Realtime (ignore error if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE profile_animals;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Retroactive unlock based on current levels
-- Defensive: only filter by role if the column exists in this DB
DO $$
DECLARE
  has_role BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND column_name  = 'role'
  ) INTO has_role;

  IF has_role THEN
    EXECUTE $sql$
      INSERT INTO profile_animals (profile_id, animal_id)
      SELECT p.id, fa.id
      FROM profiles p
      CROSS JOIN fantastic_animals fa
      WHERE p.role = 'nena'
        AND p.level >= fa.level_required
      ON CONFLICT DO NOTHING
    $sql$;
  ELSE
    EXECUTE $sql$
      INSERT INTO profile_animals (profile_id, animal_id)
      SELECT p.id, fa.id
      FROM profiles p
      CROSS JOIN fantastic_animals fa
      WHERE p.level >= fa.level_required
      ON CONFLICT DO NOTHING
    $sql$;
  END IF;
END $$;
