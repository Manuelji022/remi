import { getRequest } from '@tanstack/react-start/server'
import { auth } from '#/features/auth/auth'

/**
 * Server-side helper to require a user ID from the current session.
 * Used in server functions to ensure the user is authenticated and 2FA is verified.
 *
 * @throws {Error} If user is not authenticated or 2FA is not verified
 * @returns The user ID
 */
export async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({
    headers: getRequest().headers,
  })

  if (!session?.user.id) {
    throw new Error('Unauthorized')
  }

  // Verify 2FA is enabled on the server side
  if (!session.user.twoFactorEnabled) {
    throw new Error('Two-factor authentication required')
  }

  return session.user.id
}
