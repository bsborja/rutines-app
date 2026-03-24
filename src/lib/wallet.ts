import { supabase } from './supabase'

export interface WalletTransaction {
  id: string
  profile_id: string
  amount_euros: number
  type: 'earn' | 'liquidate'
  description: string | null
  created_at: string
}

// Get current wallet balance for a profile (creates row if not exists)
export async function getWalletBalance(profileId: string): Promise<number> {
  const { data } = await supabase
    .from('wallet')
    .select('balance_euros')
    .eq('profile_id', profileId)
    .single()

  return data ? Number(data.balance_euros) : 0
}

// Add or subtract euros from the wallet
// deltaEuros can be positive (earn) or negative (correction)
export async function updateWalletEuros(profileId: string, deltaEuros: number): Promise<void> {
  if (deltaEuros === 0) return

  // Upsert wallet row (balance never goes below 0)
  const { data: existing } = await supabase
    .from('wallet')
    .select('balance_euros')
    .eq('profile_id', profileId)
    .single()

  const current = existing ? Number(existing.balance_euros) : 0
  const newBalance = Math.max(0, Math.round((current + deltaEuros) * 100) / 100)

  await supabase.from('wallet').upsert(
    { profile_id: profileId, balance_euros: newBalance, updated_at: new Date().toISOString() },
    { onConflict: 'profile_id' },
  )

  // Only record earn transactions > 0 to avoid cluttering history with tiny corrections
  if (deltaEuros > 0.005) {
    await supabase.from('wallet_transactions').insert({
      profile_id: profileId,
      amount_euros: Math.round(deltaEuros * 100) / 100,
      type: 'earn',
      description: null,
    })
  }
}

// Liquidate: zero balance, record the transaction
export async function liquidateWallet(profileId: string): Promise<number> {
  const balance = await getWalletBalance(profileId)
  if (balance <= 0) return 0

  // Record liquidation
  await supabase.from('wallet_transactions').insert({
    profile_id: profileId,
    amount_euros: -balance,
    type: 'liquidate',
    description: `Liquidació de ${balance.toFixed(2)}€`,
  })

  // Zero the balance
  await supabase
    .from('wallet')
    .update({ balance_euros: 0, updated_at: new Date().toISOString() })
    .eq('profile_id', profileId)

  return balance
}

// Get liquidation history (most recent first)
export async function getWalletHistory(profileId: string, limit = 20): Promise<WalletTransaction[]> {
  const { data } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data as WalletTransaction[]) || []
}
