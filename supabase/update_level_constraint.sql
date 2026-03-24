-- ============================================================
-- MIGRATION: Ampliar nivells de 5 a 20
-- Execute this in the Supabase SQL Editor
-- ============================================================

-- 1. Eliminar el constraint antic (BETWEEN 1 AND 5)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_level_check;

-- 2. Afegir el nou constraint (BETWEEN 1 AND 20)
ALTER TABLE profiles
  ADD CONSTRAINT profiles_level_check CHECK (level BETWEEN 1 AND 20);

-- 3. Recalcular el nivell de totes les nenes amb les noves llindars
UPDATE profiles
SET level = CASE
  WHEN total_points >= 100000 THEN 20
  WHEN total_points >= 88000  THEN 19
  WHEN total_points >= 75000  THEN 18
  WHEN total_points >= 64000  THEN 17
  WHEN total_points >= 54000  THEN 16
  WHEN total_points >= 45000  THEN 15
  WHEN total_points >= 37000  THEN 14
  WHEN total_points >= 30000  THEN 13
  WHEN total_points >= 24000  THEN 12
  WHEN total_points >= 19000  THEN 11
  WHEN total_points >= 15000  THEN 10
  WHEN total_points >= 11500  THEN 9
  WHEN total_points >= 8500   THEN 8
  WHEN total_points >= 6000   THEN 7
  WHEN total_points >= 4000   THEN 6
  WHEN total_points >= 2500   THEN 5
  WHEN total_points >= 1500   THEN 4
  WHEN total_points >= 700    THEN 3
  WHEN total_points >= 300    THEN 2
  ELSE 1
END
WHERE role = 'nena';

-- 4. Verificar el resultat
SELECT name, role, total_points, level
FROM profiles
ORDER BY role, total_points DESC;
