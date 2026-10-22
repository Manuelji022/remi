import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '#/features/auth/auth'
import { AUTH_DISABLED } from '#/features/auth/testing'
import { ensureDevUser } from '#/features/auth/dev-user.server'
import {
  loadMenuWeekForUser,
  saveMenuWeekForUser,
} from '#/features/weekly-menu/store'
import { parseCalendarWeek, weekStartSchema } from '#/features/weekly-menu/week'

export const loadWeeklyMenu = createServerFn({ method: 'GET' })
  .validator(z.object({ weekStart: weekStartSchema }))
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    return loadMenuWeekForUser(userId, data.weekStart)
  })

export const saveWeeklyMenu = createServerFn({ method: 'POST' })
  .validator(parseCalendarWeek)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    return saveMenuWeekForUser(userId, data)
  })

async function requireUserId(): Promise<string> {
  if (AUTH_DISABLED) return ensureDevUser()

  const session = await auth.api.getSession({
    headers: getRequest().headers,
  })
  if (!session?.user.id) throw new Error('Unauthorized')
  return session.user.id
}
