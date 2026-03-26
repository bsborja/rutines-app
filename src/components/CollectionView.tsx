'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
  BADGE_INFO,
  BadgeType,
  Badge,
  MASTERY_MEDALS,
  ANIMALS,
  ANIMAL_COLORS,
  OUTFIT_OPTIONS,
  GLASSES_OPTIONS,
  ACCESSORY_OPTIONS,
  AnimalCustomization,
  AnimalOutfit,
  AnimalGlasses,
  AnimalAccessory,
} from '@/types'

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

interface MonthBucket {
  [monthKey: string]: { total: number; good: number }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getISOWeekKey(dateStr: string): string {
  const d = new Date(dateStr)
  // Monday-based week start
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

      // 3. Animal customizations (table may not exist yet — handle gracefully)
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
  // Medal earned logic
  // ---------------------------------------------------------------------------

  function isMedalEarned(medalKey: string): boolean {
    if (medalKey === 'perfect_week') {
      // Check if any ISO week had 100% good scores (at least 1 log)
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
      // Check if any calendar month had >= 80% good
      const months: MonthBucket = {}
      for (const log of logs) {
        const mk = getMonthKey(log.created_at)
        if (!months[mk]) months[mk] = { total: 0, good: 0 }
        months[mk].total++
        if (log.score === 'good') months[mk].good++
      }
      return Object.values(months).some((m) => m.total > 0 && m.good / m.total >= 0.8)
    }

    // Regular routine medals — match by keyword in routine name
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

  const selectedAnimal = ANIMALS.find((a) => a.id === selectedAnimalId) ?? null
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

      if (existingCustom) {
        await supabase
          .from('animal_customizations')
          .update(payload)
          .eq('id', existingCustom.id)
      } else {
        await supabase.from('animal_customizations').insert(payload)
      }

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

  const selectedColorHex =
    ANIMAL_COLORS.find((c) => c.id === editCustom.color)?.hex ?? '#9B9B9B'

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
          {ANIMALS.map((animal, idx) => {
            const unlocked = totalPoints >= animal.pointsRequired
            const custom = customizations.find((c) => c.animal_id === animal.id)
            const bgColor = custom
              ? (ANIMAL_COLORS.find((c) => c.id === custom.color)?.hex ?? '#9B9B9B')
              : '#E5E7EB'

            return (
              <motion.div
                key={animal.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                whileTap={unlocked ? { scale: 0.96 } : {}}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 cursor-pointer select-none transition-all ${
                  unlocked
                    ? 'bg-white border-purple-200 shadow-md'
                    : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
                onClick={() => {
                  if (unlocked) openModal(animal.id)
                }}
              >
                {/* Animal emoji with optional blur for locked */}
                <div
                  className="relative flex items-center justify-center rounded-full w-16 h-16 text-4xl"
                  style={{
                    backgroundColor: unlocked ? bgColor + '44' : '#E5E7EB',
                    filter: unlocked ? 'none' : 'blur(3px)',
                  }}
                >
                  <span>{animal.emoji}</span>
                  {/* Outfit overlay */}
                  {unlocked && custom?.outfit && custom.outfit !== 'none' && (
                    <span className="absolute -top-1 -right-1 text-lg">
                      {OUTFIT_OPTIONS.find((o) => o.id === custom.outfit)?.emoji}
                    </span>
                  )}
                  {/* Glasses overlay */}
                  {unlocked && custom?.glasses && custom.glasses !== 'none' && (
                    <span className="absolute bottom-0 right-0 text-base">
                      {GLASSES_OPTIONS.find((g) => g.id === custom.glasses)?.emoji}
                    </span>
                  )}
                  {/* Accessory overlay */}
                  {unlocked && custom?.accessory && custom.accessory !== 'none' && (
                    <span className="absolute -top-2 left-0 text-base">
                      {ACCESSORY_OPTIONS.find((a) => a.id === custom.accessory)?.emoji}
                    </span>
                  )}
                </div>

                <p className="text-xs font-black text-center text-gray-800 leading-tight">
                  {animal.name}
                </p>

                {unlocked ? (
                  <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                    ✓ Desbloquejat
                  </span>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500 font-bold">
                      🔒 {animal.pointsRequired - totalPoints} pts
                    </span>
                  </div>
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

                {/* Animal preview */}
                <div className="flex justify-center">
                  <div
                    className="relative flex items-center justify-center rounded-full w-28 h-28"
                    style={{ backgroundColor: selectedColorHex + '44' }}
                  >
                    <span className="text-6xl">{selectedAnimal.emoji}</span>
                    {/* Outfit overlay */}
                    {editCustom.outfit !== 'none' && (
                      <span className="absolute -top-2 -right-2 text-3xl">
                        {OUTFIT_OPTIONS.find((o) => o.id === editCustom.outfit)?.emoji}
                      </span>
                    )}
                    {/* Glasses overlay */}
                    {editCustom.glasses !== 'none' && (
                      <span className="absolute bottom-1 right-0 text-2xl">
                        {GLASSES_OPTIONS.find((g) => g.id === editCustom.glasses)?.emoji}
                      </span>
                    )}
                    {/* Accessory overlay */}
                    {editCustom.accessory !== 'none' && (
                      <span className="absolute -top-3 left-0 text-2xl">
                        {ACCESSORY_OPTIONS.find((a) => a.id === editCustom.accessory)?.emoji}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-500 text-center">{selectedAnimal.description}</p>

                {/* COLOR PICKER */}
                <div>
                  <p className="text-sm font-black text-gray-700 mb-2">Color de fons</p>
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
