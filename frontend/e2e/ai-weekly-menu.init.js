// Synthetic browser-only AI Weekly Menu fixture. Never import into the app.
;(() => {
  const nativeFetch = window.fetch.bind(window)
  const NativeDate = window.Date
  const scenario = new URLSearchParams(window.location.search).get('scenario') ?? 'ready'
  let clockOffset = 0

  if (
    scenario === 'stale' ||
    scenario === 'retry-rollover' ||
    scenario === 'preview-rollover' ||
    scenario === 'provider-rollover'
  ) {
    const today = new NativeDate()
    const monday = new NativeDate(today.getFullYear(), today.getMonth(), today.getDate())
    monday.setDate(monday.getDate() + (monday.getDay() === 0 ? -6 : 1 - monday.getDay()))
    const sunday = new NativeDate(monday)
    sunday.setDate(sunday.getDate() + 6)
    const justBeforeRollover = new NativeDate(
      sunday.getFullYear(),
      sunday.getMonth(),
      sunday.getDate(),
      23,
      59,
    )
    clockOffset = justBeforeRollover.getTime() - NativeDate.now()
  }

  class FixtureDate extends NativeDate {
    constructor(...args) {
      if (args.length === 0) super(NativeDate.now() + clockOffset)
      else super(...args)
    }

    static now() {
      return NativeDate.now() + clockOffset
    }
  }
  if (
    scenario === 'stale' ||
    scenario === 'retry-rollover' ||
    scenario === 'preview-rollover' ||
    scenario === 'provider-rollover'
  ) {
    window.Date = FixtureDate
  }

  const days = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ]
  const today = new Date()
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  monday.setDate(monday.getDate() + (monday.getDay() === 0 ? -6 : 1 - monday.getDay()))
  const currentWeekStart = isoDate(monday)
  const targetMonday = new Date(monday)
  targetMonday.setDate(targetMonday.getDate() + 7)
  const targetWeekStart = isoDate(targetMonday)
  const expectedAfterRollover = new Date(targetMonday)
  expectedAfterRollover.setDate(expectedAfterRollover.getDate() + 7)
  const fixture = {
    scenario,
    userId: scenario === 'guest' ? null : 'ai-menu-test-user',
    currentWeekStart,
    targetWeekStart,
    expectedAfterRollover: isoDate(expectedAfterRollover),
    staleSent: false,
    retryRolledOver: false,
    providerStarted: false,
    mockProviderCompleted: false,
    providerRolloverSent: false,
    failGeneration: false,
    generationRejection: /** @type {'in-progress' | 'rate-limited' | null} */ (null),
    failSave: false,
    holdGeneration: false,
    pendingGeneration: false,
    releaseGeneration: null,
    holdTargetLoad: false,
    pendingTargetLoad: false,
    releaseTargetLoad: null,
    holdSave: false,
    pendingSave: false,
    releaseSave: null,
    generationRequests: [],
    saveRequests: [],
    reads: [],
    completed: [],
    advanceClock: (milliseconds) => {
      clockOffset += milliseconds
    },
  }
  window.aiWeeklyMenuFixture = fixture

  function isoDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  function decodeTransport(value) {
    if (!value || typeof value !== 'object') return value
    if (Array.isArray(value)) return value.map(decodeTransport)
    if (typeof value.t === 'number') {
      if (value.t === 1) return value.s
      if (value.t === 2) return null
      if (value.t === 9 && Array.isArray(value.a)) {
        return value.a.map(decodeTransport)
      }
      if (
        value.t === 10 &&
        Array.isArray(value.p?.k) &&
        Array.isArray(value.p?.v) &&
        value.p.k.length === value.p.v.length
      ) {
        return Object.fromEntries(
          value.p.k.map((key, index) => [key, decodeTransport(value.p.v[index])]),
        )
      }
      throw new Error(`Unsupported Seroval transport node: ${value.t}`)
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, decodeTransport(child)]),
    )
  }

  function decodeCandidate(candidate) {
    for (const text of [candidate, safeDecodeURIComponent(candidate)]) {
      try {
        const parsed = JSON.parse(text)
        const node =
          parsed && typeof parsed === 'object' && !Array.isArray(parsed) &&
          parsed.t && typeof parsed.t === 'object'
            ? parsed.t
            : parsed
        return decodeTransport(node)
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('Unsupported Seroval')) {
          throw error
        }
      }
    }
    return undefined
  }

  function safeDecodeURIComponent(value) {
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }

  function decodePayload(raw, url) {
    if (raw) {
      const decoded = decodeCandidate(raw)
      return decoded === undefined ? { raw } : decoded
    }
    const parameters = new URLSearchParams(url.search)
    const candidates = [...parameters.values(), url.search.replace(/^\?/, '')]
    for (const candidate of candidates) {
      const decoded = decodeCandidate(candidate)
      if (decoded !== undefined) return decoded
    }
    return Object.fromEntries(parameters.entries())
  }

  function findValue(value, keys) {
    if (!value || typeof value !== 'object') return undefined
    for (const key of keys) if (key in value) return value[key]
    for (const child of Object.values(value)) {
      const found = findValue(child, keys)
      if (found !== undefined) return found
    }
    return undefined
  }

  function findMenu(value) {
    if (!value || typeof value !== 'object') return undefined
    if ('weekStart' in value && 'days' in value) return value
    for (const child of Object.values(value)) {
      const found = findMenu(child)
      if (found !== undefined) return found
    }
    return undefined
  }

  function json(value) {
    return new Response(JSON.stringify(value), {
      headers: { 'content-type': 'application/json' },
    })
  }

  function weekMenu(weekStart, hasSavedMenu) {
    const targetSaved =
      (weekStart === targetWeekStart && scenario === 'target-saved') ||
      (weekStart === fixture.expectedAfterRollover && scenario === 'retry-rollover')
    const currentSaved = weekStart === currentWeekStart && scenario !== 'empty'
    const daysData = Object.fromEntries(
      days.map((day) => {
        const targetMondayOffice =
          targetSaved && scenario !== 'retry-rollover' && day === 'Monday'
        const targetTuesdayEatOut = targetSaved && day === 'Tuesday'
        const currentMondayOffice = currentSaved && day === 'Monday'
        const office = targetMondayOffice || currentMondayOffice
        const eatOut = targetTuesdayEatOut
        const scope = office ? 'dinner' : eatOut ? 'lunch' : 'both'
        return [
          day,
          {
            context: office ? 'office' : eatOut ? 'eatOut' : null,
            scope,
            lunchRecipeId: null,
            dinnerRecipeId: hasSavedMenu && (office || !eatOut) ? 'saved-dinner' : null,
          },
        ]
      }),
    )
    return {
      menu: { weekStart, days: daysData },
      recipeNames: { 'saved-dinner': `Saved dinner ${weekStart}` },
      hasSavedMenu,
    }
  }

  function scheduleFromPayload(payload) {
    const schedule = findValue(payload, ['schedule', 'targetSchedule'])
    if (
      !schedule ||
      typeof schedule !== 'object' ||
      !days.every((day) => schedule[day] && typeof schedule[day].scope === 'string')
    ) {
      throw new Error('Fixture refused generation: decoded request has no seven-day schedule')
    }
    return schedule
  }

  function generatedMenu(weekStart, schedule) {
    const unavailable = scenario === 'empty-catalog' ? ['lunch', 'dinner'] : []
    const dayContexts = schedule.dayContexts ?? {}
    const planningScopes = schedule.planningScopes ?? {}
    const resultDays = Object.fromEntries(
      days.map((day) => {
        const context = schedule[day]?.context ?? dayContexts[day] ?? null
        const preferredScope = schedule[day]?.scope ?? planningScopes[day] ?? 'both'
        const scope = context === 'office'
          ? 'dinner'
          : context === 'eatOut'
            ? preferredScope === 'both' ? 'dinner' : preferredScope
            : preferredScope
        return [day, {
          context,
          scope,
          lunchRecipeId: scope !== 'dinner' && !unavailable.includes('lunch') ? 'saved-lunch' : null,
          dinnerRecipeId: scope !== 'lunch' && !unavailable.includes('dinner') ? 'saved-dinner' : null,
        }]
      }),
    )
    return {
      menu: { weekStart, days: resultDays },
      recipeNames: {
        'saved-lunch': 'Lemon chickpea pasta',
        'saved-dinner': 'Roasted vegetable bowl',
        'saved-dinner-alternative': 'Mushroom barley bowl',
      },
      unavailableSlots: unavailable,
    }
  }

  async function pauseGeneration() {
    if (!fixture.holdGeneration) return
    fixture.pendingGeneration = true
    await new Promise((resolve) => {
      fixture.releaseGeneration = resolve
    })
    fixture.pendingGeneration = false
    fixture.releaseGeneration = null
  }

  async function pauseTargetLoad() {
    if (!fixture.holdTargetLoad) return
    fixture.pendingTargetLoad = true
    await new Promise((resolve) => {
      fixture.releaseTargetLoad = resolve
    })
    fixture.pendingTargetLoad = false
    fixture.releaseTargetLoad = null
  }

  async function pauseSave() {
    if (!fixture.holdSave) return
    fixture.pendingSave = true
    await new Promise((resolve) => {
      fixture.releaseSave = resolve
    })
    fixture.pendingSave = false
    fixture.releaseSave = null
  }

  window.fetch = async (input, init) => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    if (url.origin !== window.location.origin) return nativeFetch(input, init)

    if (url.pathname === '/api/auth/get-session') {
      if (!fixture.userId) return json(null)
      return json({
        session: {
          id: 'synthetic-session',
          userId: fixture.userId,
          token: 'synthetic-not-a-real-token',
          expiresAt: '2099-01-01T00:00:00.000Z',
        },
        user: {
          id: fixture.userId,
          name: 'AI menu tester',
          email: 'ai-menu@example.invalid',
          emailVerified: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      })
    }
    if (url.pathname === '/api/auth/sign-out') {
      fixture.userId = null
      return json({ success: true })
    }
    if (!url.pathname.startsWith('/_serverFn/')) return nativeFetch(input, init)

    const raw = request.method === 'POST' ? await request.text() : ''
    const payload = decodePayload(raw, url)
    const payloadTargetWeekStart = findValue(payload, ['targetWeekStart'])
    const menuInput = findMenu(payload)
    const payloadWeekStart = findValue(payload, ['weekStart'])
    const requestWeek =
      typeof payloadTargetWeekStart === 'string'
        ? payloadTargetWeekStart
        : menuInput?.weekStart ?? payloadWeekStart
    const isGeneration = typeof payloadTargetWeekStart === 'string'
    const kind = isGeneration
      ? 'generation'
      : request.method === 'POST'
        ? 'save'
        : requestWeek
          ? 'load'
          : 'recipes'
    const log = { kind, payload, weekStart: requestWeek, userId: fixture.userId }
    if (kind === 'generation') {
      log.schedule = scheduleFromPayload(payload)
      log.mockScenario = findValue(payload, ['mockScenario'])
      fixture.generationRequests.push(log)
    }
    else if (kind === 'save') fixture.saveRequests.push(log)
    else fixture.reads.push(log)

    if (kind === 'recipes') {
      const result = scenario === 'empty-catalog'
        ? []
        : [
            {
              id: 'saved-lunch',
              name: 'Lemon chickpea pasta',
              slot: 'lunch',
              ingredients: [
                { id: 'chickpeas', name: 'Chickpeas', quantity: 200, unit: 'g', position: 0 },
              ],
            },
            {
              id: 'saved-lunch-alternative',
              name: 'Crispy lentil salad',
              slot: 'lunch',
              ingredients: [
                { id: 'lentils', name: 'Lentils', quantity: 180, unit: 'g', position: 0 },
              ],
            },
            {
              id: 'saved-dinner',
              name: 'Roasted vegetable bowl',
              slot: 'dinner',
              ingredients: [
                { id: 'carrots', name: 'Carrots', quantity: 3, unit: 'unit', position: 0 },
              ],
            },
            {
              id: 'saved-dinner-alternative',
              name: 'Mushroom barley bowl',
              slot: 'dinner',
              ingredients: [
                { id: 'barley', name: 'Barley', quantity: 200, unit: 'g', position: 0 },
              ],
            },
          ]
      return json({ result })
    }
    if (kind === 'load') {
      if (!requestWeek) throw new Error('Fixture could not identify the Calendar Week')
      if (requestWeek === targetWeekStart) await pauseTargetLoad()
      const hasSavedMenu =
        requestWeek === currentWeekStart && scenario !== 'empty' ||
        requestWeek === targetWeekStart && scenario === 'target-saved' ||
        requestWeek === fixture.expectedAfterRollover && scenario === 'retry-rollover'
      const result = weekMenu(requestWeek, hasSavedMenu)
      fixture.completed.push(log)
      return json({ result })
    }
    if (kind === 'generation') {
      if (scenario === 'provider-rollover' && !fixture.providerRolloverSent) {
        fixture.providerRolloverSent = true
        fixture.providerStarted = true
      }
      await pauseGeneration()
      fixture.completed.push(log)
      if (scenario === 'provider-rollover' && fixture.providerStarted) {
        fixture.mockProviderCompleted = true
        fixture.advanceClock(2 * 60 * 1000)
        return json({
          result: {
            ok: false,
            reason: 'stale-week',
            expectedTargetWeekStart: fixture.expectedAfterRollover,
          },
        })
      }
      if (scenario === 'stale' && !fixture.staleSent) {
        fixture.staleSent = true
        fixture.advanceClock(2 * 60 * 1000)
        return json({
          result: {
            ok: false,
            reason: 'stale-week',
            expectedTargetWeekStart: fixture.expectedAfterRollover,
          },
        })
      }
      if (scenario === 'retry-rollover' && !fixture.retryRolledOver) {
        fixture.retryRolledOver = true
        fixture.advanceClock(2 * 60 * 1000)
      }
      if (fixture.generationRejection) {
        return json({ result: { ok: false, reason: fixture.generationRejection } })
      }
      if (scenario === 'preview-rollover' && new Date().getDay() === 1) {
        return json({ result: { ok: false, reason: 'stale-week', expectedTargetWeekStart: fixture.expectedAfterRollover } })
      }
      if (log.mockScenario === 'error') throw new TypeError('Synthetic URL-selected provider failure')
      if (fixture.failGeneration) throw new TypeError('Synthetic provider transport failure')
      if (!requestWeek || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(requestWeek)) {
        throw new Error('Fixture refused generation: decoded request has no Calendar Week target')
      }
      return json({
        result: {
          ok: true,
          ...generatedMenu(requestWeek, scheduleFromPayload(payload)),
        },
      })
    }

    fixture.completed.push(log)
    await pauseSave()
    if (fixture.failSave) throw new TypeError('Synthetic save failure')
    const menu = findMenu(payload)
    if (
      !menu ||
      typeof menu.weekStart !== 'string' ||
      !menu.days ||
      !days.every((day) => menu.days[day])
    ) {
      throw new Error('Fixture refused save: decoded request has no complete Calendar Week menu')
    }
    return json({
      result: {
        menu,
        recipeNames: {
          'saved-lunch': 'Lemon chickpea pasta',
          'saved-lunch-alternative': 'Crispy lentil salad',
          'saved-dinner': 'Roasted vegetable bowl',
          'saved-dinner-alternative': 'Mushroom barley bowl',
        },
        hasSavedMenu: true,
      },
    })
  }
})()
