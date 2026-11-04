import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'

export function useHoldToConfirm({
  durationMs,
  onConfirm,
}: {
  durationMs: number
  onConfirm: () => void
}) {
  const [isHolding, setIsHolding] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const confirm = useRef(onConfirm)
  useLayoutEffect(() => {
    confirm.current = onConfirm
  }, [onConfirm])
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current)
    },
    [],
  )

  function cancel() {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
    setIsHolding(false)
  }

  function start() {
    if (timer.current !== null) return
    setIsHolding(true)
    timer.current = setTimeout(() => {
      setIsHolding(false)
      confirm.current()
    }, durationMs)
  }

  function isConfirmKey(event: KeyboardEvent) {
    return event.key === 'Enter' || event.key === ' '
  }

  return {
    isHolding,
    handlers: {
      onPointerDown(event: PointerEvent) {
        if (event.button !== 0 || !event.isPrimary) return
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId)
        start()
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onKeyDown(event: KeyboardEvent) {
        if (!isConfirmKey(event)) return
        event.preventDefault()
        if (!event.repeat) start()
      },
      onKeyUp(event: KeyboardEvent) {
        if (!isConfirmKey(event)) return
        event.preventDefault()
        cancel()
      },
      onBlur: cancel,
    },
  }
}
