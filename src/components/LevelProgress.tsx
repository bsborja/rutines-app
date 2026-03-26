'use client'

import { motion } from 'framer-motion'
import { LEVEL_POINTS, LEVEL_NAMES, LEVEL_EMOJIS, MAX_LEVEL } from '@/types'
import { getLevelFromPoints, getLevelProgress } from '@/lib/points'

interface LevelProgressProps {
  totalPoints: number
  color: string
  compact?: boolean
}

export default function LevelProgress({ totalPoints, color, compact = false }: LevelProgressProps) {
  const level = getLevelFromPoints(totalPoints)
  const progress = getLevelProgress(totalPoints)
  const levelName = LEVEL_NAMES[level]
  const levelEmoji = LEVEL_EMOJIS[level]
  const isMaxLevel = level >= MAX_LEVEL
  const nextLevel = isMaxLevel ? null : level + 1
  const nextLevelName = nextLevel ? LEVEL_NAMES[nextLevel] : null
  const nextLevelEmoji = nextLevel ? LEVEL_EMOJIS[nextLevel] : null
  const pointsForCurrent = LEVEL_POINTS[level - 1]
  const pointsForNext = nextLevel ? LEVEL_POINTS[nextLevel - 1] : null
  const pointsToNext = pointsForNext ? pointsForNext - totalPoints : 0

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-2xl">{levelEmoji}</span>
        <div>
          <p className="text-xs font-bold text-gray-700">Niv.{level} {levelName}</p>
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
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <span className="text-4xl">{levelEmoji}</span>
          <span
            className="absolute -top-1 -right-2 text-xs font-black bg-gray-800 text-white rounded-full w-5 h-5 flex items-center justify-center"
          >
            {level}
          </span>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Nivell actual</p>
          <p className="text-xl font-black" style={{ color }}>{levelName}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl font-black text-gray-800">{totalPoints.toLocaleString()}</p>
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
              style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.5))' }}
            />
          </motion.div>
        </div>

        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-400">
            {pointsForCurrent.toLocaleString()} pts
          </span>
          {pointsForNext && (
            <span className="text-xs text-gray-400">
              {pointsForNext.toLocaleString()} pts
            </span>
          )}
        </div>
      </div>

      {/* Next level info */}
      {nextLevelName ? (
        <p className="text-sm text-gray-500 mt-2 text-center">
          <span className="font-semibold text-gray-700">{pointsToNext.toLocaleString()} punts</span>{' '}
          per arribar a{' '}
          <span className="font-bold" style={{ color }}>
            {nextLevelEmoji} Niv.{nextLevel} {nextLevelName}
          </span>
        </p>
      ) : (
        <p className="text-sm font-bold text-center mt-2" style={{ color }}>
          🌠 Has assolit el nivell màxim! Llegenda Suprema!
        </p>
      )}

      {/* Level progress dots (show nearby levels) */}
      <div className="flex justify-center gap-1 mt-3 flex-wrap">
        {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((lvl) => (
          <div
            key={lvl}
            className={`rounded-full transition-all ${
              lvl < level
                ? 'w-2 h-2'
                : lvl === level
                ? 'w-3 h-3'
                : 'w-2 h-2 opacity-30'
            }`}
            style={{
              backgroundColor: lvl <= level ? color : '#D1D5DB',
            }}
            title={`Niv.${lvl} ${LEVEL_NAMES[lvl]}`}
          />
        ))}
      </div>
    </div>
  )
}
