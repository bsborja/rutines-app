'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
  Badge,
  BadgeType,
  MASTERY_MEDALS,
  ANIMAL_COLORS,
  OUTFIT_OPTIONS,
  GLASSES_OPTIONS,
  ACCESSORY_OPTIONS,
  AnimalCustomization,
  AnimalOutfit,
  AnimalGlasses,
  AnimalAccessory,
  FantasticAnimal,
} from '@/types'

// ---------------------------------------------------------------------------
// Local animal catalog — mirrors DB seed
// ---------------------------------------------------------------------------

const ALL_ANIMALS: Omit<FantasticAnimal, 'id'>[] = [
  { level_required: 2,  name: 'Drac de Foc',          emoji: '🐉', description: 'Petit però ferotge, primer company de viatge' },
  { level_required: 4,  name: 'Sirena Lluminosa',      emoji: '🧜', description: 'Brillant com la lluna, viu entre les ones' },
  { level_required: 6,  name: 'Fènix',                 emoji: '🔥', description: 'Reneix de les cendres, més fort cada vegada' },
  { level_required: 8,  name: 'Unicorn Daurat',        emoji: '🦄', description: 'Màgic i pur, galopa entre els arcs de Sant Martí' },
  { level_required: 10, name: 'Salamandra Voladora',   emoji: '🦎', description: 'Vola entre les flames sense cremar-se mai' },
  { level_required: 12, name: 'Grifó',                 emoji: '🦅', description: 'Meitat àguila meitat lleó, guardià dels tresors' },
  { level_required: 14, name: 'Kitsune',               emoji: '🦊', description: 'Guineu màgica de 9 cues, antiga i sàvia' },
  { level_required: 16, name: 'Pegàs',                 emoji: '🐴', description: 'Cavall alat dels déus, vola fins als núvols' },
  { level_required: 18, name: 'Gat de les Estrelles',  emoji: '🐱', description: 'Guardià del cel nocturn, salta entre constel·lacions' },
  { level_required: 20, name: 'Lleó dels Núvols',      emoji: '🦁', description: 'El més poderós de tots, regna als cims del món' },
]

// Mystery hints shown in the locked modal — one per level tier
const MYSTERY_HINTS: Record<number, string> = {
  2:  'Un petit guardià amb escates brillants i alè ardent... el primer pas del teu viatge!',
  4:  'Es diu que viu sota la lluna, amb cua lluent que encanta les aigües...',
  6:  'Renaixerà de les cendres quan menys t\'ho esperis. Fes-te fort i el trobaràs!',
  8:  'Un animal pur amb banya màgica. Només els constants el coneixen...',
  10: 'Vola entre flames sense cremar-se. Quin poder! Quin color tindrà?',
  12: 'Mig àguila, mig lleó. Guarda tresors antics. Només els valents el desperten!',
  14: 'Sàvia i antiga, amb moltes cues. Qui serà? Un misteri oriental t\'espera!',
  16: 'Ales blanques entre núvols... els déus diuen que només els dignes el munten!',
  18: 'Un guardià del cel nocturn, entre constel·lacions. Esperant-te entre estrelles...',
  20: 'El més poderós i esquiu. Només els veritables mestres el coneixen. Hi arribaràs?',
}

// ---------------------------------------------------------------------------
// Color filter map
// ---------------------------------------------------------------------------

const COLOR_FILTERS: Record<string, string> = {
  original: 'none',
  blau:    'sepia(1) saturate(8) hue-rotate(185deg) brightness(1.1)',
  rosa:    'sepia(1) saturate(15) hue-rotate(290deg) brightness(1.0)',
  verd:    'sepia(1) saturate(8) hue-rotate(75deg) brightness(1.1)',
  daurat:  'sepia(1) saturate(6) hue-rotate(5deg) brightness(1.3)',
  lila:    'sepia(1) saturate(8) hue-rotate(240deg) brightness(0.95)',
  vermell: 'sepia(1) saturate(12) hue-rotate(310deg) brightness(1.0)',
  taronja: 'sepia(1) saturate(8) hue-rotate(15deg) brightness(1.15)',
}

const OUTFIT_EMOJI: Record<string, string> = {
  samarreta_heroi: '🦸',
  capa_reial: '🤴',
  armadura: '⚔️',
}

const GLASSES_EMOJI: Record<string, string> = {
  ulleres_sol: '🕶️',
  ulleres_estrella: '⭐',
  ulleres_cor: '❤️',
}

