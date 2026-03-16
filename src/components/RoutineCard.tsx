'use client'

import { motion } from 'framer-motion'
import { Routine, RoutineLog, CATEGORY_COLORS } from '@/types'

interface RoutineCardProps {
  routine: Routine
  log?: RoutineLog | null
  onClick: () => void
  isJuliaMode?: boolean
  index?: number
}

const scoreConfig = {
  good: { emoji: '✅', label: 'Bé', color: '#58CC02', bg: '#F0FBE4' },
  ok: { emoji: '🟡', label: 'Regular', color: '#FF9600', bg: '#FFF8EC' },
  bad: { emoji: '❌', label: 'Malament', color: '#FF4B4B', bg: '#FFF0F0' },
}

export default function RoutineCard({
  routine,
  log,
  onClick,
  isJuliaMode = false,
  index = 0,
}: RoutineCardProps) {
  const categoryColor = CATEGORY_COLORS[routine.category]
  const isDone = !!log
  const score = log?.score ? scoreConfig[log.score] : null

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`
        w-full text-left rounded-2xl shadow-sm overflow-hidden transition-all
        ${isDone ? 'opacity-80' : 'hover:shadow-md'}
        ${isJuliaMode ? 'p-5' : 'p-4'}
        bg-white border-2
      `}
      style={{
        borderColor: isDone ? (score?.color || '#E5E7EB') : '#E5E7EB',
        backgroundColor: isDone ? (score?.bg || 'white') : 'white',
      }}
    >
      <div className="flex items-center gap-3">
        {/* Category color bar */}
        <div
          className="w-1 self-stretch rounded-full flex-shrink-0"
          style={{ backgroundColor: categoryColor }}
        />

        {/* Emoji */}
        <span className={isJuliaMode ? 'text-5xl' : 'text-3xl'}>{routine.emoji}</span>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p
            className={`font-black text-gray-800 leading-tight ${
              isJuliaMode ? 'text-xl' : 'text-base'
            }`}
          >
            {routine.name}
          </p>
          {!isJuliaMode && (
            <p className="text-gray-500 text-xs mt-0.5 truncate">{routine.description}</p>
          )}
        </div>

        {/* Status */}
        <div className="flex-shrink-0">
          {isDone ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex flex-col items-center"
            >
              <span className={isJuliaMode ? 'text-3xl' : 'text-2xl'}>{score?.emoji}</span>
              {!isJuliaMode && (
                <span className="text-xs font-bold" style={{ color: score?.color }}>
                  {log?.points_awarded !== undefined && log.points_awarded > 0
                    ? `+${log.points_awarded}`
                    : log?.points_awarded}
                  &nbsp;pts
                </span>
              )}
            </motion.div>
          ) : (
            <div
              className={`
                rounded-full bg-gray-100 flex items-center justify-center
                ${isJuliaMode ? 'w-12 h-12' : 'w-8 h-8'}
              `}
            >
              <svg
                className={`text-gray-400 ${isJuliaMode ? 'w-6 h-6' : 'w-4 h-4'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Points info (not done) */}
      {!isDone && !isJuliaMode && (
        <div className="flex gap-3 mt-2 ml-7">
          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-semibold">
            Bé: +{routine.base_points_good} pts
          </span>
          <span className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full font-semibold">
            Regular: +{routine.base_points_ok} pts
          </span>
        </div>
      )}
    </motion.button>
  )
}
