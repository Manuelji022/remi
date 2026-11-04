import { Dialog } from './Dialog'

interface ConfirmDialogProps {
  id: string
  isOpen: boolean
  title: string
  body: string
  cancelLabel: string
  confirmLabel: string
  confirmDisabled?: boolean
  returnFocusTo?: React.RefObject<HTMLElement> | HTMLElement | null
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({
  id,
  isOpen,
  title,
  body,
  cancelLabel,
  confirmLabel,
  confirmDisabled = false,
  returnFocusTo,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const getFocusElement = (): HTMLElement | null => {
    if (!returnFocusTo) return null
    if ('current' in returnFocusTo) {
      return returnFocusTo.current
    }
    return returnFocusTo
  }

  return (
    <Dialog
      labelledBy={`${id}-title`}
      describedBy={`${id}-description`}
      returnFocusTo={getFocusElement()}
      onDismiss={onCancel}
    >
      <h2 id={`${id}-title`}>{title}</h2>
      <p id={`${id}-description`}>{body}</p>
      <div className="planner-ai-dialog-footer">
        <button
          className="panel-secondary-btn"
          type="button"
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
        <button
          className="panel-primary-btn"
          type="button"
          onClick={onConfirm}
          disabled={confirmDisabled}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  )
}
