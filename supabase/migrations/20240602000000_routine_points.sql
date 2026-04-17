-- ============================================================
-- MIGRATION: routine_points table + weekly auto-adjustment
-- ============================================================

CREATE TABLE IF NOT EXISTS routine_points (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  routine_id    UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  points_good   INTEGER NOT NULL DEFAULT 10,
  points_ok     INTEGER NOT NULL DEFAULT 3,
  points_bad    INTEGER NOT NULL DEFAULT -5,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, routine_id)
);

CREATE INDEX IF NOT EXISTS idx_routine_points_profile ON routine_points(profile_id);

ALTER TABLE routine_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all reads on routine_points"   ON routine_points FOR SELECT USING (true);
CREATE POLICY "Allow all inserts on routine_points" ON routine_points FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all updates on routine_points" ON routine_points FOR UPDATE USING (true);
CREATE POLICY "Allow all deletes on routine_points" ON routine_points FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE routine_points;

-- ============================================================
-- FUNCTION: weekly auto-adjustment (oferta-demanda)
-- ============================================================

CREATE OR REPLACE FUNCTION adjust_routine_points_weekly()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  rec RECORD;
  last_week_start DATE;
  last_week_end   DATE;
  total_logs      INTEGER;
  good_logs       INTEGER;
  good_rate       NUMERIC;
  cur_good        INTEGER;
  new_good        INTEGER;
  new_ok          INTEGER;
  new_bad         INTEGER;
BEGIN
  last_week_start := date_trunc('week', NOW() - INTERVAL '7 days')::DATE;
  last_week_end   := last_week_start + 7;

  FOR rec IN
    SELECT p.id AS profile_id, r.id AS routine_id,
           COALESCE(rp.points_good, r.base_points_good) AS points_good
    FROM profiles p
    CROSS JOIN routines r
    LEFT JOIN routine_points rp
      ON rp.profile_id = p.id AND rp.routine_id = r.id
    WHERE p.role = 'nena'
  LOOP
    SELECT
      COUNT(*) FILTER (WHERE score = 'good'),
      COUNT(*)
    INTO good_logs, total_logs
    FROM routine_logs
    WHERE profile_id = rec.profile_id
      AND routine_id = rec.routine_id
      AND created_at >= last_week_start
      AND created_at <  last_week_end;

    cur_good := rec.points_good;

    IF total_logs = 0 THEN
      new_good := LEAST(20, cur_good + 1);
    ELSE
      good_rate := good_logs::NUMERIC / total_logs;
      IF good_rate > 0.75 THEN
        new_good := GREATEST(5, cur_good - 1);
      ELSIF good_rate < 0.35 THEN
        new_good := LEAST(20, cur_good + 2);
      ELSE
        new_good := cur_good;
      END IF;
    END IF;

    new_ok  :=  GREATEST(2, ROUND(new_good * 0.30));
    new_bad := -GREATEST(2, ROUND(new_good * 0.50));

    INSERT INTO routine_points (profile_id, routine_id, points_good, points_ok, points_bad, updated_at)
    VALUES (rec.profile_id, rec.routine_id, new_good, new_ok, new_bad, NOW())
    ON CONFLICT (profile_id, routine_id)
    DO UPDATE SET
      points_good = EXCLUDED.points_good,
      points_ok   = EXCLUDED.points_ok,
      points_bad  = EXCLUDED.points_bad,
      updated_at  = NOW();
  END LOOP;
END;
$$;
