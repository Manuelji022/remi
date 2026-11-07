import { useNavigate } from '@tanstack/react-router'
import { authClient } from '#/features/auth/auth-client'
import { getLocalizedPath, useI18n } from '#/shared/i18n'

export function useSignOut() {
  const navigate = useNavigate()
  const { locale } = useI18n()

  return async function signOut() {
    try {
      const result = await authClient.signOut()

      if (result.error) return

      await navigate({ to: getLocalizedPath('/', locale) })
    } catch {
      return
    }
  }
}
