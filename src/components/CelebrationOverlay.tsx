'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import {
  playSuccessSound,
  playSuperSuccessSound,
  playLevelUpSound,
  playLegendarySound,
} from '@/lib/sound'

export type CelebrationTier = 'regular' | 'epic' | 'legendary'

interface CelebrationOverlayProps {
  visible: boolean
  message?: string
  subMessage?: string
  /** 'regular' = single good rating; 'epic' = super routine OR level-up; 'legendary' = super + level-up */
  tier?: CelebrationTier
  /** Backwards-compat: maps to tier='epic' if tier not set */
  epic?: boolean
  /** When set, displays a prominent level badge inside the celebration */
  levelUp?: number
  onComplete?: () => void
}

export default function CelebrationOverlay({
  visible,
  message = '🎉 Molt bé!',
  subMessage,
  tier,
  epic = false,
  levelUp,
  onComplete,
}: CelebrationOverlayProps) {
  const effectiveTier: CelebrationTier = tier ?? (epic ? 'epic' : 'regular')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  useEffect(() => { onCompleteRef.current = onComplete })

  useEffect(() => {
    if (!visible) {
      firedRef.current = false
      return
    }
    if (firedRef.current) return
    firedRef.current = true

    const colors = ['#FFD700', '#FF4B4B', '#58CC02', '#1CB0F6', '#9B59B6', '#FF9600']

    if (effectiveTier === 'legendary') {
      // 5 confetti bursts + bell rain
      confetti({ particleCount: 220, spread: 110, origin: { x: 0.1,  y: 0.7 }, colors, startVelocity: 65 })
      confetti({ particleCount: 220, spread: 110, origin: { x: 0.9,  y: 0.7 }, colors, startVelocity: 65 })
      confetti({ particleCount: 280, spread: 160, origin: { x: 0.5,  y: 0.5 }, colors, startVelocity: 55, scalar: 1.2 })
      setTimeout(() => confetti({ particleCount: 180, spread: 180, origin: { x: 0.5, y: 0.2 }, colors, scalar: 1.6, gravity: 0.7 }), 350)
      setTimeout(() => confetti({ particleCount: 160, spread: 140, origin: { x: 0.3, y: 0.4 }, colors, scalar: 1.3 }), 700)
      setTimeout(() => confetti({ particleCount: 160, spread: 140, origin: { x: 0.7, y: 0.4 }, colors, scalar: 1.3 }), 700)
      setTimeout(() => confetti({ particleCount: 240, spread: 200, origin: { x: 0.5, y: 0.3 }, colors, scalar: 1.4, ticks: 300 }), 1100)
      playLegendarySound()
      setTimeout(() => playLevelUpSound(), 1400)
    } else if (effectiveTier === 'epic') {
      confetti({ particleCount: 160, spread: 100, origin: { x: 0.15, y: 0.7 }, colors, startVelocity: 55 })
      confetti({ particleCount: 160, spread: 100, origin: { x: 0.85, y: 0.7 }, colors, startVelocity: 55 })
      confetti({ particleCount: 200, spread: 140, origin: { x: 0.5,  y: 0.5 }, colors, startVelocity: 45 })
      setTimeout(() => confetti({ particleCount: 120, spread: 160, origin: { x: 0.5, y: 0.3 }, colors, scalar: 1.4 }), 400)
      playSuperSuccessSound()
      if (levelUp) setTimeout(() => playLevelUpSound(), 300)
    } else {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#58CC02', '#1CB0F6', '#FF9600', '#9B59B6', '#FFD700'],
      })
      playSuccessSound()
    }

    const duration = effectiveTier === 'legendary' ? 4200 : effectiveTier === 'epic' ? 3200 : 2200
    timeoutRef.current = setTimeout(() => {
      onCompleteRef.current?.()
    }, duration)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [visible, effectiveTier, levelUp])

  const isEpic = effectiveTier === 'epic'
  const isLegendary = effectiveTier === 'legendary'
  const isFancy = isEpic || isLegendary

  const heroEmoji = isLegendary ? '👑' : isEpic ? '🏆' : '⭐'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={onComplete}
        >
          <motion.div
            initial={{ scale: 0.3, rotate: -10 }}
            animate={{
              scale: isLegendary
                ? [0.3, 1.4, 0.85, 1.2, 0.95, 1.08, 1]
                : isEpic
                  ? [0.3, 1.3, 0.9, 1.1, 1]
                  : [0.3, 1.15, 0.95, 1.05],
              rotate: isLegendary ? [-10, 8, -5, 4, -2, 0] : isEpic ? [-10, 6, -4, 2, 0] : [-10, 3, -2, 0],
            }}
            transition={{ duration: isLegendary ? 0.9 : isEpic ? 0.7 : 0.5, ease: 'easeOut' }}
            className={`text-center rounded-3xl p-8 shadow-2xl mx-4 ${
              isLegendary
                ? 'bg-gradient-to-br from-yellow-200 via-pink-100 to-purple-200 ring-4 ring-yellow-500'
                : isEpic
                  ? 'bg-gradient-to-br from-yellow-100 via-white to-orange-100 ring-4 ring-yellow-400'
                  : 'bg-white'
            }`}
            style={{ maxWidth: isLegendary ? 380 : isEpic ? 360 : 320 }}
          >
            <motion.div
              animate={isLegendary
                ? { rotate: [0, 25, -25, 20, -20, 15, -15, 10, -10, 0], scale: [1, 1.4, 1, 1.3, 1, 1.2, 1] }
                : isEpic
                  ? { rotate: [0, 20, -20, 15, -15, 10, -10, 0], scale: [1, 1.3, 1, 1.2, 1] }
                  : { rotate: [0, 15, -15, 10, -10, 0] }
              }
              transition={{ duration: isLegendary ? 1.4 : isEpic ? 1 : 0.6, delay: 0.3 }}
              className={isFancy ? 'text-8xl mb-3' : 'text-6xl mb-3'}
            >
              {heroEmoji}
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={
                isLegendary
                  ? 'font-black text-3xl bg-gradient-to-r from-yellow-500 via-pink-500 via-purple-600 to-blue-500 bg-clip-text text-transparent'
                  : isEpic
                    ? 'font-black text-3xl bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 bg-clip-text text-transparent'
                    : 'font-black text-gray-800 text-3xl'
              }
            >
              {message}
            </motion.p>

            {subMessage && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-gray-600 mt-2 text-lg"
              >
                {subMessage}
              </motion.p>
            )}

            {levelUp !== undefined && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.55, type: 'spring', stiffness: 220 }}
                className={`mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-full font-black text-white shadow-lg ${
                  isLegendary
                    ? 'bg-gradient-to-r from-yellow-500 via-pink-500 to-purple-600 text-xl'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-lg'
                }`}
              >
                <span>⬆️</span>
                <span>Nivell {levelUp}!</span>
              </motion.div>
            )}

            {(isLegendary ? ['✨', '🌟', '🎊', '💫', '⭐', '🎆'] : ['✨', '🌟', '🎊', '💫']).map((emoji, i, arr) => (
              <motion.span
                key={i}
                className="absolute text-2xl pointer-events-none select-none"
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.2, 0.5],
                  x: [(i % 2 === 0 ? -1 : 1) * 20, (i % 2 === 0 ? -1 : 1) * (60 + (isLegendary ? 30 : 0))],
                  y: [-20, -80 - i * 20],
                }}
                transition={{ delay: 0.3 + i * 0.08, duration: isLegendary ? 1.4 : 1, repeat: isLegendary ? 1 : 0, repeatDelay: 0.4 }}
                style={{ top: '50%', left: `${50 + (i - arr.length / 2) * 4}%` }}
              >
                {emoji}
              </motion.span>
            ))}

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 1 }}
              className="text-gray-400 text-sm mt-4"
            >
              Toca per continuar
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
