import {
  BehaviorScore,
  RoutineLog,
  LEVEL_POINTS,
  MAX_LEVEL,
  MAX_WEEKLY_EUROS,
  Routine,
  EffectivePoints,
  RoutinePointsOverride,
  ROUTINE_WEEKLY_DAYS,
} from '@/types'
import { supabase } from './supabase'

// Calculate points for a behavior
export function calculatePoints(
  score: BehaviorScore,
  basePointsGood: number,
  basePointsOk: number,
  basePointsBad: number,
  loggedByParent: boolean = false,
): number {
  switch (score) {
    case 'good':
      return basePointsGood
    case 'ok':
      return basePointsOk
    case 'bad':
      // Parents register 50% more negative impact
      return loggedByParent ? Math.round(basePointsBad * 1.5) : basePointsBad
  }
}

// Get current week's start date (Monday)
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

// Get current month start
export function getMonthStart(date: Date = new Date()): string {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

// Calculate weekly points from logs (minimum 0)
export async function getWeeklyPoints(profileId: string): Promise<number> {
  const weekStart = getWeekStart()
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const { data, error } = await supabase
    .from('routine_logs')
    .select('points_awarded')
    .eq('profile_id', profileId)
    .gte('created_at', weekStart)
    .lt('created_at', weekEnd.toISOString().split('T')[0])

  if (error || !data) return 0

  const total = data.reduce((sum, log) => sum + log.points_awarded, 0)
  return Math.max(0, total) // Minimum 0
}

// Calculate monthly points
export async function getMonthlyPoints(profileId: string): Promise<number> {
  const monthStart = getMonthStart()
  const nextMonth = new Date(monthStart)
  nextMonth.setMonth(nextMonth.getMonth() + 1)

  const { data, error } = await supabase
    .from('routine_logs')
    .select('points_awarded')
    .eq('profile_id', profileId)
    .gte('created_at', monthStart)
    .lt('created_at', nextMonth.toISOString().split('T')[0])

  if (error || !data) return 0

  const total = data.reduce((sum, log) => sum + log.points_awarded, 0)
  return Math.max(0, total)
}

// Get per-profile routine point overrides from DB
// Returns a map of routineId → EffectivePoints
export async function getProfileRoutinePoints(
  profileId: string,
): Promise<Map<string, EffectivePoints>> {
  const { data } = await supabase
    .from('routine_points')
    .select('*')
    .eq('profile_id', profileId)

  const map = new Map<string, EffectivePoints>()
  if (data) {
    for (const row of data as RoutinePointsOverride[]) {
      map.set(row.routine_id, {
        good: row.points_good,
        ok: row.points_ok,
        bad: row.points_bad,
      })
    }
  }
  return map
}

// Get effective points for a routine (override > base)
export function getEffectivePoints(
  routine: Routine,
  profilePoints: Map<string, EffectivePoints>,
): EffectivePoints {
  return (
    profilePoints.get(routine.id) ?? {
      good: routine.base_points_good,
      ok: routine.base_points_ok,
      bad: routine.base_points_bad,
    }
  )
}

// Calculate theoretical max weekly points for a profile
// (all routines done "Bé" every day they appear)
export function calcMaxWeeklyPoints(
  routines: Routine[],
  profilePoints: Map<string, EffectivePoints>,
): number {
  return routines.reduce((sum, r) => {
    const pts = getEffectivePoints(r, profilePoints)
    const days = ROUTINE_WEEKLY_DAYS[r.category]
    return sum + pts.good * days
  }, 0)
}

// Points-per-euro ratio for a profile this week
export function calcPointsPerEuro(maxWeeklyPoints: number): number {
  if (maxWeeklyPoints <= 0) return 216 // fallback
  return maxWeeklyPoints / MAX_WEEKLY_EUROS
}

// Convert points to euros using dynamic ratio
export function pointsToEuros(points: number, pointsPerEuro?: number): number {
  const ratio = pointsPerEuro ?? 216 // default fallback
  return Math.round((points / ratio) * 100) / 100
}

// Get level (1–20) from total points
export function getLevelFromPoints(totalPoints: number): number {
  let level = 1
  for (let i = LEVEL_POINTS.length - 1; i >= 0; i--) {
    if (totalPoints >= LEVEL_POINTS[i]) {
      level = i + 1
      break
    }
  }
  return Math.min(level, MAX_LEVEL)
}

// Get progress to next level (0–1)
export function getLevelProgress(totalPoints: number): number {
  const level = getLevelFromPoints(totalPoints)
  if (level >= MAX_LEVEL) return 1

  const currentThreshold = LEVEL_POINTS[level - 1]
  const nextThreshold = LEVEL_POINTS[level]
  return (totalPoints - currentThreshold) / (nextThreshold - currentThreshold)
}

// Check if a routine has been logged today
export async function isRoutineLoggedToday(
  profileId: string,
  routineId: string,
): Promise<RoutineLog | null> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data } = await supabase
    .from('routine_logs')
    .select('*')
    .eq('profile_id', profileId)
    .eq('routine_id', routineId)
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)

  return (data?.[0] as RoutineLog) || null
}

