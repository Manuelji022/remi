import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

interface DialogProps {
  children: ReactNode
  labelledBy: string
  describedBy?: string
  className?: string
  onDismiss: () => void
  dismissDisabled?: boolean
  returnFocusTo?: HTMLElement | null
}

export function Dialog({
  children,
  labelledBy,
  describedBy,
  className,
  onDismiss,
  dismissDisabled = false,
  returnFocusTo,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
      if (returnFocusTo?.isConnected && !returnFocusTo.matches(':disabled')) {
        returnFocusTo.focus()
      }
    }
  }, [returnFocusTo])

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className={className}
      onCancel={(event) => {
        event.preventDefault()
        if (!dismissDisabled) onDismiss()
      }}
    >
      {children}
    </dialog>
  )
}
