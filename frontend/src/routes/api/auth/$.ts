import { createFileRoute } from '@tanstack/react-router'
import { auth } from '#/features/auth/auth'

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: ({ createHandlers }) => {
      const handler = createHandlers({
        GET: ({ request }) => auth.handler(request),
      }).GET
      return createHandlers({ GET: handler, POST: handler })
    },
  },
})
