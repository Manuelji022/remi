import { useEffect, useLayoutEffect, useRef } from 'react'

/**
 * Hands focus back to the element that opened the panel once it closes,
 * without scrolling: the scroll lock has already restored the page position.
 */
export function useRestoreFocus(isOpen: boolean) {
  const openerRef = useRef<HTMLElement | null>(null)

  // Layout effects run before the dialog's showModal() moves focus inside.
  useLayoutEffect(() => {
    if (!isOpen) return
    const active = document.activeElement
    openerRef.current = active instanceof HTMLElement ? active : null
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    return () => {
      const opener = openerRef.current
      openerRef.current = null
      if (opener?.isConnected && !opener.matches(':disabled')) {
        opener.focus({ preventScroll: true })
      }
    }
  }, [isOpen])
}
