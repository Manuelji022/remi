import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { OnboardingPage } from '#/features/onboarding/pages/OnboardingPage'

const searchSchema = z.object({
  step: z.enum(['recipes', 'done']).optional().catch(undefined),
})

export const Route = createFileRoute('/{-$locale}/onboarding')({
  validateSearch: searchSchema,
  component: OnboardingRoute,
})

function OnboardingRoute() {
  const { step } = Route.useSearch()
  return <OnboardingPage step={step ?? 'welcome'} />
}
