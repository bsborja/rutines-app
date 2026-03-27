'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { BehaviorScore } from '@/types'

interface BatchActionBarProps {
  count: number
  totalGoodPoints: number
  totalOkPoints: number
  totalBadPoints: number
  onRate: (score: BehaviorScore) => void
  onCancel: () => void
}

export default function BatchActionBar({
  count,
  totalGoodPoints,
  totalOkPoints,
  totalBadPoints,
  onRate,
  onCancel,
}: BatchActionBarProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t-2 border-gray-100 shadow-2xl px-4 pt-3 pb-safe"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <p className="font-black text-gray-700 text-sm">
                {count} rutine{count !== 1 ? 's' : ''} seleccionade{count !== 1 ? 's' : ''}
              </p>
              <button
                onClick={onCancel}
                className="text-sm text-gray-400 font-semibold hover:text-gray-600 transition-colors"
              >
                Cancel·lar
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onRate('good')}
                className="flex-1 rounded-2xl py-3 flex flex-col items-center gap-0.5 font-black text-white transition-all active:scale-95"
                style={{ backgroundColor: '#58CC02' }}
              >
                <span className="text-lg">😄</span>
                <span className="text-xs">Bé!</span>
                <span className="text-xs opacity-90">+{totalGoodPoints} pts</span>
              </button>

              <button
                onClick={() => onRate('ok')}
                className="flex-1 rounded-2xl py-3 flex flex-col items-center gap-0.5 font-black text-white transition-all active:scale-95"
                style={{ backgroundColor: '#FF9600' }}
              >
                <span className="text-lg">😐</span>
                <span className="text-xs">Regular</span>
                <span className="text-xs opacity-90">+{totalOkPoints} pts</span>
              </button>

              <button
                onClick={() => onRate('bad')}
                className="flex-1 rounded-2xl py-3 flex flex-col items-center gap-0.5 font-black text-white transition-all active:scale-95"
                style={{ backgroundColor: '#FF4B4B' }}
              >
                <span className="text-lg">😔</span>
                <span className="text-xs">Malament</span>
                <span className="text-xs opacity-90">{totalBadPoints} pts</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
