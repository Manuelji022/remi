import { createFileRoute } from '@tanstack/react-router'
import { ForgotPasswordPage } from './forgot-password'

export const Route = createFileRoute('/es/forgot-password')({
  component: ForgotPasswordPage,
})
