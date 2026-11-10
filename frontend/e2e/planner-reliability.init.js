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
  // Built server-function ids for loadWeeklyMenu, listRecipes, generateNextWeeklyMenu,
  // and saveWeeklyMenu. To refresh them, run `pnpm build` from frontend/, then search
  // `.output/server` for `name: "<function>"` and copy the adjacent `id` field. Or
  // open a fresh build, filter the browser Network panel to `/_serverFn/`, and record
  // the URLs for page load (load/list), Confirm schedule and generate, and Save preferences.
  const serverFunctions = {
    load: '/_serverFn/1f656ac1cee7da8b247b8ca1af6ebd86aeee64191d0500aa2b5a6cf8279f3290',
    recipes: '/_serverFn/69ce94eac4cfe29326de41e874fcb343a821cf3efd97d95b2f45c8cd0c3ff17e',
    generation: '/_serverFn/117e1c55a3be8fe0e86b8d2d443a3c3c0315ef546f54bee8f1c4e140c9f56071',
    save: '/_serverFn/911804a5aa8e090e7aa6b7dfaf719d55bbab065a1a4be75ca11057cff880feea',
  }
  const fixture = {
    userId: 'reliability-user',
    failLoad: !scenario || scenario === 'load-error',
    failRecipes: scenario === 'recipes-error',
    failSave: false,
    failGeneration: false,
    generations: 0,
    hold: {
      auth: scenario === 'auth-pending',
      load: scenario === 'load-pending',
      generation: false,
    },
    release: {},
    reads: [],
    writes: [],
    unknown: [],
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
    const kind =
      url.pathname === serverFunctions.generation
        ? 'generation'
        : url.pathname === serverFunctions.save
          ? 'save'
          : url.pathname === serverFunctions.load
            ? 'load'
            : url.pathname === serverFunctions.recipes
              ? 'recipes'
              : null
    if (!kind) {
      fixture.unknown.push({ method: request.method, url: request.url })
      throw new TypeError(`Unknown planner server function: ${request.method} ${request.url}`)
    }
    const generationFailure =
      fixture.failRecipes
        ? 'recipes'
        : fixture.failLoad
          ? 'load'
          : fixture.failGeneration
            ? 'generation'
            : null
    const failed =
      kind === 'generation'
        ? generationFailure
        : kind === 'save'
          ? fixture.failSave
          : kind === 'load'
            ? fixture.failLoad
            : fixture.failRecipes
    const log = { kind, weekStart, payload, userId: fixture.userId }
    if (kind === 'generation') fixture.generations += 1
    else if (kind === 'save') fixture.writes.push(log)
    else fixture.reads.push(log)
    if (kind === 'generation') {
      await pause('generation')
      await pause('load')
    } else {
      await pause(kind)
    }
    fixture.completed.push(log)
    if (failed) throw new TypeError(`Synthetic ${failed} network failure`)

    if (kind === 'recipes') {
      return json({
        result: [
          {
            id: 'saved-lunch',
            name: 'Saved lunch',
            slot: 'lunch',
            ingredients: [
              { id: 'beans', name: 'Beans', quantity: 1, unit: 'can', position: 0 },
            ],
          },
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
    if (kind === 'generation') {
      return json({
        result: {
          ok: true,
          menu: {
            weekStart,
            days: Object.fromEntries(
              days.map((day) => [
                day,
                {
                  context: null,
                  scope: 'both',
                  lunchRecipeId: 'saved-lunch',
                  dinnerRecipeId: 'saved-dinner',
                },
              ]),
            ),
          },
          recipeNames: {
            'saved-lunch': 'Saved lunch',
            'saved-dinner': 'Saved dinner',
          },
          unavailableSlots: [],
        },
      })
    }
    return json({
      result: loadedWeek(
        weekStart,
        payload.includes('office'),
        kind === 'save' || scenario !== 'empty',
      ),
    })
  }
})()
