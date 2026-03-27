'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseLongPressOptions {
  onLongPress: () => void
  delay?: number
  movementThreshold?: number
  disabled?: boolean
}

export function useLongPress({
  onLongPress,
  delay = 800,
  movementThreshold = 10,
  disabled = false,
}: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)
  const startTimeRef = useRef<number>(0)
  const firedRef = useRef(false)
  const [progress, setProgress] = useState(0)

  // Keep callback ref fresh to avoid stale closures
  const onLongPressRef = useRef(onLongPress)
  useEffect(() => { onLongPressRef.current = onLongPress })

  const cancel = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    setProgress(0)
    startPosRef.current = null
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return
    // Only handle primary pointer (left click / first touch)
    if (!e.isPrimary) return

    firedRef.current = false
    startPosRef.current = { x: e.clientX, y: e.clientY }
    startTimeRef.current = Date.now()
    setProgress(0)

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      setProgress(Math.min(elapsed / delay, 1))
    }, 16)

    timerRef.current = setTimeout(() => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      setProgress(0)
      startPosRef.current = null
      firedRef.current = true
      onLongPressRef.current()
    }, delay)
  }, [disabled, delay])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!startPosRef.current) return
    const dx = e.clientX - startPosRef.current.x
    const dy = e.clientY - startPosRef.current.y
    if (Math.sqrt(dx * dx + dy * dy) > movementThreshold) {
      cancel()
    }
  }, [cancel, movementThreshold])

  const onPointerUp = useCallback(() => {
    cancel()
  }, [cancel])

  // Cleanup on unmount
  useEffect(() => () => cancel(), [cancel])

  return {
    progress,
    isLongPressing: progress > 0,
    /** True right after the long-press fires — use to swallow the subsequent click */
    firedRef,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  }
}
