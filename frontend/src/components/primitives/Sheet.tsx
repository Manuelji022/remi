import { useEffect, useId, useRef } from 'react'
import { useModalDialog } from './useModalDialog'
import './Sheet.css'
import type { PointerEvent, ReactNode } from 'react'

export interface SheetProps {
  /** The task ("Add an item", "Swap Thursday dinner"). It labels the dialog. */
  title: ReactNode
  /** One line under the title. */
  description?: ReactNode
  /** The body: the only part that scrolls. */
  children: ReactNode
  /** Block buttons, the main action first, `Cancel` (ghost) below it. Every
   *  sheet needs a visible way out, so dragging is never the only one. */
  actions?: ReactNode
  /** Escape, a tap on the scrim, a drag down or the ghost button. Ask first
   *  here when there is unsaved input. */
  onDismiss: () => void
  /** Blocks every way out while a request is in flight. */
  dismissDisabled?: boolean
  returnFocusTo?: HTMLElement | null
  /** Stable base for the title and description ids (`<id>-title`). */
  id?: string
  className?: string
}

/** Past a third of the sheet, or a quick flick (px per ms), it closes. */
const DISMISS_FRACTION = 1 / 3
const FLICK_SPEED = 0.5

export function Sheet({
  title,
  description,
  children,
  actions,
  onDismiss,
  dismissDisabled = false,
  returnFocusTo,
  id,
  className,
}: SheetProps) {
  const generatedId = useId()
  const baseId = id ?? generatedId
  const titleId = `${baseId}-title`
  const descriptionId = description ? `${baseId}-description` : undefined
  const { ref, onCancel } = useModalDialog({
    onDismiss,
    dismissDisabled,
    returnFocusTo,
  })
  const titleRef = useRef<HTMLHeadingElement>(null)
  const drag = useRef<{ y: number; at: number } | null>(null)
  const closeTimer = useRef<number>(0)

  // Focus goes to the first field, or to the title when the body has none.
  // The browser alone would always pick the title: it is focusable.
  useEffect(() => {
    const field = ref.current?.querySelector<HTMLElement>(
      '.sheet-body :is(input, select, textarea)',
    )
    ;(field ?? titleRef.current)?.focus()
    return () => window.clearTimeout(closeTimer.current)
  }, [ref])

  function dismiss() {
    if (!dismissDisabled) onDismiss()
  }

  function startDrag(event: PointerEvent<HTMLElement>) {
    if (dismissDisabled || !event.isPrimary || event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { y: event.clientY, at: event.timeStamp }
    ref.current?.setAttribute('data-dragging', '')
  }

  function moveDrag(event: PointerEvent<HTMLElement>) {
    if (!drag.current) return
    // Dragging up does nothing: no detents, no full-screen state.
    const dy = Math.max(0, event.clientY - drag.current.y)
    ref.current?.style.setProperty('--sheet-drag', `${dy}px`)
  }

  function endDrag(event: PointerEvent<HTMLElement>) {
    const start = drag.current
    const dialog = ref.current
    drag.current = null
    if (!start || !dialog) return
    dialog.removeAttribute('data-dragging')
    const dy = Math.max(0, event.clientY - start.y)
    const speed = dy / Math.max(1, event.timeStamp - start.at)
    if (dy > dialog.offsetHeight * DISMISS_FRACTION || speed > FLICK_SPEED) {
      // Slide the rest of the way out, then ask. The owner may refuse (unsaved
      // input), so the sheet springs back when it stays.
      dialog.style.setProperty('--sheet-drag', '100%')
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
      closeTimer.current = window.setTimeout(
        () => {
          dialog.style.removeProperty('--sheet-drag')
          onDismiss()
        },
        reduced.matches ? 0 : 200,
      )
    } else {
      dialog.style.removeProperty('--sheet-drag')
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={['sheet', className].filter(Boolean).join(' ')}
      onCancel={onCancel}
      // A tap on the scrim lands on the dialog itself, not on its content.
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss()
      }}
    >
      <header
        className="sheet-header"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <span className="sheet-handle" aria-hidden="true" />
        <h2 id={titleId} ref={titleRef} tabIndex={-1} className="sheet-title">
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className="sheet-description">
            {description}
          </p>
        )}
      </header>
      <div className="sheet-body">{children}</div>
      {actions && <footer className="sheet-footer">{actions}</footer>}
    </dialog>
  )
}
