import { createFileRoute } from '@tanstack/react-router'
import { WeeklyMenuPlanner } from './weekly-menu-planner'

export const Route = createFileRoute('/es/weekly-menu-planner')({
  component: WeeklyMenuPlanner,
})

