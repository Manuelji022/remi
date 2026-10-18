import { createFileRoute } from '@tanstack/react-router'
import { ForgotPasswordPage } from '#/features/auth/pages/forgot-password'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})
