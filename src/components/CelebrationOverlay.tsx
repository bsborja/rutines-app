'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { playSuccessSound } from '@/lib/sound'

interface CelebrationOverlayProps {
  visible: boolean
  message?: string
  subMessage?: string
  onComplete?: () => void
}

export default function CelebrationOverlay({
  visible,
  message = '🎉 Molt bé!',
  subMessage,
  onComplete,
}: CelebrationOverlayProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!visible) return

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#58CC02', '#1CB0F6', '#FF9600', '#9B59B6', '#FFD700'],
    })
    playSuccessSound()

    timeoutRef.current = setTimeout(() => {
      onComplete?.()
    }, 2200)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [visible, onComplete])

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
              scale: [0.3, 1.15, 0.95, 1.05],
              rotate: [-10, 3, -2, 0],
            }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="text-center bg-white rounded-3xl p-8 shadow-2xl mx-4"
            style={{ maxWidth: 320 }}
          >
            <motion.div
              animate={{ rotate: [0, 15, -15, 10, -10, 0] }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-6xl mb-3"
            >
              ⭐
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-black text-gray-800 text-3xl"
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
