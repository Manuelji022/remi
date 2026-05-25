import { createFileRoute } from '@tanstack/react-router'
import { TwoFactorPage } from './two-factor'

export const Route = createFileRoute('/es/two-factor')({
  component: TwoFactorPage,
})
