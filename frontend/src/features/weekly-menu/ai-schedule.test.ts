import { describe, expect, it } from 'vitest'
import { nextCalendarWeekStart } from '#/features/weekly-menu/ai-schedule'

describe('AI target Calendar Week timezone boundaries', () => {
  it('derives a browser-local week from the server instant instead of UTC Monday', () => {
    const instant = new Date('2026-10-05T00:30:00.000Z')

    expect(nextCalendarWeekStart(instant, 'UTC')).toBe('2026-10-12')
    expect(nextCalendarWeekStart(instant, 'America/Los_Angeles')).toBe(
      '2026-10-05',
    )
  })

  it('rolls the target week over at the timezone-local Sunday-to-Monday boundary', () => {
    expect(
      nextCalendarWeekStart(new Date('2026-10-04T23:30:00.000Z'), 'UTC'),
    ).toBe('2026-10-05')
    expect(
      nextCalendarWeekStart(new Date('2026-10-05T00:30:00.000Z'), 'UTC'),
    ).toBe('2026-10-12')
  })

  it('uses civil calendar arithmetic across a daylight-saving transition', () => {
    expect(
      nextCalendarWeekStart(
        new Date('2026-03-08T06:59:00.000Z'),
        'America/New_York',
      ),
    ).toBe('2026-03-09')
    expect(
      nextCalendarWeekStart(
        new Date('2026-03-08T07:01:00.000Z'),
        'America/New_York',
      ),
    ).toBe('2026-03-09')
  })

  it('rejects invalid IANA timezone names', () => {
    expect(() =>
      nextCalendarWeekStart(new Date('2026-10-05T00:30:00.000Z'), 'Not/AZone'),
    ).toThrow()
  })
})
