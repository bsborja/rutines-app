-- ============================================================
-- RUTINES APP - Supabase Schema
-- Execute this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (girls + parents)
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('nena', 'pare', 'mare')),
  birth_date    DATE,
  avatar_url    TEXT,
  pin_hash      TEXT,
  level         INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
  total_points  INTEGER NOT NULL DEFAULT 0,
  color         TEXT NOT NULL DEFAULT '#9B59B6',
  is_julia_mode BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Routines catalog
CREATE TABLE IF NOT EXISTS routines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  category          TEXT NOT NULL CHECK (category IN ('mati', 'tarda', 'nit', 'cap_de_setmana')),
  base_points_good  INTEGER NOT NULL DEFAULT 10,
  base_points_ok    INTEGER NOT NULL DEFAULT 3,
  base_points_bad   INTEGER NOT NULL DEFAULT -5,
  is_weekend_only   BOOLEAN NOT NULL DEFAULT FALSE,
  emoji             TEXT NOT NULL DEFAULT '📌',
  order_index       INTEGER NOT NULL DEFAULT 0
);

-- Routine logs (behavior records)
CREATE TABLE IF NOT EXISTS routine_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  routine_id    UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  score         TEXT NOT NULL CHECK (score IN ('good', 'ok', 'bad')),
  points_awarded INTEGER NOT NULL,
  logged_by     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Weekly summaries (cached/denormalized for fast reads)
CREATE TABLE IF NOT EXISTS weekly_summaries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start       DATE NOT NULL,
  total_points     INTEGER NOT NULL DEFAULT 0,
  equivalent_euros NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, week_start)
);

-- Badges
CREATE TABLE IF NOT EXISTS badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_type  TEXT NOT NULL CHECK (badge_type IN ('streak_3', 'streak_7', 'streak_30')),
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, badge_type)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_routine_logs_profile_id ON routine_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_routine_logs_routine_id ON routine_logs(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_logs_created_at ON routine_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_routine_logs_profile_date ON routine_logs(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_profile ON weekly_summaries(profile_id, week_start);
CREATE INDEX IF NOT EXISTS idx_badges_profile ON badges(profile_id);
CREATE INDEX IF NOT EXISTS idx_routines_category ON routines(category);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Allow anon/authenticated to read/write all (family app, no per-user auth)
-- Adjust these policies to your security needs

CREATE POLICY "Allow all reads on profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Allow all inserts on profiles" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all updates on profiles" ON profiles FOR UPDATE USING (true);

CREATE POLICY "Allow all reads on routines" ON routines FOR SELECT USING (true);

CREATE POLICY "Allow all reads on routine_logs" ON routine_logs FOR SELECT USING (true);
CREATE POLICY "Allow all inserts on routine_logs" ON routine_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all reads on weekly_summaries" ON weekly_summaries FOR SELECT USING (true);
CREATE POLICY "Allow all on weekly_summaries" ON weekly_summaries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update weekly_summaries" ON weekly_summaries FOR UPDATE USING (true);

CREATE POLICY "Allow all reads on badges" ON badges FOR SELECT USING (true);
CREATE POLICY "Allow all inserts on badges" ON badges FOR INSERT WITH CHECK (true);

-- ============================================================
-- SUPABASE STORAGE: avatars bucket
-- ============================================================

-- Run this in the Supabase dashboard > Storage > Create bucket "avatars" (public)
-- Or execute:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
-- ON CONFLICT DO NOTHING;

-- Storage policies (allow all for family app)
-- CREATE POLICY "Allow uploads to avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');
-- CREATE POLICY "Allow reads from avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
-- CREATE POLICY "Allow updates to avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars');

-- ============================================================
-- SEED DATA: Routines catalog
-- ============================================================

INSERT INTO routines (name, description, category, base_points_good, base_points_ok, base_points_bad, is_weekend_only, emoji, order_index) VALUES

-- MATÍ
('Esmorzar',
 'Esmorzar sense queixes el que hi hagi',
 'mati', 10, 3, -5, FALSE, '🥣', 10),

('Roba',
 'Vestir-se de forma autònoma i sense queixes',
 'mati', 10, 3, -5, FALSE, '👗', 20),

('Pentinar',
 'Pentinar-se sense posar problemes',
 'mati', 10, 3, -5, FALSE, '💇', 30),

('Horari',
 'Estar preparada a l''hora per sortir cap a l''escola',
 'mati', 10, 3, -5, FALSE, '⏰', 40),

-- TARDA
('Sortida escola',
 'Sortir sense queixes, crits ni plorar',
 'tarda', 10, 3, -5, FALSE, '🏫', 50),

('Motxilla',
 'Desfer la motxilla i preparar la del dia següent de forma autònoma',
 'tarda', 10, 3, -5, FALSE, '🎒', 60),

-- NIT
('Dutxa',
 'Dutxar-se quan toca, de forma autònoma i sense queixes',
 'nit', 10, 3, -5, FALSE, '🚿', 70),

('Sopar',
 'Sopar correctament, menjant una quantitat mínima dels plats principals',
 'nit', 10, 3, -5, FALSE, '🍽️', 80),

('Conte',
 'Escollir contes sense conflictes i escoltar',
 'nit', 10, 3, -5, FALSE, '📚', 90),

('Dents i logopeda',
 'Rentar-se les dents i fer els exercicis de logopèdia',
 'nit', 10, 3, -5, FALSE, '🦷', 100),

-- CAP DE SETMANA
('Esport de força',
 'Fer exercici de força al matí',
 'cap_de_setmana', 10, 3, -5, TRUE, '💪', 110),

('Esport en general',
 'Fer esport (bici, esquí, excursió...)',
 'cap_de_setmana', 10, 3, -5, TRUE, '🚴', 120)

ON CONFLICT DO NOTHING;

-- ============================================================
-- REALTIME
-- ============================================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE routine_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE badges;
