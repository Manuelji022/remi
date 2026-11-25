import { useEffect, useLayoutEffect, useRef } from 'react'
import type { SyntheticEvent } from 'react'

/** Shared by Dialog and Sheet: opens the native `<dialog>` as a modal on
 *  mount (focus trap, inert page, Escape), closes it on unmount and gives
 *  focus back to `returnFocusTo`, or else to what had it before. Escape asks
 *  `onDismiss` instead of closing, so the owner decides (it may be busy or
 *  hold unsaved input). */
export function useModalDialog({
  onDismiss,
  dismissDisabled = false,
  returnFocusTo,
}: {
  onDismiss: () => void
  dismissDisabled?: boolean
  returnFocusTo?: HTMLElement | null
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLElement | null>(null)

  // Layout effects run before showModal() moves focus inside. The dialog is
  // already detached when the cleanup runs, so the browser can't restore it.
  useLayoutEffect(() => {
    const active = document.activeElement
    opener.current = active instanceof HTMLElement ? active : null
  }, [])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
      const target = returnFocusTo ?? opener.current
      if (target?.isConnected && !target.matches(':disabled')) target.focus()
    }
  }, [returnFocusTo])

  const onCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault()
    if (!dismissDisabled) onDismiss()
  }

  return { ref, onCancel }
}
