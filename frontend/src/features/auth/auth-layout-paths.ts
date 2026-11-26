import { getLocalizedPath } from '#/shared/i18n'

/** Routes drawn with `AuthLayout`: it has its own header, and the footer is compact. */
const AUTH_LAYOUT_PATHS = new Set(['/login'])

export function hasAuthLayout(pathname: string) {
  return AUTH_LAYOUT_PATHS.has(
    getLocalizedPath(pathname, 'en').replace(/(?<=.)\/$/, ''),
  )
}
