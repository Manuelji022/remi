import { useId } from 'react'
import { useModalDialog } from './useModalDialog'
import './Dialog.css'
import type { CSSProperties, ReactNode } from 'react'

interface DialogShellProps {
  /** Extra content between the header and the actions (a field, for a form). */
  children?: ReactNode
  className?: string
  /** For `--dialog-width` on a wide form; the surface keeps its own look. */
  style?: CSSProperties
  onDismiss: () => void
  dismissDisabled?: boolean
  returnFocusTo?: HTMLElement | null
  /** Drops the Paper surface and scrim so the child draws its own, as the
   *  preferences drawer does. Pass it only for a custom full-screen layer. */
  bare?: boolean
}

/** Paper anatomy: title, optional body, actions. Nothing else. */
interface DialogAnatomyProps {
  /** A question about the outcome ("Plan next week again?"), or the task for a
   *  form. It labels the dialog. */
  title: ReactNode
  /** One or two sentences: what changes, what stays. */
  description?: ReactNode
  /** Buttons, `Cancel` (secondary) first, the verb last. Two at most. Use
   *  `variant="danger"` on the verb only for what can't come back. */
  actions?: ReactNode
  /** `destructive` makes it an `alertdialog`. */
  tone?: 'default' | 'destructive'
  /** Stable base for the title and description ids (`<id>-title`). */
  id?: string
  labelledBy?: never
  describedBy?: never
}

/** Legacy shape: the caller draws its own header and footer. */
interface DialogCustomProps {
  labelledBy: string
  describedBy?: string
  title?: never
  description?: never
  actions?: never
  tone?: never
  id?: never
}

export type DialogProps = DialogShellProps &
  (DialogAnatomyProps | DialogCustomProps)

export function Dialog({
  children,
  className,
  style,
  onDismiss,
  dismissDisabled = false,
  returnFocusTo,
  bare = false,
  title,
  description,
  actions,
  tone = 'default',
  id,
  labelledBy,
  describedBy,
}: DialogProps) {
  const { ref, onCancel } = useModalDialog({
    onDismiss,
    dismissDisabled,
    returnFocusTo,
  })
  const generatedId = useId()
  const baseId = id ?? generatedId
  const hasAnatomy = title !== undefined
  const titleId = hasAnatomy ? `${baseId}-title` : labelledBy
  const descriptionId = hasAnatomy
    ? description
      ? `${baseId}-description`
      : undefined
    : describedBy

  const classes = [!bare && 'dialog', hasAnatomy && 'dialog-stack', className]
    .filter(Boolean)
    .join(' ')

  return (
    <dialog
      ref={ref}
      role={tone === 'destructive' ? 'alertdialog' : undefined}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={classes || undefined}
      style={style}
      onCancel={onCancel}
    >
      {hasAnatomy && (
        <header className="dialog-header">
          <h2 id={titleId} className="dialog-title">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="dialog-description">
              {description}
            </p>
          )}
        </header>
      )}
      {children}
      {actions && <footer className="dialog-footer">{actions}</footer>}
    </dialog>
  )
}
