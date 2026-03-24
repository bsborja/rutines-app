'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BehaviorScore, Routine, EffectivePoints } from '@/types'
import { playOkSound, playBadSound, resumeAudio } from '@/lib/sound'

interface BehaviorOption {
  score: BehaviorScore
  label: string
  emoji: string
  color: string
  bg: string
  border: string
  description: string
  pointsDelta: number
}

interface BehaviorSelectorProps {
  routine: Routine
  effectivePoints?: EffectivePoints  // per-profile overrides; fallback to base if absent
  loggedByParent?: boolean
  onSelect: (score: BehaviorScore, points: number) => Promise<void>
  onCancel: () => void
}

export default function BehaviorSelector({
  routine,
  effectivePoints,
  loggedByParent = false,
  onSelect,
  onCancel,
}: BehaviorSelectorProps) {
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<BehaviorScore | null>(null)

  // Resolve actual points: override > base
  const pts = effectivePoints ?? {
    good: routine.base_points_good,
    ok: routine.base_points_ok,
    bad: routine.base_points_bad,
  }

  const badPoints = loggedByParent
    ? Math.round(pts.bad * 1.5)
    : pts.bad

  const options: BehaviorOption[] = [
    {
      score: 'good',
      label: 'Bé! 🌟',
      emoji: '😄',
      color: '#58CC02',
      bg: '#F0FBE4',
      border: '#58CC02',
      description: 'Ho ha fet genial',
      pointsDelta: pts.good,
    },
    {
      score: 'ok',
      label: 'Regular',
      emoji: '😐',
      color: '#FF9600',
      bg: '#FFF8EC',
      border: '#FF9600',
      description: 'Ho ha fet, però amb dificultats',
      pointsDelta: pts.ok,
    },
    {
      score: 'bad',
      label: 'No tan bé',
      emoji: '😔',
      color: '#FF4B4B',
      bg: '#FFF0F0',
      border: '#FF4B4B',
      description: loggedByParent ? 'No ho ha fet bé (−50% extra)' : 'No ho ha fet bé',
      pointsDelta: badPoints,
    },
  ]

  async function handleSelect(option: BehaviorOption) {
    if (loading) return
    resumeAudio()
    setSelected(option.score)
    setLoading(true)

    if (option.score === 'ok') playOkSound()
    if (option.score === 'bad') playBadSound()

    await onSelect(option.score, option.pointsDelta)
    setLoading(false)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={(e) => e.target === e.currentTarget && onCancel()}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{routine.emoji}</span>
              <div>
                <h2 className="font-black text-gray-800 text-xl">{routine.name}</h2>
                <p className="text-gray-500 text-sm">{routine.description}</p>
              </div>
            </div>
            {loggedByParent && (
              <div className="mt-3 bg-blue-50 rounded-xl px-3 py-2">
                <p className="text-blue-700 text-sm font-semibold">
                  📋 Registrant com a pare/mare (−50% extra si negatiu)
                </p>
              </div>
            )}
          </div>

          {/* Question */}
          <div className="px-6 py-4">
            <p className="text-center font-bold text-gray-700 text-lg">
              Com ha anat avui?
            </p>
          </div>

          {/* Options */}
          <div className="px-6 pb-6 flex flex-col gap-3">
            {options.map((option, i) => (
              <motion.button
                key={option.score}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSelect(option)}
                disabled={loading}
                className={`
                  w-full rounded-2xl border-2 p-4 transition-all text-left
                  ${loading && selected !== option.score ? 'opacity-50' : ''}
                  ${selected === option.score ? 'scale-95' : ''}
                `}
                style={{
                  backgroundColor: option.bg,
                  borderColor: option.border,
                }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{option.emoji}</span>
                  <div className="flex-1">
                    <p className="font-black text-xl" style={{ color: option.color }}>
                      {option.label}
                    </p>
                    <p className="text-gray-500 text-sm">{option.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-lg" style={{ color: option.color }}>
                      {option.pointsDelta > 0 ? '+' : ''}{option.pointsDelta}
                    </p>
                    <p className="text-gray-400 text-xs">punts</p>
                  </div>
                </div>

                {selected === option.score && loading && (
                  <div className="flex justify-center mt-2">
                    <div
                      className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: option.color, borderTopColor: 'transparent' }}
                    />
                  </div>
                )}
              </motion.button>
            ))}
          </div>

          {/* Cancel */}
          <button
            onClick={onCancel}
            disabled={loading}
            className="w-full py-4 text-gray-400 text-sm hover:text-gray-600 transition-colors border-t border-gray-100"
          >
            Cancel·lar
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
