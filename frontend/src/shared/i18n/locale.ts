import { localeSchema } from './messages'
import type { Locale } from './messages'

export function isLocale(value: string): value is Locale {
  return localeSchema.safeParse(value).success
}

export function getLocaleFromPathname(pathname: string): Locale {
  const pathLocale = pathname.split('/')[1]
  return pathLocale && isLocale(pathLocale) ? pathLocale : 'en'
}

export function getLocalizedPath(pathname: string, targetLocale: Locale) {
  const unlocalizedPath = pathname.replace(/^\/(?:en|es)(?=\/|$)/, '') || '/'

  if (targetLocale === 'es') {
    return unlocalizedPath === '/' ? '/es' : `/es${unlocalizedPath}`
  }

  return unlocalizedPath
}
