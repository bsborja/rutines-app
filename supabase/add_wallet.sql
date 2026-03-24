-- ============================================================
-- MIGRATION: Wallet (saldo acumulat + historial de liquidacions)
-- Execute this in the Supabase SQL Editor
-- ============================================================

-- Balance actual per perfil (una fila per nena)
CREATE TABLE IF NOT EXISTS wallet (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance_euros NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id)
);

-- Historial de transaccions (guanys + liquidacions)
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_euros  NUMERIC(10,2) NOT NULL,  -- positiu = guany, negatiu = liquidació
  type          TEXT NOT NULL CHECK (type IN ('earn', 'liquidate')),
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_profile ON wallet(profile_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_profile ON wallet_transactions(profile_id, created_at DESC);

-- RLS
ALTER TABLE wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on wallet" ON wallet FOR ALL USING (true);
CREATE POLICY "Allow all on wallet_transactions" ON wallet_transactions FOR ALL USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE wallet;
ALTER PUBLICATION supabase_realtime ADD TABLE wallet_transactions;
