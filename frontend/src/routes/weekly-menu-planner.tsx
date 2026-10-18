import { createFileRoute } from '@tanstack/react-router'
import { WeeklyMenuPlanner } from '#/features/weekly-menu/pages/WeeklyMenuPlanner'

export const Route = createFileRoute('/weekly-menu-planner')({
  component: WeeklyMenuPlanner,
})
