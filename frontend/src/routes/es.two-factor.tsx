import { createFileRoute } from '@tanstack/react-router'
import { TwoFactorPage } from '#/features/auth/pages/two-factor'

export const Route = createFileRoute('/es/two-factor')({
  component: TwoFactorPage,
})
