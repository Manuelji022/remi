import { Link } from '@tanstack/react-router'
import type {
  LinkComponentProps,
  RegisteredRouter,
} from '@tanstack/react-router'
import { useI18n } from './I18nProvider'
import { getLocalizedPath } from './locale'

type LocalizedLinkProps = Omit<
  LinkComponentProps<'a', RegisteredRouter, string, string>,
  'to'
> & {
  to: string
  nav?: boolean
}

export function LocalizedLink({
  activeProps,
  nav,
  to,
  ...props
}: LocalizedLinkProps) {
  const { locale } = useI18n()

  return (
    <Link
      {...props}
      activeProps={nav ? { 'aria-current': 'page' } : activeProps}
      to={getLocalizedPath(to, locale)}
    />
  )
}
