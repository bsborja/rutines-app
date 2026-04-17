'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Routine, EffectivePoints } from '@/types'

interface FloatingActionsProps {
  superRoutine?: Routine | null
  superDone?: boolean
  superPoints?: EffectivePoints
  antiRoutine?: Routine | null
  antiPoints?: EffectivePoints
  onSuperComplete: () => void
  onAntiTrigger: () => void
}

export default function FloatingActions({
  superRoutine,
  superDone = false,
  superPoints,
  antiRoutine,
  antiPoints,
  onSuperComplete,
  onAntiTrigger,
}: FloatingActionsProps) {
  const [confirm, setConfirm] = useState<'super' | 'anti' | null>(null)

  const hasSuper = superRoutine && !superDone
  const hasAnti  = !!antiRoutine

  if (!hasSuper && !hasAnti) return null

  const antiValue = antiPoints?.bad ?? antiRoutine?.base_points_bad ?? -15
  const superValue = superPoints?.good ?? superRoutine?.base_points_good ?? 10

  return (
    <>
      {/* Floating buttons stack, bottom-right above bottom padding */}
      <div className="fixed right-4 bottom-24 z-30 flex flex-col gap-3 items-end">
        {hasSuper && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setConfirm('super')}
            title={`Super rutina: ${superRoutine!.name}`}
            className="relative w-12 h-12 rounded-full shadow-lg flex items-center justify-center bg-gradient-to-br from-yellow-300 via-orange-400 to-red-500 border-2 border-white"
            aria-label={`Completar super rutina ${superRoutine!.name}`}
          >
            <span className="text-2xl">{superRoutine!.emoji}</span>
            <motion.span
              animate={{ scale: [1, 1.4, 1], rotate: [0, 20, -20, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-1 -right-1 text-sm"
            >
              ⭐
            </motion.span>
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.15, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="absolute inset-0 rounded-full ring-4 ring-yellow-300/60 pointer-events-none"
            />
          </motion.button>
        )}
        {hasAnti && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setConfirm('anti')}
            title={`Anti-rutina: ${antiRoutine!.name}`}
            className="relative w-14 h-14 rounded-full shadow-xl flex items-center justify-center bg-gradient-to-br from-red-500 to-red-700 border-2 border-white"
            aria-label={`Registrar anti-rutina ${antiRoutine!.name}`}
          >
            <span className="text-2xl grayscale-[0%]">{antiRoutine!.emoji}</span>
            <span className="absolute -top-1 -right-1 text-xs bg-white rounded-full w-5 h-5 flex items-center justify-center">🚫</span>
          </motion.button>
        )}
      </div>

      {/* Confirmation modal */}
      <AnimatePresence>
        {confirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              {confirm === 'super' && superRoutine && (
                <>
                  <p className="text-6xl text-center mb-2">{superRoutine.emoji}</p>
                  <h3 className="font-black text-center text-xl text-gray-800 mb-1">
                    Has fet la super rutina?
                  </h3>
                  <p className="text-center text-gray-500 text-sm mb-5">
                    <span className="font-black text-orange-500">{superRoutine.name}</span>
                    <br />
                    <span className="text-xs">Guanyaràs <span className="font-black text-green-600">+{superValue} punts</span> i una celebració BRUTAL!</span>
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirm(null)}
                      className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-600"
                    >
                      Encara no
                    </button>
                    <button
                      onClick={() => { setConfirm(null); onSuperComplete() }}
                      className="flex-1 py-3 rounded-2xl font-black text-white shadow-lg active:scale-95 transition-transform"
                      style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)' }}
                    >
                      🏆 SÍ!
                    </button>
                  </div>
                </>
              )}
              {confirm === 'anti' && antiRoutine && (
                <>
                  <p className="text-6xl text-center mb-2">⚠️</p>
                  <h3 className="font-black text-center text-xl text-gray-800 mb-1">
                    Registrar {antiRoutine.name}?
                  </h3>
                  <p className="text-center text-gray-500 text-sm mb-5">
                    Es restaran <span className="font-black text-red-600">{antiValue} punts</span>.
                    <br />
                    <span className="text-xs">Aquesta acció queda registrada a l{'\''}historial.</span>
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirm(null)}
                      className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-600"
                    >
                      Cancel·lar
                    </button>
                    <button
                      onClick={() => { setConfirm(null); onAntiTrigger() }}
                      className="flex-1 py-3 rounded-2xl font-black text-white bg-red-600 active:scale-95 transition-transform"
                    >
                      🚫 Sí, restar
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
