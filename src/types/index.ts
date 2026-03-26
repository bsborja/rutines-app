export type Role = 'nena' | 'pare' | 'mare'
export type RoutineCategory = 'mati' | 'tarda' | 'nit' | 'cap_de_setmana'
export type BehaviorScore = 'good' | 'ok' | 'bad'
export type LevelName = 'Principiant' | 'Aprenent' | 'Estel' | 'Campiona' | 'Llegenda'
export type BadgeType = 'streak_3' | 'streak_7' | 'streak_30'

export interface Profile {
  id: string
  name: string
  role: Role
  birth_date: string | null
  avatar_url: string | null
  pin_hash: string | null
  level: number
  total_points: number
  color: string
  is_julia_mode: boolean
  created_at: string
}

export interface Routine {
  id: string
  name: string
  description: string
  category: RoutineCategory
  base_points_good: number
  base_points_ok: number
  base_points_bad: number
  is_weekend_only: boolean
  is_active?: boolean
  emoji: string
  order_index: number
}

// Per-profile, per-routine point overrides (from routine_points table)
export interface RoutinePointsOverride {
  id: string
  profile_id: string
  routine_id: string
  points_good: number
  points_ok: number
  points_bad: number
  updated_at: string
}

// Effective points for a routine (resolved from override or base)
export interface EffectivePoints {
  good: number
  ok: number
  bad: number
}

export interface RoutineLog {
  id: string
  profile_id: string
  routine_id: string
  score: BehaviorScore
  points_awarded: number
  logged_by: string
  created_at: string
  routine?: Routine
  logger?: Profile
}

export interface WeeklySummary {
  id: string
  profile_id: string
  week_start: string
  total_points: number
  equivalent_euros: number
  created_at: string
}

export interface Badge {
  id: string
  profile_id: string
  badge_type: BadgeType
  earned_at: string
}

export interface Session {
  profileId: string
  role: Role
  name: string
}

export const LEVEL_THRESHOLDS: Record<number, LevelName> = {
  1: 'Principiant',
  2: 'Aprenent',
  3: 'Estel',
  4: 'Campiona',
  5: 'Llegenda',
}

export const LEVEL_POINTS: number[] = [0, 200, 600, 1500, 3500]

export const POINTS_PER_EURO = 40

export const LEVEL_EMOJIS: Record<number, string> = {
  1: '🌱',
  2: '📚',
  3: '⭐',
  4: '🏆',
  5: '👑',
}

export const BADGE_INFO: Record<BadgeType, { label: string; emoji: string; description: string }> = {
  streak_3: { label: '3 dies seguits', emoji: '🔥', description: 'Ho ha fet bé 3 dies seguits' },
  streak_7: { label: '7 dies seguits', emoji: '⚡', description: 'Ho ha fet bé 7 dies seguits' },
  streak_30: { label: '30 dies seguits', emoji: '💎', description: 'Ho ha fet bé 30 dies seguits' },
}

export const CATEGORY_LABELS: Record<RoutineCategory, string> = {
  mati: '🌅 Matí',
  tarda: '☀️ Tarda',
  nit: '🌙 Nit',
  cap_de_setmana: '🎉 Cap de Setmana',
}

export const CATEGORY_COLORS: Record<RoutineCategory, string> = {
  mati: '#FFB800',
  tarda: '#FF6B35',
  nit: '#6C63FF',
  cap_de_setmana: '#00C896',
}

export const PROFILE_COLORS: Record<string, string> = {
  Maria: '#9B59B6',
  Berta: '#F39C12',
  Julia: '#E74C3C',
  Borja: '#3498DB',
  Montse: '#1ABC9C',
}

// --- Economics ---
// Max euros a girl can earn per week (all routines done "Bé" every day)
export const MAX_WEEKLY_EUROS = 2.50

// Reward costs in euros (NOT points — points required is dynamic per profile)
export const REWARD_TYPES = [
  {
    id: 'activitat',
    label: 'Escollir activitat de cap de setmana',
    emoji: '🎪',
    eurosRequired: 7.50,
  },
  {
    id: 'compra',
    label: 'Comprar alguna cosa',
    emoji: '🛍️',
    eurosRequired: 10.00,
  },
  {
    id: 'sopar',
    label: 'Sopar a soles amb un pare',
    emoji: '🍽️',
    eurosRequired: 15.00,
  },
]

// Days per week each routine category appears
export const ROUTINE_WEEKLY_DAYS: Record<RoutineCategory, number> = {
  mati: 5,
  tarda: 5,
  nit: 5,
  cap_de_setmana: 2,
}
