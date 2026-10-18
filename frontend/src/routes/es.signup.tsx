import { createFileRoute } from '@tanstack/react-router'
import { SignupPage } from '#/features/auth/pages/signup'

export const Route = createFileRoute('/es/signup')({ component: SignupPage })
