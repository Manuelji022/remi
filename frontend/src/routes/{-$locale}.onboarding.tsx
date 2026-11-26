import { createFileRoute } from '@tanstack/react-router'
import { OnboardingPage } from '#/features/onboarding/pages/OnboardingPage'

export const Route = createFileRoute('/{-$locale}/onboarding')({
  component: OnboardingPage,
})
