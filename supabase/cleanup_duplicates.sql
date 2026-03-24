-- Cleanup: eliminar perfiles duplicados sin avatar
-- Mantén el perfil con más puntos (o el más antiguo si hay empate)
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Ver duplicados ANTES de borrar (solo lectura)
SELECT name, role, COUNT(*) as total,
       array_agg(id ORDER BY total_points DESC, created_at ASC) as ids,
       array_agg(avatar_url) as avatars
FROM profiles
GROUP BY name, role
HAVING COUNT(*) > 1;

-- 2. Borrar duplicados: para cada nombre, mantener el que tiene más puntos
--    (o el más antiguo si tienen los mismos), borrar el resto sin avatar
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY name, role
           ORDER BY total_points DESC, created_at ASC
         ) AS rn
  FROM profiles
)
DELETE FROM profiles
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
)
AND avatar_url IS NULL; -- Solo borra los que NO tienen foto

-- 3. Verificar resultado
SELECT name, role, total_points, avatar_url, created_at
FROM profiles
ORDER BY role, name;
