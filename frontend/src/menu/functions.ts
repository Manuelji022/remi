import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '#/lib/auth'
import { loadMenuWeekForUser, saveMenuWeekForUser } from '#/menu/store'
import { parseCalendarWeek, parseWeekStart } from '#/menu/week'

export const loadWeeklyMenu = createServerFn({ method: 'GET' })
  .inputValidator((value: unknown) => {
    if (!isRecord(value)) throw new Error('Week start must be a Monday')
    return { weekStart: parseWeekStart(value.weekStart) }
  })
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    return loadMenuWeekForUser(userId, data.weekStart)
  })

export const saveWeeklyMenu = createServerFn({ method: 'POST' })
  .inputValidator(parseCalendarWeek)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    return saveMenuWeekForUser(userId, data)
  })

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({
    headers: getRequest().headers,
  })
  if (!session?.user.id) throw new Error('Unauthorized')
  return session.user.id
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
