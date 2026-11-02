import { z } from 'zod'
import { DAYS } from '#/features/weekly-menu/constants'
import type { Day } from '#/features/weekly-menu/constants'
import { dayContextSchema, planningScopeSchema } from './types'
import type { Preferences } from './types'
import type { CalendarWeekMenu } from './week'
import {
  applySchedule,
  emptyMenu,
  scheduleFromMenu,
  shiftWeekStart,
} from './week'

const dayScheduleSchema = z.object({
  context: dayContextSchema.nullable(),
  scope: planningScopeSchema,
})

const targetWeekScheduleShape = Object.fromEntries(
  DAYS.map((day) => [day, dayScheduleSchema]),
) as Record<Day, typeof dayScheduleSchema>

export const targetWeekScheduleSchema = z.object(targetWeekScheduleShape)
export type TargetWeekSchedule = z.infer<typeof targetWeekScheduleSchema>

export const calendarTimeZoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .refine((timeZone) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone })
      return true
    } catch {
      return false
    }
  })

export function targetScheduleFromPreferences(
  preferences: Preferences,
): TargetWeekSchedule {
  return Object.fromEntries(
    DAYS.map((day) => [
      day,
      {
        context: preferences.dayContexts[day] ?? null,
        scope: preferences.planningScopes[day] ?? 'both',
      },
    ]),
  ) as TargetWeekSchedule
}

export function preferencesFromTargetSchedule(
  schedule: TargetWeekSchedule,
): Preferences {
  return scheduleFromMenu({ days: schedule })
}

export function getStaleTargetWeekStart(
  targetWeekStart: string,
  timeZone: string,
  now = new Date(),
): string | null {
  const expectedTargetWeekStart = nextCalendarWeekStart(now, timeZone)
  return targetWeekStart === expectedTargetWeekStart
    ? null
    : expectedTargetWeekStart
}

export function nextCalendarWeekStart(
  now = new Date(),
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const day = Number(parts.find((part) => part.type === 'day')?.value)
  if (!year || !month || !day) throw new Error('Invalid calendar timezone')

  const currentDate = new Date(Date.UTC(year, month - 1, day))
  const dayOfWeek = currentDate.getUTCDay()
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  currentDate.setUTCDate(currentDate.getUTCDate() - daysSinceMonday)
  const currentWeekStart = [
    currentDate.getUTCFullYear(),
    String(currentDate.getUTCMonth() + 1).padStart(2, '0'),
    String(currentDate.getUTCDate()).padStart(2, '0'),
  ].join('-')

  return shiftWeekStart(currentWeekStart, 1)
}

export function menuForTargetSchedule(
  weekStart: string,
  schedule: TargetWeekSchedule,
): CalendarWeekMenu {
  const preferences = preferencesFromTargetSchedule(schedule)
  return applySchedule(emptyMenu(weekStart), preferences)
}
