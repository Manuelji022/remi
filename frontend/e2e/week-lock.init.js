// Synthetic week-lock browser fixture. Never imported into the app.
;(() => {
  const nativeFetch = window.fetch.bind(window)
  const NativeDate = window.Date
  const scenario = new URLSearchParams(location.search).get('scenario') ?? 'ready'
  const epoch = scenario === 'rollover' ? new NativeDate(2026, 10, 8, 23, 59).getTime()
    : scenario === 'dst' ? new NativeDate(2026, 2, 29, 12).getTime()
    : new NativeDate(2026, 10, 4, 12).getTime()
  let clockOffset = epoch - NativeDate.now()
  window.Date = class extends NativeDate {
    constructor(...args) { if (args.length) super(...args); else super(NativeDate.now() + clockOffset) }
    static now() { return NativeDate.now() + clockOffset }
  }
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const monday = new Date()
  monday.setDate(monday.getDate() + (monday.getDay() === 0 ? -6 : 1 - monday.getDay()))
  const iso = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
  const currentWeekStart = iso(monday)
  monday.setDate(monday.getDate()+7)
  const targetWeekStart = iso(monday)
  const fixture = window.weekLockFixture = {
    userId: scenario === 'guest' ? null : 'week-lock-test-user',
    currentWeekStart, targetWeekStart, saveRequests: [], generationRequests: [],
    advanceClock(ms) { clockOffset += ms },
  }
  const recipes = ['lunch','dinner'].map(slot => ({
    id: `saved-${slot}`, name: `Saved ${slot}`, slot,
    ingredients: [{ id: `ingredient-${slot}`, name: 'Carrot', quantity: 1, unit: 'unit', position: 0 }],
  }))
  const recipeNames = Object.fromEntries(recipes.map(recipe => [recipe.id, recipe.name]))
  function menu(weekStart, schedule) {
    return { weekStart, days: Object.fromEntries(days.map(day => {
      const plan = schedule?.[day] ?? { context: null, scope: 'both' }
      return [day, { ...plan, lunchRecipeId: plan.scope === 'dinner' ? null : 'saved-lunch', dinnerRecipeId: plan.scope === 'lunch' ? null : 'saved-dinner' }]
    })) }
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


  window.fetch = async (input, init) => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    if (url.origin !== location.origin) return nativeFetch(input, init)
    if (url.pathname === '/api/auth/get-session') return json(fixture.userId ? {
      session: { id: 'synthetic-session', userId: fixture.userId, token: 'synthetic-token', expiresAt: '2099-01-01T00:00:00Z' },
      user: { id: fixture.userId, name: 'Week lock tester', email: 'week-lock@example.invalid', emailVerified: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    } : null)
    if (!url.pathname.startsWith('/_serverFn/')) return nativeFetch(input, init)
    const payload = decodePayload(request.method === 'POST' ? await request.text() : '', url)
    const target = findValue(payload, ['targetWeekStart'])
    const weekStart = findValue(payload, ['weekStart'])
    if (target) {
      fixture.generationRequests.push(payload)
      if (fixture.holdGeneration) await new Promise(resolve => { fixture.releaseGeneration = resolve })
      const schedule = findValue(payload, ['schedule'])
      return json({ result: { ok: true, menu: menu(target, schedule), recipeNames, unavailableSlots: [] } })
    }
    if (request.method === 'POST') {
      const saved = findMenu(payload)
      fixture.saveRequests.push(payload)
      if (!saved) throw new Error('Week-lock fixture expected a menu save')
      return json({ result: { menu: saved, recipeNames, hasSavedMenu: true } })
    }
    if (weekStart) return json({ result: { menu: menu(weekStart), recipeNames, hasSavedMenu: scenario !== 'empty' } })
    return json({ result: recipes })
  }
})()
