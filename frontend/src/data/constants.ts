export const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

export type Day = (typeof DAYS)[number]

const WEEKEND_DAYS: readonly Day[] = ['Saturday', 'Sunday']

export function isWeekend(day: Day): boolean {
  return WEEKEND_DAYS.includes(day)
}

export function getWeekNumber(date: Date = new Date()): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  )
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((+d - +yearStart) / 86400000 + 1) / 7)
}

export function getWeekDateRange(date: Date = new Date()): {
  start: string
  end: string
} {
  const curr = new Date(date)
  const day = curr.getDay()
  const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(curr.setDate(diffToMonday))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  return { start: fmt(monday), end: fmt(sunday) }
}
