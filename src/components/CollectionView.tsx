'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
  BADGE_INFO,
  BadgeType,
  Badge,
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
// Local animal catalog — mirrors DB seed, same as FantasticAnimalsDisplay
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

// ---------------------------------------------------------------------------
// Color filter map — tints the animal emoji via CSS filter
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

// ---------------------------------------------------------------------------
// Emoji maps for accessories overlaid on the animal
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Merged animal type
// ---------------------------------------------------------------------------

type MergedAnimal = Omit<FantasticAnimal, 'id'> & { id: string; isUnlocked: boolean }

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
      {/* Hat / accessory on top of the head — pirate flag goes to the side */}
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

      {/* Main animal emoji with CSS color filter */}
      <span
        className={`${animalClass} leading-none select-none`}
        style={{ filter, zIndex: 1 }}
      >
        {emoji}
      </span>

      {/* Glasses over the eyes (~28% from top) */}
      {glasses !== 'none' && (
        <span
          className={`absolute ${glassClass}`}
          style={{ top: '28%', left: '50%', transform: 'translateX(-50%)', zIndex: 4 }}
        >
          {GLASSES_EMOJI[glasses]}
        </span>
      )}

      {/* Outfit at the bottom */}
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
  totalPoints: number  // kept for future use
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

interface MonthBucket {
  [monthKey: string]: { total: number; good: number }
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

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CollectionView({ profileId, totalPoints, color }: CollectionViewProps) {
  // --- Badges ---
  const [badges, setBadges] = useState<Badge[]>([])

  // --- Medals ---
  const [routineStats, setRoutineStats] = useState<RoutineStats[]>([])
  const [logs, setLogs] = useState<RoutineLogRow[]>([])

  // --- Animals ---
  const [dbAnimals, setDbAnimals] = useState<FantasticAnimal[]>([])
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set())
  const [customizations, setCustomizations] = useState<AnimalCustomization[]>([])
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null)
  const [editCustom, setEditCustom] = useState<Omit<AnimalCustomization, 'id' | 'profile_id' | 'animal_id'>>({
    color: 'original',
    outfit: 'none',
    glasses: 'none',
    accessory: 'none',
  })
  const [saving, setSaving] = useState(false)

  // --- Tooltip state for medals ---
  const [activeMedalId, setActiveMedalId] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!profileId) return

    async function load() {
      // 1. Badges
      const { data: badgeData } = await supabase
        .from('badges')
        .select('*')
        .eq('profile_id', profileId)

      if (badgeData) setBadges(badgeData as Badge[])

      // 2. Routine logs + routines for medal calculation
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

      // 3. Animals from DB (fantastic_animals + profile_animals)
      const [animalsRes, unlockedRes] = await Promise.all([
        supabase.from('fantastic_animals').select('*').order('level_required'),
        supabase.from('profile_animals').select('animal_id').eq('profile_id', profileId),
      ])
      setDbAnimals((animalsRes.data as FantasticAnimal[]) ?? [])
      setUnlockedIds(new Set((unlockedRes.data ?? []).map((r: { animal_id: string }) => r.animal_id)))

      // 4. Animal customizations (table may not exist yet — handle gracefully)
      try {
        const { data: customData } = await supabase
          .from('animal_customizations')
          .select('*')
          .eq('profile_id', profileId)

        if (customData) setCustomizations(customData as AnimalCustomization[])
      } catch {
        // Table not created yet — silently ignore
      }
    }

    load()
  }, [profileId])

  // ---------------------------------------------------------------------------
  // Merge local catalog with DB data (same pattern as FantasticAnimalsDisplay)
  // ---------------------------------------------------------------------------

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
      const months: MonthBucket = {}
      for (const log of logs) {
        const mk = getMonthKey(log.created_at)
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

    const threshold = matchingStats.some((rs) => rs.isWeekend) ? 10 : 20
    return matchingStats.some((rs) => rs.goodLogs >= threshold)
  }

  // ---------------------------------------------------------------------------
  // Animal customization modal helpers
  // ---------------------------------------------------------------------------

  const selectedAnimal = mergedAnimals.find((a) => a.id === selectedAnimalId) ?? null
  const existingCustom = customizations.find((c) => c.animal_id === selectedAnimalId)

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

      // Refresh customizations
      const { data } = await supabase
        .from('animal_customizations')
        .select('*')
        .eq('profile_id', profileId)
      if (data) setCustomizations(data as AnimalCustomization[])
    } catch {
      // Ignore if table doesn't exist yet
    } finally {
      setSaving(false)
      closeModal()
    }
  }

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const earnedBadgeTypes = new Set(badges.map((b) => b.badge_type))
  const allBadgeTypes: BadgeType[] = ['streak_3', 'streak_7', 'streak_30']

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-8 pb-10">

      {/* ================================================================
          SECTION 1: INSÍGNIES
      ================================================================ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🏅</span>
          <h2 className="text-xl font-black text-gray-800">Insígnies</h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {allBadgeTypes.map((badgeType) => {
            const info = BADGE_INFO[badgeType]
            const earned = earnedBadgeTypes.has(badgeType)

            return (
              <motion.div
                key={badgeType}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={earned ? { scale: 0.95 } : {}}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  earned
                    ? 'bg-yellow-50 border-yellow-300 shadow-md'
                    : 'bg-gray-50 border-gray-200 opacity-40'
                }`}
              >
                <span className={`text-4xl ${earned ? '' : 'grayscale'}`}>{info.emoji}</span>
                <p className="text-xs font-bold text-center text-gray-700 leading-tight">
                  {info.label}
                </p>
                <p className="text-xs text-center text-gray-500 leading-tight">
                  {info.description}
                </p>
                {earned && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-xs font-black text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full"
                  >
                    ✓ Guanyat!
                  </motion.span>
                )}
              </motion.div>
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

                {/* Fun reason tooltip / popup */}
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
                      {/* Arrow */}
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
                whileTap={animal.isUnlocked ? { scale: 0.96 } : {}}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 cursor-pointer select-none transition-all ${
                  animal.isUnlocked
                    ? 'bg-white border-purple-200 shadow-md'
                    : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
                onClick={() => {
                  if (animal.isUnlocked && animal.id) openModal(animal.id)
                }}
              >
                {/* Animal preview — blurred and locked when not unlocked */}
                <div
                  className="relative flex items-center justify-center"
                  style={{
                    filter: animal.isUnlocked ? 'none' : 'blur(3px)',
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
                    <span className="text-4xl leading-none select-none">{animal.emoji}</span>
                  )}
                </div>

                {/* Lock badge for locked animals */}
                {!animal.isUnlocked && (
                  <span className="text-lg">🔒</span>
                )}

                <p className="text-xs font-black text-center text-gray-800 leading-tight">
                  {animal.isUnlocked ? animal.name : `???`}
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
          ANIMAL CUSTOMIZATION MODAL
      ================================================================ */}
      <AnimatePresence>
        {selectedAnimalId && selectedAnimal && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-30"
              onClick={closeModal}
            />

            {/* Modal sheet */}
            <motion.div
              key="modal"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>

              <div className="px-5 pb-8 pt-2 flex flex-col gap-5">
                {/* Title */}
                <h3 className="text-xl font-black text-gray-800 text-center">
                  Personalitza {selectedAnimal.name}
                </h3>

                {/* Animal preview — large, with overlaid accessories and color filter */}
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

                {/* Description */}
                <p className="text-sm text-gray-500 text-center">{selectedAnimal.description}</p>

                {/* COLOR PICKER */}
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

                {/* OUTFIT PICKER */}
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

                {/* GLASSES PICKER */}
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

                {/* ACCESSORY PICKER */}
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

                {/* SAVE BUTTON */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={saveCustomization}
                  disabled={saving}
                  className="w-full py-4 rounded-2xl font-black text-white text-lg shadow-lg disabled:opacity-60 transition-all"
                  style={{ backgroundColor: color }}
                >
                  {saving ? 'Desant...' : '💾 Desar personalització'}
                </motion.button>

                {/* Cancel */}
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
