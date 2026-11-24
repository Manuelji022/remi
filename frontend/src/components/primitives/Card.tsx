import './Card.css'
import type { ComponentProps } from 'react'

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
