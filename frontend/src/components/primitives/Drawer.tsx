import { useEffect, useId, useRef, useSyncExternalStore } from 'react'
import { useI18n } from '#/shared/i18n'
import { Button } from './Button'
import { Sheet } from './Sheet'
import { useModalDialog } from './useModalDialog'
import './Drawer.css'
import type { SheetProps } from './Sheet'

export interface DrawerProps extends SheetProps {
  /** Accessible name of the close button ("Close shopping list"). Defaults to
   *  the generic "Close". */
  closeLabel?: string
}

/** Paper: the drawer starts at lg 1024. Below it the same task is a Sheet. */
const DRAWER_QUERY = '(min-width: 64rem)'

function subscribe(onChange: () => void) {
  const query = window.matchMedia(DRAWER_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function useIsDrawerWidth() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DRAWER_QUERY).matches,
    () => false,
  )
}

/** One task, two edges: a 480 drawer from the end edge from lg up, a bottom
 *  `Sheet` below it. Same props as `Sheet`, so the owner never branches on
 *  the screen. Crossing lg while open remounts the surface: what the owner
 *  holds (inputs, ticks) stays, scroll position and focus start over. */
export function Drawer(props: DrawerProps) {
  const { closeLabel, ...sheetProps } = props
  return useIsDrawerWidth() ? (
    <DrawerSurface {...sheetProps} closeLabel={closeLabel} />
  ) : (
    <Sheet {...sheetProps} />
  )
}

function DrawerSurface({
  title,
  description,
  children,
  actions,
  onDismiss,
  dismissDisabled = false,
  returnFocusTo,
  id,
  className,
  closeLabel,
}: DrawerProps) {
  const { t } = useI18n()
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

  // Opens on the title, so the content is read from the top; the close button
  // is the next Tab stop.
  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  function dismiss() {
    if (!dismissDisabled) onDismiss()
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={['drawer', className].filter(Boolean).join(' ')}
      onCancel={onCancel}
      // A click on the scrim lands on the dialog itself, not on its content.
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss()
      }}
    >
      <header className="drawer-header">
        <div className="drawer-heading">
          <h2
            id={titleId}
            ref={titleRef}
            tabIndex={-1}
            className="drawer-title"
          >
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="drawer-description">
              {description}
            </p>
          )}
        </div>
        <Button
          className="drawer-close"
          variant="ghost"
          iconOnly
          icon="close"
          aria-label={closeLabel ?? t('common.close')}
          disabled={dismissDisabled}
          onClick={dismiss}
        />
      </header>
      <div className="drawer-body">{children}</div>
      {actions && <footer className="drawer-footer">{actions}</footer>}
    </dialog>
  )
}
