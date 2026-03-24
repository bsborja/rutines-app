'use client'

import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Routine, RoutineLog, CATEGORY_COLORS } from '@/types'

interface RoutineCardProps {
  routine: Routine
  log?: RoutineLog | null
  onClick: () => void
  onSkip?: () => void
  index?: number
}

const scoreConfig = {
  good: { emoji: '✅', label: 'Bé',       color: '#58CC02', bg: '#F0FBE4' },
  ok:   { emoji: '🟡', label: 'Regular',  color: '#FF9600', bg: '#FFF8EC' },
  bad:  { emoji: '❌', label: 'Malament', color: '#FF4B4B', bg: '#FFF0F0' },
  skip: { emoji: '⏭️', label: 'Saltada',  color: '#9CA3AF', bg: '#F9FAFB' },
}

const LONG_PRESS_MS = 600

export default function RoutineCard({
  routine,
  log,
  onClick,
  onSkip,
  index = 0,
}: RoutineCardProps) {
  const categoryColor = CATEGORY_COLORS[routine.category]
  const isDone  = !!log
  const isSkip  = log?.score === 'skip'
  const score   = log?.score ? scoreConfig[log.score] : null

  const [showSkipConfirm, setShowSkipConfirm] = useState(false)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPress = useRef(false)

  function startPress() {
    didLongPress.current = false
    pressTimer.current = setTimeout(() => {
      didLongPress.current = true
      setShowSkipConfirm(true)
    }, LONG_PRESS_MS)
  }

  function endPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  function handleClick() {
    if (didLongPress.current) return // long-press handled separately
    if (showSkipConfirm) return
    onClick()
  }

  function confirmSkip() {
    setShowSkipConfirm(false)
    onSkip?.()
  }

  return (
    <>
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06, duration: 0.3 }}
        whileTap={{ scale: didLongPress.current ? 1 : 0.97 }}
        onClick={handleClick}
        onMouseDown={startPress}
        onMouseUp={endPress}
        onMouseLeave={endPress}
        onTouchStart={startPress}
        onTouchEnd={endPress}
        onContextMenu={(e) => e.preventDefault()}
        className={`
          w-full text-left rounded-2xl shadow-sm overflow-hidden transition-all p-4 select-none
          ${isDone ? 'opacity-80' : 'hover:shadow-md'}
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
            style={{ backgroundColor: isSkip ? '#D1D5DB' : categoryColor }}
          />

          {/* Emoji */}
          <span className="text-3xl" style={{ opacity: isSkip ? 0.5 : 1 }}>{routine.emoji}</span>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className={`font-black leading-tight text-base ${isSkip ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
              {routine.name}
            </p>
            {!isSkip && (
              <p className="text-gray-500 text-xs mt-0.5 truncate">{routine.description}</p>
            )}
            {isSkip && (
              <p className="text-gray-400 text-xs mt-0.5 italic">Saltada avui</p>
            )}
          </div>

          {/* Status */}
          <div className="flex-shrink-0">
            {isDone ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center">
                <span className="text-2xl">{score?.emoji}</span>
                {!isSkip && (
                  <span className="text-xs font-bold" style={{ color: score?.color }}>
                    {log?.points_awarded !== undefined && log.points_awarded > 0
                      ? `+${log.points_awarded}`
                      : log?.points_awarded}
                    &nbsp;pts
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

        {/* Points info (not done, not skip) */}
        {!isDone && (
          <div className="flex gap-3 mt-2 ml-7">
            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-semibold">
              Bé: +{routine.base_points_good} pts
            </span>
            <span className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full font-semibold">
              Regular: +{routine.base_points_ok} pts
            </span>
          </div>
        )}

        {/* Long-press hint (not done) */}
        {!isDone && onSkip && (
          <p className="text-[10px] text-gray-300 mt-1 ml-7">Mantén premut per saltar</p>
        )}
      </motion.button>

      {/* Skip confirmation overlay */}
      <AnimatePresence>
        {showSkipConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6"
            onClick={() => setShowSkipConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl p-7 w-full max-w-xs text-center"
            >
              <p className="text-5xl mb-3">⏭️</p>
              <h3 className="text-xl font-black text-gray-800 mb-1">Saltar {routine.name}?</h3>
              <p className="text-sm text-gray-500 mb-6">
                No sumarà ni restarà punts. No comptarà com a dia incomplet.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSkipConfirm(false)}
                  className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold"
                >
                  Cancel·lar
                </button>
                <button
                  onClick={confirmSkip}
                  className="flex-1 py-3 rounded-2xl bg-gray-700 text-white font-black"
                >
                  Saltar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
