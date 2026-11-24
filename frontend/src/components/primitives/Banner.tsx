import { useEffect, useRef } from 'react'
import { Button } from './Button'
import { Icon } from './Icon'
import { TextLink } from './TextLink'
import './Banner.css'
import type { MouseEvent, ReactNode } from 'react'

export interface BannerFieldError {
  /** `id` of the invalid field. The link focuses it. */
  fieldId: string
  /** The field's own message, the same text shown under the box. */
  message: string
}

interface BannerBaseProps {
  /** A sentence, not a label: "Your week didn't save." */
  title?: ReactNode
  /** What happened and what to do. Short, plain, ends with a full stop. */
  children?: ReactNode
  /** One `<TextLink>` (it takes the tone's color). Its tap area stays 44. */
  action?: ReactNode
  /**
   * Set it for a banner that appears after the page loaded (a failed submit,
   * a retry error): `alert` for errors, `status` for the rest. Leave it off for
   * one already there on load, which says nothing.
   */
  announce?: boolean
  /** `page` is the full-bleed band under the header: square, one at a time. */
  placement?: 'inline' | 'page'
  className?: string
}

/** Info and success may be hidden. Warning and error leave with their cause. */
type BannerToneProps =
  | {
      tone: 'info' | 'success'
      dismiss?: { label: string; onDismiss: () => void }
      fieldErrors?: never
    }
  | {
      tone: 'warning'
      dismiss?: never
      fieldErrors?: never
    }
  | {
      tone: 'error'
      dismiss?: never
      /**
       * Error summary, for 3 or more invalid fields after a submit. The list
       * links to each field, the banner takes focus once and is announced.
       * Needs a `title` ("Fix 3 things to continue.").
       */
      fieldErrors?: BannerFieldError[]
    }

export type BannerProps = BannerBaseProps & BannerToneProps

function focusField(event: MouseEvent, fieldId: string) {
  const field = document.getElementById(fieldId)
  if (!field) return
  event.preventDefault()
  field.focus({ preventScroll: true })
  field.scrollIntoView({ block: 'center' })
}

export function Banner({
  tone,
  title,
  children,
  action,
  announce = false,
  placement = 'inline',
  dismiss,
  fieldErrors,
  className,
}: BannerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isSummary = fieldErrors !== undefined && fieldErrors.length > 0

  useEffect(() => {
    if (!isSummary) return
    ref.current?.focus({ preventScroll: true })
    ref.current?.scrollIntoView({ block: 'nearest' })
  }, [isSummary])

  const live = announce || isSummary
  const role = live ? (tone === 'error' ? 'alert' : 'status') : undefined
  const classes = [
    'banner',
    `banner-${tone}`,
    placement === 'page' && 'banner-page',
    dismiss && 'banner-dismissible',
    live && 'banner-live',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={classes}
      ref={ref}
      role={role}
      tabIndex={isSummary ? -1 : undefined}
    >
      <span className="banner-icon">
        <Icon name={tone} />
      </span>
      <div className="banner-body">
        {title && <span className="banner-title">{title}</span>}
        {children && <span className="banner-text">{children}</span>}
        {isSummary && (
          <ul className="banner-errors">
            {fieldErrors.map((error) => (
              <li key={error.fieldId}>
                <TextLink
                  variant="inline"
                  href={`#${error.fieldId}`}
                  onClick={(event) => focusField(event, error.fieldId)}
                >
                  {error.message}
                </TextLink>
              </li>
            ))}
          </ul>
        )}
        {action && <div className="banner-action">{action}</div>}
      </div>
      {dismiss && (
        <Button
          className="banner-dismiss"
          variant="ghost"
          iconOnly
          icon="close"
          aria-label={dismiss.label}
          onClick={dismiss.onDismiss}
        />
      )}
    </div>
  )
}
