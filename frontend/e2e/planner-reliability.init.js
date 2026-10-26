// Browser-only fault fixture. Load with agent-browser --init-script; never import
// this file into the application. All intercepted data is synthetic and local.
;(() => {
  const nativeFetch = window.fetch.bind(window)
  const days = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ]
  const scenario = new URLSearchParams(window.location.search).get('scenario')
  const fixture = {
    userId: 'reliability-user',
    failLoad: !scenario || scenario === 'load-error',
    failRecipes: scenario === 'recipes-error',
    failSave: false,
    hold: {
      auth: scenario === 'auth-pending',
      load: scenario === 'load-pending',
    },
    release: {},
    reads: [],
    writes: [],
    completed: [],
  }
  window.plannerReliability = fixture

  function loadedWeek(weekStart, office = false, saved = true) {
    return {
      menu: {
        weekStart,
        days: Object.fromEntries(
          days.map((day) => [
            day,
            {
              context: day === 'Monday' && office ? 'office' : null,
              scope: day === 'Monday' && office ? 'dinner' : 'both',
              lunchRecipeId: null,
              dinnerRecipeId: day === 'Monday' && saved ? 'saved-dinner' : null,
            },
          ]),
        ),
      },
      recipeNames: { 'saved-dinner': `Saved dinner ${weekStart}` },
      hasSavedMenu: saved,
    }
  }

  async function pause(kind) {
    if (!fixture.hold[kind]) return
    await new Promise((resolve) => {
      fixture.release[kind] = resolve
    })
    delete fixture.release[kind]
  }

  function json(value) {
    return new Response(JSON.stringify(value), {
      headers: { 'content-type': 'application/json' },
    })
  }

  window.fetch = async (input, init) => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    if (url.origin !== window.location.origin) return nativeFetch(input, init)

    if (url.pathname === '/api/auth/get-session') {
      await pause('auth')
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
          name: 'Reliability tester',
          email: 'reliability@example.invalid',
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

    const payload =
      request.method === 'POST'
        ? await request.text()
        : decodeURIComponent(url.search)
    const weekStart = /\d{4}-\d{2}-\d{2}/.exec(payload)?.[0]
    const kind = request.method === 'POST' ? 'save' : weekStart ? 'load' : 'recipes'
    const failed =
      kind === 'save'
        ? fixture.failSave
        : kind === 'load'
          ? fixture.failLoad
          : fixture.failRecipes
    const log = { kind, weekStart, payload, userId: fixture.userId }
    if (kind === 'save') fixture.writes.push(log)
    else fixture.reads.push(log)
    await pause(kind)
    fixture.completed.push(log)
    if (failed) throw new TypeError(`Synthetic ${kind} network failure`)

    if (kind === 'recipes') {
      return json({
        result: [
          {
            id: 'saved-dinner',
            name: 'Saved dinner',
            slot: 'dinner',
            ingredients: [
              { id: 'rice', name: 'Rice', quantity: 100, unit: 'g', position: 0 },
            ],
          },
        ],
      })
    }
    if (!weekStart) throw new Error('Fixture could not identify the Calendar Week')
    return json({
      result: loadedWeek(
        weekStart,
        payload.includes('office'),
        kind === 'save' || scenario !== 'empty',
      ),
    })
  }
})()
