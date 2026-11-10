import { useLayoutEffect } from 'react'

/** Freezes page scrolling while open and restores position and styles on close. */
export function usePanelScrollLock(isOpen: boolean) {
  useLayoutEffect(() => {
    if (!isOpen) return

    const scrollY = window.scrollY
    const root = document.documentElement
    const body = document.body
    const previous = {
      rootOverflow: root.style.overflow,
      bodyPosition: body.style.position,
      bodyInsetBlockStart: body.style.insetBlockStart,
      bodyInlineSize: body.style.inlineSize,
      bodyOverflow: body.style.overflow,
    }

    root.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.insetBlockStart = `-${scrollY}px`
    body.style.inlineSize = '100%'
    body.style.overflow = 'hidden'

    return () => {
      root.style.overflow = previous.rootOverflow
      body.style.position = previous.bodyPosition
      body.style.insetBlockStart = previous.bodyInsetBlockStart
      body.style.inlineSize = previous.bodyInlineSize
      body.style.overflow = previous.bodyOverflow
      window.scrollTo(0, scrollY)
    }
  }, [isOpen])
}