const ACCESSORY_EMOJI: Record<string, string> = {
  gorra_festa: '🎉',
  gorra_mag: '🎩',
  gorra_pirata: '🏴‍☠️',
}

type MergedAnimal = Omit<FantasticAnimal, 'id'> & { id: string; isUnlocked: boolean }

// ---------------------------------------------------------------------------
// Badge catalog (10 badges, 2x5 grid)
// ---------------------------------------------------------------------------

interface BadgeDef {
  id: string
  emoji: string
  name: string
  description: string
  // returns true when earned given the precomputed stats
  check: (s: BadgeStats) => boolean
}

interface BadgeStats {
  earnedDbBadges: Set<BadgeType>
  hasPerfectDay: boolean
  hasPerfectWeek: boolean
  masteryCount: number
  animalsUnlocked: number
  animalsTotal: number
  liquidationCount: number
}

const BADGE_CATALOG: BadgeDef[] = [
  {
    id: 'streak_3',
    emoji: '🔥',
    name: 'Primera ratxa',
    description: '3 dies seguits fent-ho bé',
    check: (s) => s.earnedDbBadges.has('streak_3'),
  },
  {
    id: 'streak_7',
    emoji: '⚡',
    name: 'Setmana de foc',
    description: '7 dies seguits fent-ho bé',
    check: (s) => s.earnedDbBadges.has('streak_7'),
  },
  {
    id: 'streak_30',
    emoji: '💎',
    name: 'Mes llegendari',
    description: '30 dies seguits fent-ho bé',
    check: (s) => s.earnedDbBadges.has('streak_30'),
  },
  {
    id: 'perfect_day',
    emoji: '✨',
    name: 'Dia perfecte',
    description: 'Un dia amb totes les rutines bé',
    check: (s) => s.hasPerfectDay,
  },
  {
    id: 'perfect_week',
    emoji: '🌟',
    name: 'Setmana perfecta',
    description: 'Una setmana amb totes les rutines bé',
    check: (s) => s.hasPerfectWeek,
  },
  {
    id: 'triple_mestratge',
    emoji: '🏆',
    name: 'Triple mestratge',
    description: '3 medalles de mestratge guanyades',
    check: (s) => s.masteryCount >= 3,
  },
  {
    id: 'multi_mestre',
    emoji: '🎯',
    name: 'Multi-mestre',
    description: '5 medalles de mestratge guanyades',
    check: (s) => s.masteryCount >= 5,
  },
  {
    id: 'colleccionista',
    emoji: '🐣',
    name: 'Col·leccionista',
    description: '5 animals fantàstics desbloquejats',
    check: (s) => s.animalsUnlocked >= 5,
  },
  {
    id: 'gran_colleccionista',
    emoji: '🐉',
    name: 'Gran col·leccionista',
    description: 'Tots els animals fantàstics desbloquejats',
    check: (s) => s.animalsTotal > 0 && s.animalsUnlocked >= s.animalsTotal,
  },
  {
    id: 'primer_premi',
    emoji: '💰',
    name: 'Primer premi',
    description: 'Has demanat la teva primera recompensa',
    check: (s) => s.liquidationCount >= 1,
  },
]

// ---------------------------------------------------------------------------
// AnimalPreview — overlaid accessories on the animal emoji
// ---------------------------------------------------------------------------

interface AnimalPreviewProps {
  emoji: string
  color: string
  outfit: string
  glasses: string
  accessory: string
  size?: 'sm' | 'lg'
}

