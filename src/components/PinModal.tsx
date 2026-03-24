'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PinModalProps {
  name: string
  avatarUrl?: string | null
  color: string
  onSuccess: () => void
  onCancel: () => void
  onVerify: (pin: string) => Promise<boolean>
  isSetup?: boolean
}

export default function PinModal({
  name,
  avatarUrl,
  color,
  onSuccess,
  onCancel,
  onVerify,
  isSetup = false,
}: PinModalProps) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [step, setStep] = useState<'enter' | 'confirm'>('enter')
  const [error, setError] = useState('')
  const [shaking, setShaking] = useState(false)
  const [loading, setLoading] = useState(false)

  const MAX_DIGITS = 4

  // Physical keyboard support
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (loading) return
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key)
      } else if (e.key === 'Backspace') {
        handleDelete()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  function handleDigit(digit: string) {
    if (loading) return

    if (step === 'enter') {
      if (pin.length < MAX_DIGITS) {
        const newPin = pin + digit
        setPin(newPin)
        setError('')
        if (newPin.length === MAX_DIGITS) {
          handlePinComplete(newPin)
        }
      }
    } else {
      if (confirmPin.length < MAX_DIGITS) {
        const newConfirm = confirmPin + digit
        setConfirmPin(newConfirm)
        setError('')
        if (newConfirm.length === MAX_DIGITS) {
          handleConfirmComplete(pin, newConfirm)
        }
      }
    }
  }

  async function handlePinComplete(enteredPin: string) {
    if (isSetup) {
      setStep('confirm')
      return
    }

    setLoading(true)
    const ok = await onVerify(enteredPin)
    setLoading(false)

    if (ok) {
      onSuccess()
    } else {
      setError('PIN incorrecte. Torna-ho a intentar.')
      shake()
      setPin('')
    }
  }

  async function handleConfirmComplete(original: string, confirm: string) {
    if (original !== confirm) {
      setError('Els PINs no coincideixen. Torna-ho a intentar.')
      shake()
      setConfirmPin('')
      setStep('enter')
      setPin('')
      return
    }

    setLoading(true)
    const ok = await onVerify(original)
    setLoading(false)

    if (ok) {
      onSuccess()
    }
  }

  function handleDelete() {
    if (step === 'enter') setPin((p) => p.slice(0, -1))
    else setConfirmPin((c) => c.slice(0, -1))
    setError('')
  }

  function shake() {
    setShaking(true)
    setTimeout(() => setShaking(false), 500)
  }

  const currentPin = step === 'enter' ? pin : confirmPin

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={(e) => e.target === e.currentTarget && onCancel()}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm"
        >
          {/* Header */}
          <div className="text-center mb-6">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-4"
                style={{ borderColor: color }}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-4xl font-black text-white"
                style={{ backgroundColor: color }}
              >
                {name[0]}
              </div>
            )}
            <h2 className="text-2xl font-black text-gray-800">Hola, {name}!</h2>
            <p className="text-gray-500 mt-1">
              {isSetup
                ? step === 'enter'
                  ? 'Crea el teu PIN de 4 dígits'
                  : 'Confirma el PIN'
                : 'Introdueix el teu PIN'}
            </p>
          </div>

          {/* PIN dots */}
          <motion.div
            animate={shaking ? { x: [-8, 8, -8, 8, -4, 4, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="flex justify-center gap-4 mb-6"
          >
            {Array.from({ length: MAX_DIGITS }).map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  scale: i === currentPin.length - 1 ? [1, 1.3, 1] : 1,
                }}
                transition={{ duration: 0.15 }}
                className="w-4 h-4 rounded-full border-2 transition-colors"
                style={{
                  backgroundColor: i < currentPin.length ? color : 'transparent',
                  borderColor: i < currentPin.length ? color : '#D1D5DB',
                }}
              />
            ))}
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-red-500 text-center text-sm mb-4"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3">
            {digits.map((digit, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: digit ? 0.9 : 1 }}
                onClick={() => {
                  if (digit === '⌫') handleDelete()
                  else if (digit) handleDigit(digit)
                }}
                disabled={loading || !digit}
                className={`
                  h-16 rounded-2xl text-2xl font-bold transition-colors
                  ${digit === '' ? 'invisible' : ''}
                  ${digit === '⌫'
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : digit
                    ? 'bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300'
                    : ''
                  }
                `}
              >
                {digit}
              </motion.button>
            ))}
          </div>

          {/* Cancel button */}
          <button
            onClick={onCancel}
            className="w-full mt-4 py-3 text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel·lar
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
