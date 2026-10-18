import { createFileRoute } from '@tanstack/react-router'
import { ResetPasswordPage } from '#/features/auth/pages/reset-password'

export const Route = createFileRoute('/es/reset-password')({
  component: ResetPasswordPage,
})
