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

// Points per euro conversion rate
export const POINTS_PER_EURO = 40

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

// --- Routine Schedule ---
// Per-profile, per-routine, per-day schedule configuration
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0=diumenge, 1=dilluns...6=dissabte

export const DAY_LABELS: Record<DayOfWeek, string> = {
  1: 'Dl',
  2: 'Dm',
  3: 'Dc',
  4: 'Dj',
  5: 'Dv',
  6: 'Ds',
  0: 'Dg',
}

export const DAY_LABELS_FULL: Record<DayOfWeek, string> = {
  1: 'Dilluns',
  2: 'Dimarts',
  3: 'Dimecres',
  4: 'Dijous',
  5: 'Divendres',
  6: 'Dissabte',
  0: 'Diumenge',
}

export interface RoutineSchedule {
  id: string
  profile_id: string
  routine_id: string
  day_of_week: DayOfWeek
  enabled: boolean
}

// --- Profile Settings ---
export interface ProfileSettings {
  id: string
  profile_id: string
  max_weekly_euros: number
  updated_at: string
}

// --- Mastery Medals ---
export interface MasteryMedal {
  id: string
  key: string
  name: string
  emoji: string
  description: string
  funReason: string
  condition: (stats: RoutineStats) => boolean
}

export interface RoutineStats {
  routineId: string
  routineName: string
  totalLogs: number
  goodLogs: number
  goodRate: number
  currentStreak: number
  longestStreak: number
}

// --- Unlockable Animals ---
export type AnimalAccessory = 'none' | 'gorra_pirata' | 'gorra_festa' | 'gorra_mag'
export type AnimalGlasses = 'none' | 'ulleres_sol' | 'ulleres_estrella' | 'ulleres_cor'
export type AnimalOutfit = 'none' | 'samarreta_heroi' | 'capa_reial' | 'armadura'

export interface UnlockableAnimal {
  id: string
  name: string
  emoji: string
  pointsRequired: number
  description: string
}

export interface AnimalCustomization {
  id: string
  profile_id: string
  animal_id: string
  color: string
  outfit: AnimalOutfit
  accessory: AnimalAccessory
  glasses: AnimalGlasses
}

// Unlockable animals catalog
export const ANIMALS: UnlockableAnimal[] = [
  { id: 'gat', name: 'Gat Màgic', emoji: '🐱', pointsRequired: 50, description: 'Un gat que brilla a la foscor' },
  { id: 'gos', name: 'Gos Aventurer', emoji: '🐶', pointsRequired: 100, description: 'Un gos que li encanta explorar' },
  { id: 'unicorn', name: 'Unicorn', emoji: '🦄', pointsRequired: 200, description: 'Un unicorn amb purpurina' },
  { id: 'drac', name: 'Drac Petit', emoji: '🐲', pointsRequired: 350, description: 'Un drac que fa foc de colors' },
  { id: 'aguila', name: 'Àguila Daurada', emoji: '🦅', pointsRequired: 500, description: 'Una àguila que vola altíssim' },
  { id: 'dofin', name: 'Dofí Saltador', emoji: '🐬', pointsRequired: 700, description: 'Un dofí que fa acrobàcies' },
  { id: 'lleopa', name: 'Lleopard de Neu', emoji: '🐆', pointsRequired: 1000, description: 'Un lleopard invisible a la neu' },
  { id: 'fenix', name: 'Fènix', emoji: '🔥', pointsRequired: 1500, description: 'Un ocell de foc immortal' },
  { id: 'kraken', name: 'Kraken Amistós', emoji: '🐙', pointsRequired: 2000, description: 'Un kraken que fa abraçades' },
  { id: 'dragoma', name: 'Dragó Llegendari', emoji: '🐉', pointsRequired: 3000, description: 'El rei de tots els animals fantàstics' },
]

