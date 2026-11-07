import { createMiddleware } from '@tanstack/react-start'
import { getRequest, setResponseStatus } from '@tanstack/react-start/server'
import { auth } from '#/features/auth/auth'

export const authMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const session = await auth.api.getSession({
      headers: getRequest().headers,
    })

    if (!session?.user.id) {
      setResponseStatus(401)
      throw new Error('Unauthorized')
    }

    return next({ context: { userId: session.user.id } })
  },
)
