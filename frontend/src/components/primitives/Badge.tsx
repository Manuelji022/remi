import './Badge.css'
import type { ComponentProps, ReactNode } from 'react'

type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'error'

/** A count is a pill, 20 tall. One digit is a circle, 99+ is the cap. */
interface BadgeCountProps extends ComponentProps<'span'> {
  count: number
  /** Neutral by default. Brand only when the number asks for a look, one per
   *  screen at most. Never an error colour: a count is not an error. */
  tone?: 'neutral' | 'brand'
  children?: never
  dot?: never
  shape?: never
}

/** A status or category label, 24 tall: one or two words, sentence case. */
interface BadgeStatusProps extends ComponentProps<'span'> {
  children: ReactNode
  /** Status pairs only. The word must make sense in grayscale. */
  tone?: BadgeTone
  /** Optional 6px dot that echoes the word. */
  dot?: boolean
  /** `pill` is for state. `square` is a tag for categories, never for state. */
  shape?: 'pill' | 'square'
  count?: never
}

export type BadgeProps = BadgeCountProps | BadgeStatusProps

const MAX_COUNT = 99

/** Not a control: no hover, focus or tap target. When the parent's accessible
 *  name already says the count, pass `aria-hidden` to the badge. */
export function Badge(props: BadgeProps) {
  if (props.count !== undefined) {
    const { count, tone = 'neutral', className, ...rest } = props
    // At 0 the badge goes away; never show "0".
    if (count <= 0) return null
    const classes = ['badge', 'badge-count', `badge-${tone}`, className]
      .filter(Boolean)
      .join(' ')
    return (
      <span {...rest} className={classes}>
        {count > MAX_COUNT ? `${MAX_COUNT}+` : count}
      </span>
    )
  }

  const {
    children,
    tone = 'neutral',
    dot = false,
    shape = 'pill',
    className,
    ...rest
  } = props
  const classes = [
    'badge',
    'badge-label',
    `badge-${tone}`,
    `badge-${shape}`,
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <span {...rest} className={classes}>
      {dot && <span aria-hidden="true" className="badge-dot" />}
      {children}
    </span>
  )
}
