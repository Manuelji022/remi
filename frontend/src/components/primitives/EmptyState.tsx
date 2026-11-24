import { Icon } from './Icon'
import type { IconName } from './Icon'
import './EmptyState.css'
import type { ComponentProps, ReactNode } from 'react'

type EmptyStateVariant = 'page' | 'card' | 'compact'

export interface EmptyStateProps extends Omit<
  ComponentProps<'div'>,
  'title' | 'children'
> {
  /** `page`: the whole screen has nothing to show. `card`: one region of a
   *  page is empty. `compact`: a list inside a sheet or form is empty. */
  variant?: EmptyStateVariant
  /** What the title is in the document: the page's heading level on a page. */
  headingLevel?: 1 | 2 | 3
  /** Short and warm, ends with a full stop. */
  title: ReactNode
  /** The picture. Paper has an illustration slot that is not drawn yet, so
   *  this is an icon at the xl size (48) until the art ships. */
  icon?: IconName
  /** One sentence, or a few `<p>`s: what will be here, or why it is empty. */
  children?: ReactNode
  /** One `Button` (or `TextLink` in `compact`). Never a second one. */
  action?: ReactNode
}

export function EmptyState({
  variant = 'card',
  headingLevel = 2,
  title,
  icon,
  children,
  action,
  className,
  ...rest
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const
  const classes = ['empty-state', `empty-state-${variant}`, className]
    .filter(Boolean)
    .join(' ')

  const text = (
    <>
      <Heading className="empty-state-title">{title}</Heading>
      {children && <div className="empty-state-body">{children}</div>}
    </>
  )

  return (
    <div {...rest} className={classes}>
      {icon && (
        <div className="empty-state-art">
          <Icon name={icon} size="xl" />
        </div>
      )}
      {variant === 'compact' ? (
        <div className="empty-state-text">{text}</div>
      ) : (
        text
      )}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  )
}
