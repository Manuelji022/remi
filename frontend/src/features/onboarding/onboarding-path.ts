import { getLocalizedPath } from '#/shared/i18n'

/** Onboarding draws its own top bar and has no footer. */
export function isOnboardingPath(pathname: string) {
  return (
    getLocalizedPath(pathname, 'en').replace(/(?<=.)\/$/, '') === '/onboarding'
  )
}
