import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '#/features/auth/auth'
import { AUTH_DISABLED } from '#/features/auth/testing'
import { ensureDevUser } from '#/features/auth/dev-user.server'
import {
  loadMenuWeekForUser,
  saveMenuWeekForUser,
} from '#/features/weekly-menu/store'
import { parseCalendarWeek, parseWeekStart } from '#/features/weekly-menu/week'

export const loadWeeklyMenu = createServerFn({ method: 'GET' })
  .validator((value: unknown) => {
    if (!isRecord(value)) throw new Error('Week start must be a Monday')
    return { weekStart: parseWeekStart(value.weekStart) }
  })
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
