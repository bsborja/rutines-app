'use client'

import { motion } from 'framer-motion'
import { LEVEL_POINTS, LEVEL_THRESHOLDS, LEVEL_EMOJIS } from '@/types'
import { getLevelFromPoints, getLevelProgress } from '@/lib/points'

interface LevelProgressProps {
  totalPoints: number
  color: string
  compact?: boolean
}

export default function LevelProgress({ totalPoints, color, compact = false }: LevelProgressProps) {
  const level = getLevelFromPoints(totalPoints)
  const progress = getLevelProgress(totalPoints)
  const levelName = LEVEL_THRESHOLDS[level]
  const levelEmoji = LEVEL_EMOJIS[level]
  const nextLevel = level < 5 ? level + 1 : null
  const nextLevelName = nextLevel ? LEVEL_THRESHOLDS[nextLevel] : null
  const pointsToNext = nextLevel ? LEVEL_POINTS[nextLevel - 1] - totalPoints : 0

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-2xl">{levelEmoji}</span>
        <div>
          <p className="text-xs font-bold text-gray-700">{levelName}</p>
          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-4xl">{levelEmoji}</span>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Nivell actual</p>
          <p className="text-xl font-black" style={{ color }}>{levelName}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl font-black text-gray-800">{totalPoints}</p>
          <p className="text-xs text-gray-500">punts totals</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative">
        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress * 100, 100)}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
            className="h-full rounded-full relative"
            style={{ backgroundColor: color }}
          >
            <div
              className="absolute right-0 top-0 h-full w-1/3 rounded-full opacity-50"
              style={{
                background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.5))',
              }}
            />
          </motion.div>
        </div>

        {/* Level markers */}
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-400">
            {level > 1 ? LEVEL_POINTS[level - 1] : 0} pts
          </span>
          {nextLevel && (
            <span className="text-xs text-gray-400">
              {LEVEL_POINTS[nextLevel - 1]} pts
            </span>
          )}
        </div>
      </div>

      {nextLevelName && (
        <p className="text-sm text-gray-500 mt-2 text-center">
          <span className="font-semibold text-gray-700">{pointsToNext} punts</span> per arribar a{' '}
          <span className="font-bold" style={{ color }}>
            {LEVEL_EMOJIS[nextLevel!]} {nextLevelName}
          </span>
        </p>
      )}

      {level === 5 && (
        <p className="text-sm font-bold text-center mt-2" style={{ color }}>
          🎉 Has assolit el màxim nivell!
        </p>
      )}
    </div>
  )
}
