import { parseWeekStart } from '#/features/weekly-menu/week'

// By weekday, so a note keeps its colour as the week moves on.
const NOTE_TONES = ['butter', 'lilac', 'mint'] as const

export function noteTone(dayIndex: number) {
  return NOTE_TONES[dayIndex % NOTE_TONES.length]
}

/** What a day note is headed with: "Mon" and 23. */
export function dayHeading(
  weekStart: string,
  dayIndex: number,
  locale: string,
) {
  const [year, month, day] = parseWeekStart(weekStart).split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + dayIndex))
  const shortName = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(date)

  return { shortName, dateNumber: date.getUTCDate() }
}
