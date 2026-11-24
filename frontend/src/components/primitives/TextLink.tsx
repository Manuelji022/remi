import { LocalizedLink } from '#/shared/i18n'
import './TextLink.css'
import type { ComponentProps, ReactNode } from 'react'

type TextLinkVariant = 'inline' | 'standalone'

interface TextLinkBaseProps {
  children: ReactNode
  /** `inline` sits in a sentence and is underlined. `standalone` has its own
   *  line and a 44 tall hit area. */
  variant?: TextLinkVariant
  /** Standalone only. Pass an `<Icon />`, e.g. `<Icon name="add" />`. */
  icon?: ReactNode
  iconPosition?: 'start' | 'end'
  disabled?: boolean
  className?: string
}

/** Internal route. Goes through LocalizedLink, so `to` is locale-free. */
type TextLinkRouteProps = TextLinkBaseProps &
  Omit<ComponentProps<typeof LocalizedLink>, keyof TextLinkBaseProps> & {
    to: string
  }

/** Plain anchor, for external URLs. */
type TextLinkAnchorProps = TextLinkBaseProps &
  Omit<ComponentProps<'a'>, keyof TextLinkBaseProps> & {
    href: string
    to?: never
  }

/** Button element, for in-page actions that must read as a link. Prefer a
 *  Button when the action changes data. */
type TextLinkButtonProps = TextLinkBaseProps &
  Omit<ComponentProps<'button'>, keyof TextLinkBaseProps> & {
    href?: never
    to?: never
  }

export type TextLinkProps =
  TextLinkRouteProps | TextLinkAnchorProps | TextLinkButtonProps

export function TextLink(props: TextLinkProps) {
  const {
    children,
    variant = 'standalone',
    icon,
    iconPosition = 'start',
    disabled = false,
    className,
    ...rest
  } = props
  const classes = ['text-link', `text-link-${variant}`, className]
    .filter(Boolean)
    .join(' ')
  const content =
    variant === 'standalone' && icon ? (
      <>
        {iconPosition === 'start' && icon}
        {children}
        {iconPosition === 'end' && icon}
      </>
    ) : (
      children
    )

  if ('to' in rest && rest.to !== undefined) {
    return (
      <LocalizedLink
        {...(rest as ComponentProps<typeof LocalizedLink>)}
        className={classes}
        disabled={disabled}
      >
        {content}
      </LocalizedLink>
    )
  }

  if ('href' in rest && rest.href !== undefined) {
    const { href, ...anchorRest } = rest as TextLinkAnchorProps
    return (
      <a
        {...anchorRest}
        className={classes}
        href={disabled ? undefined : href}
        role={disabled ? 'link' : undefined}
        aria-disabled={disabled || undefined}
        onClick={
          disabled ? (event) => event.preventDefault() : anchorRest.onClick
        }
      >
        {content}
      </a>
    )
  }

  return (
    <button type="button" {...rest} className={classes} disabled={disabled}>
      {content}
    </button>
  )
}
