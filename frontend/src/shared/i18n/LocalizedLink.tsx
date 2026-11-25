import { Link } from '@tanstack/react-router'
import type {
  LinkComponentProps,
  RegisteredRouter,
} from '@tanstack/react-router'
import { useI18n } from './I18nProvider'
import { getLocalizedPath } from './locale'
import type { Locale } from './messages'

type LocalizedLinkProps = Omit<
  LinkComponentProps<'a', RegisteredRouter, string, string>,
  'to'
> & {
  to: string
  nav?: boolean
  /** Link to this locale's version of `to`. Defaults to the current one. */
  locale?: Locale
}

export function LocalizedLink({
  activeProps,
  locale: targetLocale,
  nav,
  to,
  ...props
}: LocalizedLinkProps) {
  const { locale: currentLocale } = useI18n()

  return (
    <Link
      {...props}
      activeProps={nav ? { 'aria-current': 'page' } : activeProps}
      to={getLocalizedPath(to, targetLocale ?? currentLocale)}
    />
  )
}
