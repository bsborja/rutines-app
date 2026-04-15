-- Bloc 1.1 — Evitar duplicació de perfils
-- 1) Neteja duplicats existents: per cada (name, role) conservem el MÉS ANTIC
--    (created_at ascendent) i reassignem dades dels duplicats al canònic abans
--    d'esborrar-los (logs, badges, wallet, animals, points, settings, schedules).
-- 2) Afegim UNIQUE(name, role) per impedir futures duplicacions.

BEGIN;

-- Taula temporal amb el perfil "canònic" (més antic) per cada (name, role)
CREATE TEMP TABLE _canonical AS
SELECT DISTINCT ON (name, role)
  id AS canonical_id, name, role
FROM profiles
ORDER BY name, role, created_at ASC;

-- Taula temporal amb els duplicats i el seu canònic corresponent
CREATE TEMP TABLE _dupes AS
SELECT p.id AS dup_id, c.canonical_id
FROM profiles p
JOIN _canonical c ON c.name = p.name AND c.role = p.role
WHERE p.id <> c.canonical_id;

-- Reassignar referències dels duplicats al canònic (només si les taules existeixen)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'routine_logs', 'badges', 'wallet', 'wallet_transactions',
    'profile_animals', 'routine_points', 'profile_settings',
    'routine_schedules', 'weekly_summaries'
  ] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t) THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = t AND column_name = 'profile_id'
      ) THEN
        EXECUTE format(
          'UPDATE %I SET profile_id = d.canonical_id
             FROM _dupes d WHERE %I.profile_id = d.dup_id',
          t, t
        );
      END IF;
    END IF;
  END LOOP;
END $$;

-- Reassignar logged_by si apunta a un duplicat
UPDATE routine_logs rl
SET logged_by = d.canonical_id
FROM _dupes d
WHERE rl.logged_by = d.dup_id;

-- Ara sí, eliminar els perfils duplicats
DELETE FROM profiles p
USING _dupes d
WHERE p.id = d.dup_id;

-- Evitar futures duplicacions
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_name_role_unique;
ALTER TABLE profiles ADD CONSTRAINT profiles_name_role_unique UNIQUE (name, role);

COMMIT;
