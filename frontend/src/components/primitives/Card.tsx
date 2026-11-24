import { Icon } from './Icon'
import { LocalizedLink } from '#/shared/i18n'
import './Card.css'
import type { ComponentProps, ReactNode } from 'react'

type CardVariant = 'default' | 'compact' | 'current'

function cardClass(variant: CardVariant, ...rest: Array<string | undefined>) {
  return ['card', variant !== 'default' && `card-${variant}`, ...rest]
    .filter(Boolean)
    .join(' ')
}

interface CardProps extends ComponentProps<'div'> {
  /** `default` pads 20. `compact` pads 16 for dense lists. `current` is the
   *  one "now" card on a screen: a 2px ring instead of the hairline. */
  variant?: CardVariant
  /** Pick the landmark that fits, e.g. `article` for a recipe. */
  as?: 'div' | 'section' | 'article' | 'aside'
}

/** Static surface. It can hold its own buttons, but never another card: group
 *  inside with fills on `--radius-inner`. */
export function Card({
  as: Tag = 'div',
  variant = 'default',
  className,
  ...rest
}: CardProps) {
  return <Tag {...rest} className={cardClass(variant, className)} />
}

interface CardLinkBaseProps {
  /** Title and meta. The title is the link's accessible name. */
  children: ReactNode
  variant?: CardVariant
  className?: string
}

type CardLinkRouteProps = CardLinkBaseProps &
  Omit<ComponentProps<typeof LocalizedLink>, keyof CardLinkBaseProps> & {
    to: string
  }

type CardLinkAnchorProps = CardLinkBaseProps &
  Omit<ComponentProps<'a'>, keyof CardLinkBaseProps> & {
    href: string
    to?: never
  }

export type CardLinkProps = CardLinkRouteProps | CardLinkAnchorProps

/** Interactive card: the whole card is one link, with a chevron and nothing
 *  else clickable inside. Pads 16 unless told otherwise. */
export function CardLink(props: CardLinkProps) {
  const { children, variant = 'compact', className, ...rest } = props
  const classes = cardClass(variant, 'card-link', className)
  const content = (
    <>
      <span>{children}</span>
      <Icon className="card-link-chevron" name="next" />
    </>
  )

  if ('to' in rest && rest.to !== undefined) {
    return (
      <LocalizedLink
        {...(rest as ComponentProps<typeof LocalizedLink>)}
        className={classes}
      >
        {content}
      </LocalizedLink>
    )
  }

  return (
    <a {...rest} className={classes}>
      {content}
    </a>
  )
}
