'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, PanInfo } from 'framer-motion'
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

const SUPER_KEY = 'fab:super:pos'
const ANTI_KEY  = 'fab:anti:pos'

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
  const constraintsRef = useRef<HTMLDivElement>(null)

  const hasSuper = superRoutine && !superDone
  const hasAnti  = !!antiRoutine

  if (!hasSuper && !hasAnti) return null

  const antiValue = antiPoints?.bad ?? antiRoutine?.base_points_bad ?? -15
  const superValue = superPoints?.good ?? superRoutine?.base_points_good ?? 10

  return (
    <>
      {/* Drag boundary — full viewport minus safe areas for navbar / bottom tabs */}
      <div
        ref={constraintsRef}
        aria-hidden
        className="fixed left-2 right-2 top-16 bottom-20 pointer-events-none z-20"
      />

      {hasSuper && (
        <DraggableFab
          storageKey={SUPER_KEY}
          defaultOffsetRight={16}
          defaultOffsetBottom={160}
          size={48}
          constraintsRef={constraintsRef}
          onTap={() => setConfirm('super')}
          ariaLabel={`Completar super rutina ${superRoutine!.name}`}
          title={`Super rutina: ${superRoutine!.name}  ·  Mantén premut per moure`}
        >
          <div className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center bg-gradient-to-br from-yellow-300 via-orange-400 to-red-500 border-2 border-white relative">
            <span className="text-2xl pointer-events-none select-none">{superRoutine!.emoji}</span>
            <motion.span
              animate={{ scale: [1, 1.4, 1], rotate: [0, 20, -20, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-1 -right-1 text-sm pointer-events-none select-none"
            >
              ⭐
            </motion.span>
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.15, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="absolute inset-0 rounded-full ring-4 ring-yellow-300/60 pointer-events-none"
            />
          </div>
        </DraggableFab>
      )}

      {hasAnti && (
        <DraggableFab
          storageKey={ANTI_KEY}
          defaultOffsetRight={16}
          defaultOffsetBottom={96}
          size={56}
          constraintsRef={constraintsRef}
          onTap={() => setConfirm('anti')}
          ariaLabel={`Registrar anti-rutina ${antiRoutine!.name}`}
          title={`Anti-rutina: ${antiRoutine!.name}  ·  Mantén premut per moure`}
        >
          <div className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center bg-gradient-to-br from-red-500 to-red-700 border-2 border-white relative">
            <span className="text-2xl pointer-events-none select-none">{antiRoutine!.emoji}</span>
            <span className="absolute -top-1 -right-1 text-xs bg-white rounded-full w-5 h-5 flex items-center justify-center pointer-events-none">🚫</span>
          </div>
        </DraggableFab>
      )}

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

// ─── DraggableFab ────────────────────────────────────────────────────────────

interface DraggableFabProps {
  storageKey: string
  defaultOffsetRight: number
  defaultOffsetBottom: number
  size: number
  constraintsRef: React.RefObject<HTMLDivElement | null>
  onTap: () => void
  ariaLabel: string
  title: string
  children: React.ReactNode
}

function DraggableFab({
  storageKey,
  defaultOffsetRight,
  defaultOffsetBottom,
  size,
  constraintsRef,
  onTap,
  ariaLabel,
  title,
  children,
}: DraggableFabProps) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const draggedRef = useRef(false)
  const [ready, setReady] = useState(false)

  // Compute initial position on mount (client-only)
  useEffect(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    let initX = vw - size - defaultOffsetRight
    let initY = vh - size - defaultOffsetBottom

    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const pos = JSON.parse(saved) as { x: number; y: number }
        if (typeof pos.x === 'number' && typeof pos.y === 'number') {
          // Clamp into current viewport in case the screen rotated / shrunk
          initX = Math.max(8, Math.min(vw - size - 8, pos.x))
          initY = Math.max(72, Math.min(vh - size - 80, pos.y))
        }
      }
    } catch { /* ignore */ }

    x.set(initX)
    y.set(initY)
    setReady(true)
  }, [storageKey, size, defaultOffsetRight, defaultOffsetBottom, x, y])

  function handleDragStart() {
    draggedRef.current = true
  }

  function handleDragEnd(_: PointerEvent | MouseEvent | TouchEvent, _info: PanInfo) {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ x: x.get(), y: y.get() }))
    } catch { /* ignore quota / private mode */ }
    // Give the click event a tick to see the flag, then reset
    setTimeout(() => { draggedRef.current = false }, 50)
  }

  function handleClick() {
    if (draggedRef.current) return
    onTap()
  }

  return (
    <motion.button
      drag
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={constraintsRef}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      whileTap={{ scale: 0.92 }}
      whileDrag={{ scale: 1.08, cursor: 'grabbing' }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: ready ? 1 : 0, scale: ready ? 1 : 0 }}
      style={{ x, y, position: 'fixed', top: 0, left: 0, touchAction: 'none', zIndex: 30 }}
      aria-label={ariaLabel}
      title={title}
    >
      {children}
    </motion.button>
  )
}
