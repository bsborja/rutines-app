import { supabase } from './supabase'
import { MASTERY_MEDALS } from '@/types'

/**
 * Returns the mastery medal key whose routine keyword is contained in the
 * given routine name, or null if none matches. Used to determine whether a
 * routine is linked to a medal.
 */
export function getMedalKeyForRoutine(routineName: string): string | null {
  const lower = routineName.toLowerCase()
  for (const medal of MASTERY_MEDALS) {
    if (lower.includes(medal.key.toLowerCase())) return medal.key
  }
  return null
}

export interface MedalRevocation {
  id: string
  profile_id: string
  medal_key: string
  revoked_at: string
  reason: string | null
}

/**
 * Returns the latest (most recent) revocation row for (profile, medal),
 * or null if none exists.
 */
export async function getLatestRevocation(
  profileId: string,
  medalKey: string,
): Promise<MedalRevocation | null> {
  const { data } = await supabase
    .from('medal_revocations')
    .select('*')
    .eq('profile_id', profileId)
    .eq('medal_key', medalKey)
    .order('revoked_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as MedalRevocation | null) ?? null
}

/**
 * Insert a revocation. Called when the girl fails (score='bad') twice in the
 * same ISO week for a routine linked to a medal she had earned.
 */
export async function revokeMedal(
  profileId: string,
  medalKey: string,
  reason: string,
): Promise<void> {
  await supabase.from('medal_revocations').insert({
    profile_id: profileId,
    medal_key: medalKey,
    reason,
  })
}

/**
 * Count 'bad' logs this ISO week for all routines whose name contains the
 * medal keyword. Used to decide whether to auto-revoke.
 */
export async function countBadThisWeekForMedal(
  profileId: string,
  medalKey: string,
): Promise<number> {
  // Week starts Monday, local time
  const now = new Date()
  const day = now.getDay() === 0 ? 6 : now.getDay() - 1
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - day)
  weekStart.setHours(0, 0, 0, 0)

  const { data: routines } = await supabase
    .from('routines')
    .select('id, name')
  if (!routines) return 0

  const matchingIds = (routines as { id: string; name: string }[])
    .filter((r) => r.name.toLowerCase().includes(medalKey.toLowerCase()))
    .map((r) => r.id)

  if (matchingIds.length === 0) return 0

  const { count } = await supabase
    .from('routine_logs')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .in('routine_id', matchingIds)
    .eq('score', 'bad')
    .gte('created_at', weekStart.toISOString())

  return count ?? 0
}