function AnimalPreview({ emoji, color, outfit, glasses, accessory, size = 'lg' }: AnimalPreviewProps) {
  const filter = COLOR_FILTERS[color] ?? 'none'
  const isLg = size === 'lg'
  const containerSize = isLg ? 96 : 56
  const animalClass = isLg ? 'text-7xl' : 'text-4xl'
  const glassClass = isLg ? 'text-2xl' : 'text-base'
  const outfitClass = isLg ? 'text-3xl' : 'text-lg'
  const accessoryClass = isLg ? 'text-3xl' : 'text-xl'
  const hatTop = isLg ? -18 : -12
  const outfitBottom = isLg ? -10 : -6

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: containerSize, height: containerSize }}
    >
      {accessory === 'gorra_pirata' ? (
        <span
          className={`absolute ${isLg ? 'text-2xl' : 'text-lg'}`}
          style={{ top: '35%', right: isLg ? -16 : -10, zIndex: 3 }}
        >
          🏴‍☠️
        </span>
      ) : accessory !== 'none' ? (
        <span
          className={`absolute ${accessoryClass}`}
          style={{ top: hatTop, left: '50%', transform: 'translateX(-50%)', zIndex: 3 }}
        >
          {ACCESSORY_EMOJI[accessory]}
        </span>
      ) : null}

      <span
        className={`${animalClass} leading-none select-none`}
        style={{ filter, zIndex: 1 }}
      >
        {emoji}
      </span>

      {glasses !== 'none' && (
        <span
          className={`absolute ${glassClass}`}
          style={{ top: '28%', left: '50%', transform: 'translateX(-50%)', zIndex: 4 }}
        >
          {GLASSES_EMOJI[glasses]}
        </span>
      )}

      {outfit !== 'none' && (
        <span
          className={`absolute ${outfitClass}`}
          style={{ bottom: outfitBottom, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}
        >
          {OUTFIT_EMOJI[outfit]}
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CollectionViewProps {
  profileId: string
  totalPoints: number
  color: string
}

interface RoutineLogRow {
  routine_id: string
  score: 'good' | 'ok' | 'bad'
  created_at: string
}

interface RoutineRow {
  id: string
  name: string
  is_weekend_only: boolean
}

interface RoutineStats {
  routineId: string
  routineName: string
  isWeekend: boolean
  totalLogs: number
  goodLogs: number
}

interface WeekBucket {
  [weekKey: string]: { total: number; good: number }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getISOWeekKey(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1
  const monday = new Date(d)
  monday.setDate(d.getDate() - day)
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
}

function getDayKey(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CollectionView({ profileId, totalPoints: _totalPoints, color }: CollectionViewProps) {
  const [badges, setBadges] = useState<Badge[]>([])
  const [routineStats, setRoutineStats] = useState<RoutineStats[]>([])
  const [logs, setLogs] = useState<RoutineLogRow[]>([])
  const [liquidationCount, setLiquidationCount] = useState(0)
  const [revocations, setRevocations] = useState<Record<string, string>>({})
  // medal_key -> latest revoked_at ISO string

  const [dbAnimals, setDbAnimals] = useState<FantasticAnimal[]>([])
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set())
  const [customizations, setCustomizations] = useState<AnimalCustomization[]>([])
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null)
  const [lockedAnimalLevel, setLockedAnimalLevel] = useState<number | null>(null)
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null)
  const [editCustom, setEditCustom] = useState<Omit<AnimalCustomization, 'id' | 'profile_id' | 'animal_id'>>({
    color: 'original',
    outfit: 'none',
    glasses: 'none',
    accessory: 'none',
  })
  const [saving, setSaving] = useState(false)
  const [activeMedalId, setActiveMedalId] = useState<string | null>(null)

  useEffect(() => {
    if (!profileId) return

    async function load() {
      const { data: badgeData } = await supabase
        .from('badges')
        .select('*')
        .eq('profile_id', profileId)
      if (badgeData) setBadges(badgeData as Badge[])

      const { data: logData } = await supabase
        .from('routine_logs')
        .select('routine_id, score, created_at')
        .eq('profile_id', profileId)

      const { data: routineData } = await supabase
        .from('routines')
        .select('id, name, is_weekend_only')

      if (logData) setLogs(logData as RoutineLogRow[])

      if (logData && routineData) {
        const statsMap: Record<string, RoutineStats> = {}
        for (const r of routineData as RoutineRow[]) {
          statsMap[r.id] = {
            routineId: r.id,
            routineName: r.name,
            isWeekend: r.is_weekend_only,
            totalLogs: 0,
            goodLogs: 0,
          }
        }
        for (const log of logData as RoutineLogRow[]) {
          if (statsMap[log.routine_id]) {
            statsMap[log.routine_id].totalLogs++
            if (log.score === 'good') statsMap[log.routine_id].goodLogs++
          }
        }
        setRoutineStats(Object.values(statsMap))
      }

      const [animalsRes, unlockedRes] = await Promise.all([
        supabase.from('fantastic_animals').select('*').order('level_required'),
        supabase.from('profile_animals').select('animal_id').eq('profile_id', profileId),
      ])
      setDbAnimals((animalsRes.data as FantasticAnimal[]) ?? [])
      setUnlockedIds(new Set((unlockedRes.data ?? []).map((r: { animal_id: string }) => r.animal_id)))

      try {
        const { data: customData } = await supabase
          .from('animal_customizations')
          .select('*')
          .eq('profile_id', profileId)
        if (customData) setCustomizations(customData as AnimalCustomization[])
      } catch {
        // ignore
      }

      try {
        const { data: revData } = await supabase
          .from('medal_revocations')
          .select('medal_key, revoked_at')
          .eq('profile_id', profileId)
          .order('revoked_at', { ascending: false })
        const latest: Record<string, string> = {}
        for (const row of (revData ?? []) as { medal_key: string; revoked_at: string }[]) {
          if (!latest[row.medal_key]) latest[row.medal_key] = row.revoked_at
        }
        setRevocations(latest)
      } catch {
        // table may not exist yet
      }

      try {
        const { count } = await supabase
          .from('wallet_transactions')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', profileId)
          .eq('type', 'liquidate')
        setLiquidationCount(count ?? 0)
      } catch {
        setLiquidationCount(0)
      }
    }

    load()
  }, [profileId])

  const mergedAnimals: MergedAnimal[] = ALL_ANIMALS.map((a) => {
    const dbMatch = dbAnimals.find((d) => d.level_required === a.level_required)
    const isUnlocked = dbMatch ? unlockedIds.has(dbMatch.id) : false
    return { ...a, id: dbMatch?.id ?? '', isUnlocked }
  })

  // ---------------------------------------------------------------------------
  // Medal earned logic
  // ---------------------------------------------------------------------------

  function isMedalEarned(medalKey: string): boolean {
    if (medalKey === 'perfect_week') {
      const weeks: WeekBucket = {}
      for (const log of logs) {
        const wk = getISOWeekKey(log.created_at)
        if (!weeks[wk]) weeks[wk] = { total: 0, good: 0 }
        weeks[wk].total++
        if (log.score === 'good') weeks[wk].good++
      }
      return Object.values(weeks).some((w) => w.total > 0 && w.good === w.total)
    }

    if (medalKey === 'consistent_month') {
      const months: Record<string, { total: number; good: number }> = {}
      for (const log of logs) {
        const d = new Date(log.created_at)
        const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (!months[mk]) months[mk] = { total: 0, good: 0 }
        months[mk].total++
        if (log.score === 'good') months[mk].good++
      }
      return Object.values(months).some((m) => m.total > 0 && m.good / m.total >= 0.8)
    }

    const keyword = medalKey.toLowerCase()
    const matchingStats = routineStats.filter((rs) =>
      rs.routineName.toLowerCase().includes(keyword)
    )
    if (matchingStats.length === 0) return false
    const isWkndMedal = matchingStats.some((rs) => rs.isWeekend)
    const baseThreshold = isWkndMedal ? 10 : 20
    const regainThreshold = isWkndMedal ? 5 : 10

    const revokedAt = revocations[medalKey]
    if (revokedAt) {
      // Count 'good' logs AFTER revocation for matching routines
      const matchingIds = new Set(matchingStats.map((s) => s.routineId))
      const goodSince = logs.filter(
        (l) => matchingIds.has(l.routine_id) && l.score === 'good' && l.created_at > revokedAt,
      ).length
      return goodSince >= regainThreshold
    }

    return matchingStats.some((rs) => rs.goodLogs >= baseThreshold)
  }

  // ---------------------------------------------------------------------------
  // Badge stats
  // ---------------------------------------------------------------------------

  const earnedDbBadges: Set<BadgeType> = new Set(badges.map((b) => b.badge_type))

  // Perfect day: a day where at least 2 logs exist and all are "good"
  const dayBuckets: Record<string, { total: number; good: number }> = {}
  for (const log of logs) {
    const dk = getDayKey(log.created_at)
    if (!dayBuckets[dk]) dayBuckets[dk] = { total: 0, good: 0 }
    dayBuckets[dk].total++
    if (log.score === 'good') dayBuckets[dk].good++
  }
  const hasPerfectDay = Object.values(dayBuckets).some((d) => d.total >= 2 && d.good === d.total)

  // Perfect week (reuse)
  const hasPerfectWeek = isMedalEarned('perfect_week')

  // Mastery count (existing logic)
  const masteryCount = MASTERY_MEDALS.filter((m) => isMedalEarned(m.key)).length

  const animalsUnlocked = mergedAnimals.filter((a) => a.isUnlocked).length
  const animalsTotal = ALL_ANIMALS.length

  const badgeStats: BadgeStats = {
    earnedDbBadges,
    hasPerfectDay,
    hasPerfectWeek,
    masteryCount,
    animalsUnlocked,
    animalsTotal,
    liquidationCount,
  }

  // ---------------------------------------------------------------------------
  // Modal helpers
  // ---------------------------------------------------------------------------

  const selectedAnimal = mergedAnimals.find((a) => a.id === selectedAnimalId) ?? null
  const selectedBadge = BADGE_CATALOG.find((b) => b.id === selectedBadgeId) ?? null
  const lockedAnimalCatalog = lockedAnimalLevel != null
    ? ALL_ANIMALS.find((a) => a.level_required === lockedAnimalLevel) ?? null
    : null

  function openModal(animalId: string) {
    const existing = customizations.find((c) => c.animal_id === animalId)
    setEditCustom({
      color: existing?.color ?? 'original',
      outfit: existing?.outfit ?? 'none',
      glasses: existing?.glasses ?? 'none',
      accessory: existing?.accessory ?? 'none',
    })
    setSelectedAnimalId(animalId)
  }

  function closeModal() {
    setSelectedAnimalId(null)
  }

  async function saveCustomization() {
    if (!selectedAnimalId) return
    setSaving(true)
    try {
      const payload = {
        profile_id: profileId,
        animal_id: selectedAnimalId,
        color: editCustom.color,
        outfit: editCustom.outfit,
        glasses: editCustom.glasses,
        accessory: editCustom.accessory,
      }

      await supabase
        .from('animal_customizations')
        .upsert(payload, { onConflict: 'profile_id,animal_id' })

      const { data } = await supabase
        .from('animal_customizations')
        .select('*')
        .eq('profile_id', profileId)
      if (data) setCustomizations(data as AnimalCustomization[])
    } catch {
      // ignore
    } finally {
      setSaving(false)
      closeModal()
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-8 pb-10">

      {/* ================================================================
          SECTION 1: INSÍGNIES (10 badges, 2x5 grid)
      ================================================================ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🏅</span>
          <h2 className="text-xl font-black text-gray-800">Insígnies</h2>
          <span className="ml-auto text-sm font-bold text-gray-500">
            {BADGE_CATALOG.filter((b) => b.check(badgeStats)).length} / {BADGE_CATALOG.length}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {BADGE_CATALOG.map((badge, idx) => {
            const earned = badge.check(badgeStats)
            return (
              <motion.button
                key={badge.id}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => setSelectedBadgeId(badge.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-2xl border-2 transition-all ${
                  earned
                    ? 'bg-yellow-50 border-yellow-300 shadow-sm'
                    : 'bg-gray-50 border-gray-200 opacity-50'
                }`}
              >
                <span className={`text-2xl ${earned ? '' : 'grayscale'}`}>{badge.emoji}</span>
                <p className="text-[10px] font-bold text-center text-gray-700 leading-tight">
                  {earned ? badge.name : '???'}
                </p>
              </motion.button>
            )
          })}
        </div>
      </section>

      {/* ================================================================
          SECTION 2: MEDALLES DE MESTRATGE
      ================================================================ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🎖️</span>
          <h2 className="text-xl font-black text-gray-800">Medalles de Mestratge</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {MASTERY_MEDALS.map((medal, idx) => {
            const earned = isMedalEarned(medal.key)
            const isActive = activeMedalId === medal.id

            return (
              <motion.div
                key={medal.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                whileTap={{ scale: 0.96 }}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 cursor-pointer select-none transition-all ${
                  earned
                    ? 'bg-white border-blue-200 shadow-md'
                    : 'bg-gray-50 border-gray-200 opacity-50'
                }`}
                onTouchStart={() => setActiveMedalId(medal.id)}
                onTouchEnd={() => setActiveMedalId(null)}
                onClick={() => setActiveMedalId(isActive ? null : medal.id)}
              >
                <span className={`text-3xl ${earned ? '' : 'grayscale'}`}>{medal.emoji}</span>
                <p className="text-xs font-black text-center text-gray-800 leading-tight">
                  {medal.name}
                </p>
                <p className="text-xs text-center text-gray-500 leading-tight">
                  {medal.description}
                </p>
                {earned && (
                  <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    ✓ Aconseguida!
                  </span>
                )}

                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.85, y: -4 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 w-52 bg-gray-900 text-white text-xs rounded-xl p-3 shadow-xl text-center leading-snug"
                    >
                      <span className="font-bold block mb-1">{medal.name}</span>
                      {medal.funReason}
                      <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* ================================================================
          SECTION 3: ANIMALS FANTÀSTICS
      ================================================================ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🦄</span>
          <h2 className="text-xl font-black text-gray-800">Animals Fantàstics</h2>
          <span className="ml-auto text-sm font-bold text-gray-500">
            {animalsUnlocked} / {animalsTotal}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {mergedAnimals.map((animal, idx) => {
            const custom = customizations.find((c) => c.animal_id === animal.id)
            const animalColor = custom?.color ?? 'original'
            const animalOutfit = custom?.outfit ?? 'none'
            const animalGlasses = custom?.glasses ?? 'none'
            const animalAccessory = custom?.accessory ?? 'none'

            return (
              <motion.div
                key={animal.level_required}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                whileTap={{ scale: 0.96 }}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 cursor-pointer select-none transition-all ${
                  animal.isUnlocked
                    ? 'bg-white border-purple-200 shadow-md'
                    : 'bg-gray-50 border-gray-200'
                }`}
                onClick={() => {
                  if (animal.isUnlocked && animal.id) {
                    openModal(animal.id)
                  } else {
                    setLockedAnimalLevel(animal.level_required)
                  }
                }}
              >
                <div
                  className="relative flex items-center justify-center"
                  style={{
                    filter: animal.isUnlocked ? 'none' : 'blur(9px)',
                  }}
                >
                  {animal.isUnlocked && custom ? (
                    <AnimalPreview
                      emoji={animal.emoji}
                      color={animalColor}
                      outfit={animalOutfit}
                      glasses={animalGlasses}
                      accessory={animalAccessory}
                      size="sm"
                    />
                  ) : (
                    <span className="text-5xl leading-none select-none">{animal.emoji}</span>
                  )}
                </div>

                {!animal.isUnlocked && (
                  <span className="text-lg">🔒</span>
                )}

                <p className="text-xs font-black text-center text-gray-800 leading-tight">
                  {animal.isUnlocked ? animal.name : '???'}
                </p>

                {animal.isUnlocked ? (
                  <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                    ✓ Desbloquejat
                  </span>
                ) : (
                  <span className="text-xs text-gray-500 font-bold">
                    Nivell {animal.level_required}
                  </span>
                )}
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* ================================================================
          BADGE DETAIL MODAL
      ================================================================ */}
      <AnimatePresence>
        {selectedBadge && (
          <>
            <motion.div
              key="badge-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-30"
              onClick={() => setSelectedBadgeId(null)}
            />
            <motion.div
              key="badge-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-0 z-40 flex items-center justify-center p-6 pointer-events-none"
            >
              <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 flex flex-col items-center gap-3 pointer-events-auto">
                {(() => {
                  const earned = selectedBadge.check(badgeStats)
                  return (
                    <>
                      <span className={`text-6xl ${earned ? '' : 'grayscale opacity-60'}`}>
                        {selectedBadge.emoji}
                      </span>
                      <h3 className="text-xl font-black text-gray-800 text-center">
                        {selectedBadge.name}
                      </h3>
                      <p className="text-sm text-gray-600 text-center leading-snug">
                        {selectedBadge.description}
                      </p>
                      <span
                        className={`text-xs font-black px-3 py-1 rounded-full ${
                          earned ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {earned ? '✓ Guanyada!' : '🔒 Encara no guanyada'}
                      </span>
                      <button
                        onClick={() => setSelectedBadgeId(null)}
                        className="mt-2 w-full py-3 rounded-2xl font-bold text-white"
                        style={{ backgroundColor: color }}
                      >
                        Tancar
                      </button>
                    </>
                  )
                })()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ================================================================
          LOCKED ANIMAL MYSTERY MODAL
      ================================================================ */}
      <AnimatePresence>
        {lockedAnimalCatalog && (
          <>
            <motion.div
              key="locked-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-30"
              onClick={() => setLockedAnimalLevel(null)}
            />
            <motion.div
              key="locked-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-0 z-40 flex items-center justify-center p-6 pointer-events-none"
            >
              <div className="bg-gradient-to-br from-purple-50 to-indigo-100 rounded-3xl shadow-2xl max-w-sm w-full p-6 flex flex-col items-center gap-3 pointer-events-auto border-2 border-purple-200">
                <span
                  className="text-7xl"
                  style={{ filter: 'blur(9px)' }}
                >
                  {lockedAnimalCatalog.emoji}
                </span>
                <span className="text-3xl">🔒</span>
                <h3 className="text-xl font-black text-purple-900 text-center">
                  Un misteri t&apos;espera...
                </h3>
                <p className="text-sm text-purple-800 text-center leading-snug italic">
                  &ldquo;{MYSTERY_HINTS[lockedAnimalCatalog.level_required] ?? 'Un animal màgic t\'espera!'}&rdquo;
                </p>
                <div className="bg-white/70 rounded-xl px-4 py-2 mt-1">
                  <p className="text-sm font-black text-purple-700 text-center">
                    Arriba al nivell {lockedAnimalCatalog.level_required} per descobrir-lo!
                  </p>
                </div>
                <button
                  onClick={() => setLockedAnimalLevel(null)}
                  className="mt-2 w-full py-3 rounded-2xl font-bold text-white"
                  style={{ backgroundColor: color }}
                >
                  Continuaré esforçant-me!
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ================================================================
          ANIMAL CUSTOMIZATION MODAL
      ================================================================ */}
      <AnimatePresence>
        {selectedAnimalId && selectedAnimal && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-30"
              onClick={closeModal}
            />

            <motion.div
              key="modal"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>

              <div className="px-5 pb-8 pt-2 flex flex-col gap-5">
                <h3 className="text-xl font-black text-gray-800 text-center">
                  Personalitza {selectedAnimal.name}
                </h3>

                <div className="flex justify-center py-4">
                  <AnimalPreview
                    emoji={selectedAnimal.emoji}
                    color={editCustom.color}
                    outfit={editCustom.outfit}
                    glasses={editCustom.glasses}
                    accessory={editCustom.accessory}
                    size="lg"
                  />
                </div>

                <p className="text-sm text-gray-500 text-center">{selectedAnimal.description}</p>

                <div>
                  <p className="text-sm font-black text-gray-700 mb-2">Color</p>
                  <div className="flex gap-2 flex-wrap">
                    {ANIMAL_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setEditCustom((prev) => ({ ...prev, color: c.id }))}
                        className={`w-10 h-10 rounded-full border-4 transition-all ${
                          editCustom.color === c.id
                            ? 'border-gray-800 scale-110'
                            : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        aria-label={c.label}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-black text-gray-700 mb-2">Roba</p>
                  <div className="grid grid-cols-4 gap-2">
                    {OUTFIT_OPTIONS.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setEditCustom((prev) => ({ ...prev, outfit: o.id as AnimalOutfit }))}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                          editCustom.outfit === o.id
                            ? 'border-purple-400 bg-purple-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <span className="text-2xl">{o.emoji}</span>
                        <span className="text-xs text-gray-600 leading-tight text-center" style={{ fontSize: '0.6rem' }}>
                          {o.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-black text-gray-700 mb-2">Ulleres</p>
                  <div className="grid grid-cols-4 gap-2">
                    {GLASSES_OPTIONS.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setEditCustom((prev) => ({ ...prev, glasses: g.id as AnimalGlasses }))}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                          editCustom.glasses === g.id
                            ? 'border-purple-400 bg-purple-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <span className="text-2xl">{g.emoji}</span>
                        <span className="text-xs text-gray-600 leading-tight text-center" style={{ fontSize: '0.6rem' }}>
                          {g.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-black text-gray-700 mb-2">Accessori</p>
                  <div className="grid grid-cols-4 gap-2">
                    {ACCESSORY_OPTIONS.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setEditCustom((prev) => ({ ...prev, accessory: a.id as AnimalAccessory }))}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                          editCustom.accessory === a.id
                            ? 'border-purple-400 bg-purple-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <span className="text-2xl">{a.emoji}</span>
                        <span className="text-xs text-gray-600 leading-tight text-center" style={{ fontSize: '0.6rem' }}>
                          {a.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={saveCustomization}
                  disabled={saving}
                  className="w-full py-4 rounded-2xl font-black text-white text-lg shadow-lg disabled:opacity-60 transition-all"
                  style={{ backgroundColor: color }}
                >
                  {saving ? 'Desant...' : '💾 Desar personalització'}
                </motion.button>

                <button
                  onClick={closeModal}
                  className="w-full py-3 rounded-2xl font-bold text-gray-500 text-base bg-gray-100"
                >
                  Cancel·lar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
