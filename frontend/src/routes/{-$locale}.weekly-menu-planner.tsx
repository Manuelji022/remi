import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { WeeklyMenuPlanner } from '#/features/weekly-menu/pages/WeeklyMenuPlanner'

// Loose, so the other params the planner reads (`mock`) stay in the address.
const searchSchema = z.looseObject({
  generate: z.literal('first').optional().catch(undefined),
})

export const Route = createFileRoute('/{-$locale}/weekly-menu-planner')({
  validateSearch: searchSchema,
  component: WeeklyMenuPlanner,
})