// Mastery medals catalog
export const MASTERY_MEDALS: Omit<MasteryMedal, 'condition'>[] = [
  {
    id: 'esmorzar_pro',
    key: 'esmorzar',
    name: 'Devorador d\'Esmorzars',
    emoji: '🥣',
    description: 'Esmorzar bé 20 vegades',
    funReason: 'Perquè el teu estómac ja té despertador propi!',
  },
  {
    id: 'roba_ninja',
    key: 'roba',
    name: 'Ninja de la Roba',
    emoji: '🥷',
    description: 'Vestir-se sola bé 20 vegades',
    funReason: 'Et vestiràs més ràpid que un ninja en una emergència de moda!',
  },
  {
    id: 'pentinar_star',
    key: 'pentinar',
    name: 'Estrella del Pentinat',
    emoji: '💇‍♀️',
    description: 'Pentinar-se bé 20 vegades',
    funReason: 'El teu cabell està tan content que ja es pentina sol!',
  },
  {
    id: 'puntualitat_flash',
    key: 'horari',
    name: 'Flash de la Puntualitat',
    emoji: '⚡',
    description: 'Ser puntual 20 vegades',
    funReason: 'Arribes tan puntual que el rellotge et demana consells!',
  },
  {
    id: 'sortida_zen',
    key: 'sortida',
    name: 'Mestra Zen de Sortides',
    emoji: '🧘',
    description: 'Sortir bé de l\'escola 20 vegades',
    funReason: 'La tranquil·litat et segueix fins i tot a la porta de l\'escola!',
  },
  {
    id: 'motxilla_boss',
    key: 'motxilla',
    name: 'Cap de Motxilles',
    emoji: '🎒',
    description: 'Preparar la motxilla bé 20 vegades',
    funReason: 'La teva motxilla ja sap organitzar-se sola de tant que l\'has entrenat!',
  },
  {
    id: 'dutxa_sirena',
    key: 'dutxa',
    name: 'Sirena de la Dutxa',
    emoji: '🧜‍♀️',
    description: 'Dutxar-se bé 20 vegades',
    funReason: 'L\'aigua ja et coneix pel nom i et saluda cada cop!',
  },
  {
    id: 'sopar_chef',
    key: 'sopar',
    name: 'Xef del Sopar',
    emoji: '👨‍🍳',
    description: 'Sopar bé 20 vegades',
    funReason: 'El plat es queda buit tan ràpid que pensa que és màgia!',
  },
  {
    id: 'conte_biblio',
    key: 'conte',
    name: 'Bibliotecària Nocturna',
    emoji: '📖',
    description: 'Fer bé l\'hora del conte 20 vegades',
    funReason: 'Els personatges dels contes ja et consideren amiga personal!',
  },
  {
    id: 'dents_brillant',
    key: 'dents',
    name: 'Somriure Brillant',
    emoji: '✨',
    description: 'Rentar-se les dents bé 20 vegades',
    funReason: 'El teu somriure brilla tant que necessites ulleres de sol!',
  },
  {
    id: 'esport_heroi',
    key: 'esport_forca',
    name: 'Heroïna de la Força',
    emoji: '💪',
    description: 'Fer exercici de força bé 10 vegades',
    funReason: 'Ets tan forta que les formigues et demanen ajuda per portar fulletes!',
  },
  {
    id: 'esport_general_campiona',
    key: 'esport_general',
    name: 'Campiona Esportiva',
    emoji: '🏅',
    description: 'Fer esport en general bé 10 vegades',
    funReason: 'Fas tant esport que fins i tot el sofà s\'ha apuntat al gimnàs!',
  },
  {
    id: 'llegir_rata',
    key: 'llegir',
    name: 'Rata de Biblioteca',
    emoji: '📚',
    description: 'Llegir un llibre bé 10 vegades',
    funReason: 'Has llegit tant que les lletres ja et fan reverència quan obres un llibre!',
  },
  {
    id: 'setmana_perfecta',
    key: 'perfect_week',
    name: 'Setmana de Diamant',
    emoji: '💎',
    description: 'Tot "Bé" durant una setmana sencera',
    funReason: 'Una setmana tan perfecta que fins els diamants estan gelosos!',
  },
  {
    id: 'mes_constant',
    key: 'consistent_month',
    name: 'Roca de Granit',
    emoji: '🪨',
    description: 'Més del 80% "Bé" durant un mes',
    funReason: 'Ets tan constant que les muntanyes et diuen "germana"!',
  },
]

// Animal customization options
export const OUTFIT_OPTIONS: { id: AnimalOutfit; label: string; emoji: string }[] = [
  { id: 'none', label: 'Cap', emoji: '👻' },
  { id: 'samarreta_heroi', label: 'Samarreta d\'Heroi', emoji: '🦸' },
  { id: 'capa_reial', label: 'Capa Reial', emoji: '👑' },
  { id: 'armadura', label: 'Armadura', emoji: '🛡️' },
]

export const GLASSES_OPTIONS: { id: AnimalGlasses; label: string; emoji: string }[] = [
  { id: 'none', label: 'Cap', emoji: '👻' },
  { id: 'ulleres_sol', label: 'Ulleres de Sol', emoji: '🕶️' },
  { id: 'ulleres_estrella', label: 'Ulleres Estrella', emoji: '⭐' },
  { id: 'ulleres_cor', label: 'Ulleres de Cor', emoji: '❤️' },
]

export const ACCESSORY_OPTIONS: { id: AnimalAccessory; label: string; emoji: string }[] = [
  { id: 'none', label: 'Cap', emoji: '👻' },
  { id: 'gorra_pirata', label: 'Gorra Pirata', emoji: '🏴‍☠️' },
  { id: 'gorra_festa', label: 'Gorra de Festa', emoji: '🎉' },
  { id: 'gorra_mag', label: 'Barret de Mag', emoji: '🎩' },
]

export const ANIMAL_COLORS: { id: string; label: string; hex: string }[] = [
  { id: 'original', label: 'Original', hex: '#9B9B9B' },
  { id: 'blau', label: 'Blau', hex: '#3498DB' },
  { id: 'rosa', label: 'Rosa', hex: '#E91E8C' },
  { id: 'verd', label: 'Verd', hex: '#2ECC71' },
  { id: 'daurat', label: 'Daurat', hex: '#F1C40F' },
  { id: 'lila', label: 'Lila', hex: '#9B59B6' },
  { id: 'vermell', label: 'Vermell', hex: '#E74C3C' },
  { id: 'taronja', label: 'Taronja', hex: '#E67E22' },
]
