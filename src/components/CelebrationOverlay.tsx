'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { playSuccessSound, playSuperSuccessSound, playLevelUpSound } from '@/lib/sound'

interface CelebrationOverlayProps {
  visible: boolean
  message?: string
  subMessage?: string
  epic?: boolean
  onComplete?: () => void
}

export default function CelebrationOverlay({
  visible,
  message = '🎉 Molt bé!',
  subMessage,
  epic = false,
  onComplete,
}: CelebrationOverlayProps) {
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

    if (epic) {
      const colors = ['#FFD700', '#FF4B4B', '#58CC02', '#1CB0F6', '#9B59B6', '#FF9600']
      confetti({ particleCount: 160, spread: 100, origin: { x: 0.15, y: 0.7 }, colors, startVelocity: 55 })
      confetti({ particleCount: 160, spread: 100, origin: { x: 0.85, y: 0.7 }, colors, startVelocity: 55 })
      confetti({ particleCount: 200, spread: 140, origin: { x: 0.5, y: 0.5 }, colors, startVelocity: 45 })
      setTimeout(() => confetti({ particleCount: 120, spread: 160, origin: { x: 0.5, y: 0.3 }, colors, scalar: 1.4 }), 400)
      playSuperSuccessSound()
      setTimeout(() => playLevelUpSound(), 300)
    } else {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#58CC02', '#1CB0F6', '#FF9600', '#9B59B6', '#FFD700'],
      })
      playSuccessSound()
    }

    timeoutRef.current = setTimeout(() => {
      onCompleteRef.current?.()
    }, epic ? 3200 : 2200)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [visible, epic])

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
              scale: epic ? [0.3, 1.3, 0.9, 1.1, 1] : [0.3, 1.15, 0.95, 1.05],
              rotate: epic ? [-10, 6, -4, 2, 0] : [-10, 3, -2, 0],
            }}
            transition={{ duration: epic ? 0.7 : 0.5, ease: 'easeOut' }}
            className={`text-center rounded-3xl p-8 shadow-2xl mx-4 ${epic ? 'bg-gradient-to-br from-yellow-100 via-white to-orange-100 ring-4 ring-yellow-400' : 'bg-white'}`}
            style={{ maxWidth: epic ? 360 : 320 }}
          >
            <motion.div
              animate={epic
                ? { rotate: [0, 20, -20, 15, -15, 10, -10, 0], scale: [1, 1.3, 1, 1.2, 1] }
                : { rotate: [0, 15, -15, 10, -10, 0] }
              }
              transition={{ duration: epic ? 1 : 0.6, delay: 0.3 }}
              className={epic ? 'text-8xl mb-3' : 'text-6xl mb-3'}
            >
              {epic ? '🏆' : '⭐'}
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={epic ? 'font-black text-3xl bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 bg-clip-text text-transparent' : 'font-black text-gray-800 text-3xl'}
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

            {['✨', '🌟', '🎊', '💫'].map((emoji, i) => (
              <motion.span
                key={i}
                className="absolute text-2xl pointer-events-none select-none"
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0.5],
                  x: [(i % 2 === 0 ? -1 : 1) * 20, (i % 2 === 0 ? -1 : 1) * 60],
                  y: [-20, -80 - i * 20],
                }}
                transition={{ delay: 0.3 + i * 0.1, duration: 1 }}
                style={{ top: '50%', left: '50%' }}
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
