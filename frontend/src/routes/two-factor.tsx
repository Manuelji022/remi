import { createFileRoute } from '@tanstack/react-router'
import { TwoFactorPage } from '#/features/auth/pages/two-factor'

export const Route = createFileRoute('/two-factor')({
  component: TwoFactorPage,
})
