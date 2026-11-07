import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { authMiddleware } from '#/features/auth/middleware'
import {
  generateNextWeeklyMenuForUser,
  generateNextWeeklyMenuInputSchema,
} from '#/features/weekly-menu/generate-next-menu'
import {
  loadMenuWeekForUser,
  saveMenuWeekForUser,
} from '#/features/weekly-menu/store'
import { parseCalendarWeek, weekStartSchema } from '#/features/weekly-menu/week'

export const loadWeeklyMenu = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(z.object({ weekStart: weekStartSchema }))
  .handler(async ({ data, context }) => {
    return loadMenuWeekForUser(context.userId, data.weekStart)
  })

export const saveWeeklyMenu = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(parseCalendarWeek)
  .handler(async ({ data, context }) => {
    return saveMenuWeekForUser(context.userId, data)
  })

export const generateNextWeeklyMenu = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(generateNextWeeklyMenuInputSchema)
  .handler(({ data, context }) =>
    generateNextWeeklyMenuForUser(context.userId, data),
  )
