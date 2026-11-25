import { LocalizedLink } from '#/shared/i18n'
import { Icon } from './Icon'
import type { IconName, IconSize } from './Icon'
import './Button.css'
import type { ComponentProps, MouseEvent, ReactNode } from 'react'

type ButtonVariant =
  | 'brand'
  | 'primary'
  | 'secondary'
  | 'soft'
  | 'danger'
  | 'danger-subtle'
  | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonBaseProps {
  /** Pick it for meaning: `brand` is the one main action per screen. */
  variant?: ButtonVariant
  /** `md` is the default. Every size keeps a 44 tap area. */
  size?: ButtonSize
  /** Full width: sheet and dialog footers on phone. */
  block?: boolean
  /** Swaps the label for three dots, keeps the width, blocks repeat taps. */
  pending?: boolean
  disabled?: boolean
  className?: string
}

interface ButtonLabelProps {
  children: ReactNode
  leadingIcon?: IconName
  trailingIcon?: IconName
  /** Number shown in a pill after the label (Shopping list 12). */
  count?: number
  /** `pop` is the tomato pill: one per screen, for the number that asks. */
  countTone?: 'neutral' | 'pop'
  iconOnly?: false
  icon?: never
}

/** A circle, width = height. It has no visible label, so it needs one. */
interface ButtonIconOnlyProps {
  iconOnly: true
  icon: IconName
  'aria-label': string
  children?: never
  leadingIcon?: never
  trailingIcon?: never
  count?: never
  countTone?: never
}

type ButtonContentProps = ButtonLabelProps | ButtonIconOnlyProps

/** Internal route. Goes through LocalizedLink, so `to` is locale-free. */
type ButtonLinkProps = ButtonBaseProps &
  ButtonContentProps &
  Omit<
    ComponentProps<typeof LocalizedLink>,
    keyof ButtonBaseProps | keyof ButtonContentProps
  > & { to: string }

type ButtonActionProps = ButtonBaseProps &
  ButtonContentProps &
  Omit<
    ComponentProps<'button'>,
    keyof ButtonBaseProps | keyof ButtonContentProps
  > & { to?: never }

export type ButtonProps = ButtonLinkProps | ButtonActionProps

/** Icon size follows the button: 16 / 20 / 20 / 24. Icon-only goes 16 / 20 / 24 / 24. */
const LABEL_ICON_SIZE: Record<ButtonSize, IconSize> = {
  sm: 'sm',
  md: 'md',
  lg: 'md',
  xl: 'lg',
}
const ICON_ONLY_SIZE: Record<ButtonSize, IconSize> = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'lg',
}

export function Button(props: ButtonProps) {
  const {
    variant = 'secondary',
    size = 'md',
    block = false,
    pending = false,
    disabled = false,
    className,
    iconOnly = false,
    icon,
    leadingIcon,
    trailingIcon,
    count,
    countTone = 'neutral',
    children,
    ...rest
  } = props
  const classes = [
    'button',
    `button-${variant}`,
    `button-${size}`,
    iconOnly && 'button-icon-only',
    block && 'button-block',
    !iconOnly && leadingIcon && 'button-leading-icon',
    !iconOnly && trailingIcon && 'button-trailing-icon',
    !iconOnly && count !== undefined && 'button-has-count',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  const iconSize = (iconOnly ? ICON_ONLY_SIZE : LABEL_ICON_SIZE)[size]

  const content = (
    <>
      <span className="button-content">
        {iconOnly && icon && <Icon name={icon} size={iconSize} />}
        {!iconOnly && leadingIcon && (
          <Icon name={leadingIcon} size={iconSize} />
        )}
        {!iconOnly && children}
        {!iconOnly && trailingIcon && (
          <Icon name={trailingIcon} size={iconSize} />
        )}
        {!iconOnly && count !== undefined && (
          <span
            className={
              countTone === 'pop'
                ? 'button-count button-count-pop'
                : 'button-count'
            }
          >
            {count}
          </span>
        )}
      </span>
      {pending && (
        <span aria-hidden="true" className="button-dots">
          <span />
          <span />
          <span />
        </span>
      )}
    </>
  )

  if ('to' in rest && rest.to !== undefined) {
    return (
      <LocalizedLink
        {...(rest as Omit<ComponentProps<typeof LocalizedLink>, 'children'>)}
        aria-busy={pending || undefined}
        className={classes}
        disabled={disabled || pending}
      >
        {content}
      </LocalizedLink>
    )
  }

  const { onClick, ...buttonRest } = rest as ComponentProps<'button'>
  // Pending stays focusable (aria-disabled, not `disabled`) so focus is not
  // lost mid-request; the click is swallowed instead.
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (pending) event.preventDefault()
    else onClick?.(event)
  }

  return (
    <button
      type="button"
      {...buttonRest}
      aria-busy={pending || undefined}
      aria-disabled={pending || undefined}
      className={classes}
      disabled={disabled}
      onClick={handleClick}
    >
      {content}
    </button>
  )
}