// Calculate current streak (consecutive days with at least one "good" log)
export async function getCurrentStreak(profileId: string): Promise<number> {
  const { data } = await supabase
    .from('routine_logs')
    .select('created_at, score')
    .eq('profile_id', profileId)
    .eq('score', 'good')
    .order('created_at', { ascending: false })
    .limit(100)

  if (!data || data.length === 0) return 0

  const goodDays = new Set(
    data.map((log) => new Date(log.created_at).toISOString().split('T')[0]),
  )

  let streak = 0
  const today = new Date()

  for (let i = 0; i < 100; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]

    if (goodDays.has(dateStr)) {
      streak++
    } else if (i > 0) {
      // Allow today to not have logs yet
      break
    }
  }

  return streak
}

// Award badges based on streaks
export async function checkAndAwardBadges(profileId: string): Promise<string[]> {
  const streak = await getCurrentStreak(profileId)
  const newBadges: string[] = []
  const milestones: Array<{ days: number; type: string }> = [
    { days: 3, type: 'streak_3' },
    { days: 7, type: 'streak_7' },
    { days: 30, type: 'streak_30' },
  ]

  for (const milestone of milestones) {
    if (streak >= milestone.days) {
      // Check if badge already awarded
      const { data: existing } = await supabase
        .from('badges')
        .select('id')
        .eq('profile_id', profileId)
        .eq('badge_type', milestone.type)
        .limit(1)

      if (!existing || existing.length === 0) {
        await supabase.from('badges').insert({
          profile_id: profileId,
          badge_type: milestone.type,
        })
        newBadges.push(milestone.type)
      }
    }
  }

  return newBadges
}

// Update profile total points and level
export async function updateProfilePoints(profileId: string, pointsDelta: number): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_points')
    .eq('id', profileId)
    .single()

  if (!profile) return

  const newTotal = Math.max(0, profile.total_points + pointsDelta)
  const newLevel = getLevelFromPoints(newTotal)

  await supabase
    .from('profiles')
    .update({ total_points: newTotal, level: newLevel })
    .eq('id', profileId)
}

// Hash PIN with SHA-256
export async function hashPin(pin: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(pin)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Verify PIN
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  const inputHash = await hashPin(pin)
  return inputHash === hash
}

// Get today's logs for a profile
export async function getTodayLogs(profileId: string): Promise<RoutineLog[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data } = await supabase
    .from('routine_logs')
    .select('*, routine:routines(*)')
    .eq('profile_id', profileId)
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString())

  return (data as RoutineLog[]) || []
}

// Get all girls' weekly points for leaderboard
export async function getAllGirlsWeeklyPoints(): Promise<Record<string, number>> {
  const weekStart = getWeekStart()
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const { data } = await supabase
    .from('routine_logs')
    .select('profile_id, points_awarded, profiles!inner(role)')
    .eq('profiles.role', 'nena')
    .gte('created_at', weekStart)
    .lt('created_at', weekEnd.toISOString().split('T')[0])

  if (!data) return {}

  const result: Record<string, number> = {}
  for (const log of data as unknown as (RoutineLog & { profiles: { role: string } })[]) {
    const key = log.profile_id
    result[key] = Math.max(0, (result[key] || 0) + log.points_awarded)
  }

  return result
}
