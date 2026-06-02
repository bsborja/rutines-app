-- ============================================================
-- Renumber fantastic animals: from level 6 onwards, unlock every level.
-- Old levels: 2, 4, 6, 8, 10, 12, 14, 16, 18, 20
-- New levels: 2, 4, 6, 7,  8,  9, 10, 11, 12, 13
-- Updates run in safe order to avoid colliding with the UNIQUE constraint.
-- Then retroactively unlocks animals for profiles that have reached the
-- new (lower) level thresholds.
-- ============================================================

UPDATE fantastic_animals SET level_required = 7  WHERE name = 'Unicorn Daurat';
UPDATE fantastic_animals SET level_required = 8  WHERE name = 'Salamandra Voladora';
UPDATE fantastic_animals SET level_required = 9  WHERE name = 'Grifó';
UPDATE fantastic_animals SET level_required = 10 WHERE name = 'Kitsune';
UPDATE fantastic_animals SET level_required = 11 WHERE name = 'Pegàs';
UPDATE fantastic_animals SET level_required = 12 WHERE name = 'Gat de les Estrelles';
UPDATE fantastic_animals SET level_required = 13 WHERE name = 'Lleó dels Núvols';

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
