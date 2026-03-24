export type Role = 'nena' | 'pare' | 'mare'
export type RoutineCategory = 'mati' | 'tarda' | 'nit' | 'cap_de_setmana'
export type BehaviorScore = 'good' | 'ok' | 'bad' | 'skip'
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
  active_weekdays: number   // bitmask: bit0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat (127=all)
  emoji: string
  order_index: number
}

export interface FantasticAnimal {
  id: string
  level_required: number
  name: string
  emoji: string
  description: string
}

export interface ProfileAnimal {
  id: string
  profile_id: string
  animal_id: string
  unlocked_at: string
  animal?: FantasticAnimal
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

// 20-level progression system
// Points required to REACH each level (index 0 = level 1)
export const LEVEL_POINTS: number[] = [
  0,      // Lvl 1
  300,    // Lvl 2
  700,    // Lvl 3
  1_500,  // Lvl 4
  2_500,  // Lvl 5
  4_000,  // Lvl 6
  6_000,  // Lvl 7
  8_500,  // Lvl 8
  11_500, // Lvl 9
  15_000, // Lvl 10
  19_000, // Lvl 11
  24_000, // Lvl 12
  30_000, // Lvl 13
  37_000, // Lvl 14
  45_000, // Lvl 15
  54_000, // Lvl 16
  64_000, // Lvl 17
  75_000, // Lvl 18
  88_000, // Lvl 19
  100_000,// Lvl 20
]

export const MAX_LEVEL = LEVEL_POINTS.length  // 20

export const LEVEL_NAMES: Record<number, string> = {
  1:  'Principiant',
  2:  'Aprenent',
  3:  'Estudiosa',
  4:  'Estel',
  5:  'Brillant',
  6:  'En Forma',
  7:  'Llamp',
  8:  'Estelada',
  9:  'Experta',
  10: 'Medallista',
  11: 'Diamant',
  12: 'Campiona',
  13: 'Reina',
  14: 'Arc de Sant Martí',
  15: 'Papallona',
  16: 'Coet',
  17: 'Lluna',
  18: 'Sol',
  19: 'Galàxia',
  20: 'Llegenda Suprema',
}

export const LEVEL_EMOJIS: Record<number, string> = {
  1:  '🌱',
  2:  '🌿',
  3:  '📚',
  4:  '⭐',
  5:  '🌟',
  6:  '🔥',
  7:  '⚡',
  8:  '💫',
  9:  '🎯',
  10: '🏅',
  11: '💎',
  12: '🏆',
  13: '👑',
  14: '🌈',
  15: '🦋',
  16: '🚀',
  17: '🌙',
  18: '☀️',
  19: '🌌',
  20: '🌠',
}

// Keep for backwards compat (used in a few places)
export const LEVEL_THRESHOLDS = LEVEL_NAMES

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
