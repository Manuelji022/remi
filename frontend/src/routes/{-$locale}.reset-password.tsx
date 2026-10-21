import { createFileRoute } from '@tanstack/react-router'
import { ResetPasswordPage } from '#/features/auth/pages/reset-password'

export const Route = createFileRoute('/{-$locale}/reset-password')({
  component: ResetPasswordPage,
})
