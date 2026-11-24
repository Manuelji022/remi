import { Icon } from './Icon'
import { TextLink } from './TextLink'
import './PageHeader.css'
import type { ReactNode } from 'react'

interface PageHeaderBaseProps {
  /** The page's only `<h1>`. Matches the nav label or the item's name. Wraps
   *  to two lines, never truncates. */
  title: ReactNode
  /** One line under the title. */
  description?: ReactNode
  /** Two buttons at most on desktop, main action last. On phone pass one icon
   *  button: the rest go to More, and the main action to the floating pill. */
  actions?: ReactNode
  className?: string
}

/** A section: "Settings" above the title. */
interface PageHeaderSectionProps extends PageHeaderBaseProps {
  eyebrow?: ReactNode
  back?: never
}

/** A child: a link to the parent page, not to browser history. */
interface PageHeaderChildProps extends PageHeaderBaseProps {
  back: { to: string; label: ReactNode }
  eyebrow?: never
}

/** A page is either a section (eyebrow) or a child (back link), never both. */
export type PageHeaderProps = PageHeaderSectionProps | PageHeaderChildProps

/** Not sticky: it scrolls away with the page. The top gap under the site
 *  Header belongs to the page container, this owns the gap to the content. */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  back,
  className,
}: PageHeaderProps) {
  const classes = [
    'page-header',
    actions && 'page-header-has-actions',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <header className={classes}>
      {back ? (
        <TextLink
          className="page-header-lead page-header-back"
          icon={<Icon name="back" />}
          to={back.to}
        >
          {back.label}
        </TextLink>
      ) : (
        eyebrow && (
          <p className="page-header-lead page-header-eyebrow">{eyebrow}</p>
        )
      )}
      <h1 className="page-header-title">{title}</h1>
      {description && <p className="page-header-description">{description}</p>}
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  )
}
