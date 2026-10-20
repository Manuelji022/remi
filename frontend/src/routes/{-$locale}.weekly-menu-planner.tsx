import { createFileRoute } from '@tanstack/react-router'
import { WeeklyMenuPlanner } from '#/features/weekly-menu/pages/WeeklyMenuPlanner'

export const Route = createFileRoute('/{-$locale}/weekly-menu-planner')({
  component: WeeklyMenuPlanner,
})
