'use client'

import { motion } from 'framer-motion'
import { Routine, RoutineLog, EffectivePoints, CATEGORY_COLORS } from '@/types'
import { useLongPress } from '@/hooks/useLongPress'

interface RoutineCardProps {
  routine: Routine
  log?: RoutineLog | null
  onClick: () => void
  onSkip?: () => void
  index?: number
  effectivePoints?: EffectivePoints
  batchMode?: boolean
  isSelected?: boolean
  onToggleSelect?: () => void
}

const scoreConfig = {
  good: { emoji: '✅', label: 'Bé',       color: '#58CC02', bg: '#F0FBE4' },
  ok:   { emoji: '🟡', label: 'Regular',  color: '#FF9600', bg: '#FFF8EC' },
  bad:  { emoji: '❌', label: 'Malament', color: '#FF4B4B', bg: '#FFF0F0' },
  skip: { emoji: '⏭️', label: 'Saltada',  color: '#9CA3AF', bg: '#F9FAFB' },
}

export default function RoutineCard({
  routine,
  log,
  onClick,
  onSkip,
  index = 0,
  effectivePoints,
  batchMode = false,
  isSelected = false,
  onToggleSelect,
}: RoutineCardProps) {
  const categoryColor = CATEGORY_COLORS[routine.category]
  const isDone = !!log
  const isSkip = log?.score === 'skip'
  const score  = log?.score ? scoreConfig[log.score] : null

  const longPress = useLongPress({
    onLongPress: () => { if (!batchMode && onSkip) onSkip() },
    delay: 800,
    movementThreshold: 10,
    disabled: batchMode || !onSkip,
  })

  function handleClick() {
    if (longPress.firedRef.current) { longPress.firedRef.current = false; return }
    if (batchMode) { onToggleSelect?.() } else { onClick() }
  }

  const borderColor = isSelected ? '#3B82F6' : isDone ? (score?.color || '#E5E7EB') : '#E5E7EB'
  const bgColor     = isSelected ? '#EFF6FF' : isDone ? (score?.bg || 'white') : 'white'

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      onClick={handleClick}
      {...longPress.handlers}
      className={`relative w-full text-left rounded-2xl shadow-sm overflow-hidden transition-all p-4 select-none ${isDone && !isSelected ? 'opacity-80' : ''} ${!batchMode && !isDone ? 'active:scale-97 hover:shadow-md' : ''} bg-white border-2`}
      style={{ borderColor, backgroundColor: bgColor }}
    >
      {longPress.isLongPressing && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-orange-50/70 z-10 pointer-events-none">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="23" fill="none" stroke="#FED7AA" strokeWidth="4" />
            <circle cx="28" cy="28" r="23" fill="none" stroke="#F97316" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 23}`}
              strokeDashoffset={`${2 * Math.PI * 23 * (1 - longPress.progress)}`}
              style={{ transition: 'stroke-dashoffset 16ms linear' }} />
          </svg>
          <span className="absolute text-lg">⏭️</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        {batchMode && (
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'}`}>
            {isSelected && (
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        )}
        <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: isSkip ? '#D1D5DB' : categoryColor }} />
        <span className="text-3xl" style={{ opacity: isSkip ? 0.5 : 1 }}>{routine.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className={`font-black leading-tight text-base ${isSkip ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{routine.name}</p>
          {!isSkip && <p className="text-gray-500 text-xs mt-0.5 truncate">{routine.description}</p>}
          {isSkip  && <p className="text-gray-400 text-xs mt-0.5 italic">Saltada avui</p>}
        </div>
        <div className="flex-shrink-0">
          {isDone ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center">
              <span className="text-2xl">{score?.emoji}</span>
              {!isSkip && (
                <span className="text-xs font-bold" style={{ color: score?.color }}>
                  {log?.points_awarded !== undefined && log.points_awarded > 0 ? `+${log.points_awarded}` : log?.points_awarded}&nbsp;pts
                </span>
              )}
            </motion.div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {!isDone && !batchMode && (
        <div className="flex gap-3 mt-2 ml-7">
          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-semibold">Bé: +{effectivePoints?.good ?? routine.base_points_good} pts</span>
          <span className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full font-semibold">Regular: +{effectivePoints?.ok ?? routine.base_points_ok} pts</span>
        </div>
      )}
    </motion.button>
  )
}
