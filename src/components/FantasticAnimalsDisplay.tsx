'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { FantasticAnimal } from '@/types'

// All 10 animals (mirrors DB seed, used for locked preview)
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

interface FantasticAnimalsDisplayProps {
  profileId: string
  currentLevel: number
  color: string
  // If true, show all animals (parent view for a specific girl)
  showAll?: boolean
}

export default function FantasticAnimalsDisplay({
  profileId,
  currentLevel,
  color,
  showAll = false,
}: FantasticAnimalsDisplayProps) {
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set())
  const [dbAnimals, setDbAnimals] = useState<FantasticAnimal[]>([])
  type MergedAnimal = (typeof ALL_ANIMALS)[0] & { id: string; isUnlocked: boolean }
  const [selected, setSelected] = useState<MergedAnimal | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [animalsRes, unlockedRes] = await Promise.all([
        supabase.from('fantastic_animals').select('*').order('level_required'),
        supabase.from('profile_animals').select('animal_id').eq('profile_id', profileId),
      ])
      setDbAnimals((animalsRes.data as FantasticAnimal[]) ?? [])
      setUnlockedIds(new Set((unlockedRes.data ?? []).map((r: { animal_id: string }) => r.animal_id)))
      setLoading(false)
    }
    load()
  }, [profileId])

  // Merge local ALL_ANIMALS with DB ids (for locked state)
  const merged: MergedAnimal[] = ALL_ANIMALS.map((a) => {
    const dbMatch = dbAnimals.find((d) => d.level_required === a.level_required)
    const isUnlocked = dbMatch ? unlockedIds.has(dbMatch.id) : false
    return { ...a, id: dbMatch?.id ?? '', isUnlocked }
  })

  const unlockedCount = merged.filter((a) => a.isUnlocked).length

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="w-14 h-14 rounded-2xl bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-black text-gray-800">Animals Fantàstics</h3>
        <span className="text-xs font-black px-2.5 py-1 rounded-full"
          style={{ backgroundColor: `${color}20`, color }}>
          {unlockedCount}/{merged.length} desbloquejats
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {merged.map((animal, i) => (
          <motion.button
            key={animal.level_required}
            onClick={() => setSelected(animal)}
            whileTap={{ scale: 0.92 }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            className={`
              relative flex flex-col items-center justify-center rounded-2xl p-2 transition-all
              ${animal.isUnlocked
                ? 'shadow-sm'
                : 'opacity-40 grayscale'}
            `}
            style={{
              backgroundColor: animal.isUnlocked ? `${color}15` : '#F3F4F6',
              border: animal.isUnlocked ? `2px solid ${color}30` : '2px solid transparent',
            }}
          >
            <span className="text-3xl leading-none">{animal.emoji}</span>
            <span className="text-[9px] font-bold text-gray-500 mt-1 text-center leading-tight line-clamp-2">
              {animal.isUnlocked ? animal.name : `Niv. ${animal.level_required}`}
            </span>
            {!animal.isUnlocked && (
              <span className="absolute top-1 right-1 text-[10px]">🔒</span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Next unlock hint */}
      {unlockedCount < merged.length && (
        <p className="text-xs text-gray-400 text-center mt-3">
          {(() => {
            const next = merged.find((a) => !a.isUnlocked)
            if (!next) return null
            const levelsLeft = next.level_required - currentLevel
            return levelsLeft <= 0
              ? `Pròximament: ${next.name} ${next.emoji}`
              : `Proper animal al nivell ${next.level_required} (${levelsLeft} nivells)`
          })()}
        </p>
      )}

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-xs text-center"
            >
              <motion.p
                animate={selected.isUnlocked ? { rotate: [0, -10, 10, -10, 0] } : {}}
                transition={{ duration: 0.5 }}
                className="text-7xl mb-3"
              >
                {selected.isUnlocked ? selected.emoji : '🔒'}
              </motion.p>
              <h2 className="text-2xl font-black text-gray-800 mb-1">
                {selected.isUnlocked ? selected.name : '???'}
              </h2>
              <p className="text-sm text-gray-500 mb-2">
                {selected.isUnlocked
                  ? selected.description
                  : `S'il·luminarà al nivell ${selected.level_required}`}
              </p>
              {selected.isUnlocked && (
                <span className="inline-block text-xs font-black px-3 py-1 rounded-full mb-4"
                  style={{ backgroundColor: `${color}20`, color }}>
                  Desbloquejat al nivell {selected.level_required} ✨
                </span>
              )}
              <button
                onClick={() => setSelected(null)}
                className="w-full py-3 rounded-2xl bg-gray-100 text-gray-600 font-bold mt-2"
              >
                Tancar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
