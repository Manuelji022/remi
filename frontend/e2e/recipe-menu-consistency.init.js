// Browser-only fixture for recipe/menu consistency. Load with agent-browser
// --init-script; never import this file into the application.
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
  const fixture = {
    userId: 'recipe-consistency-user',
    recipes: [
      {
        id: 'assigned-dinner',
        name: 'Assigned dinner',
        slot: 'dinner',
        ingredients: [
          {
            id: 'rice-ingredient',
            name: 'Rice',
            quantity: 100,
            unit: 'g',
            position: 0,
          },
        ],
      },
    ],
    menus: {},
    requests: [],
    posts: [],
    holds: { create: false },
    release: {},
  }
  window.recipeConsistency = fixture

  function initialMenu(weekStart) {
    return {
      weekStart,
      days: Object.fromEntries(
        days.map((day) => [
          day,
          {
            context: null,
            scope: 'both',
            lunchRecipeId: null,
            dinnerRecipeId: day === 'Monday' ? 'assigned-dinner' : null,
          },
        ]),
      ),
    }
  }

  function decodeTransport(node) {
    if (!node || typeof node !== 'object') return node
    if (node.t === 1) return node.s
    if (node.t === 2) return null
    if (node.t === 9) return node.a.map(decodeTransport)
    if (node.t === 10) {
      return Object.fromEntries(
        node.p.k.map((key, index) => [key, decodeTransport(node.p.v[index])]),
      )
    }
    if (Array.isArray(node)) return node.map(decodeTransport)
    return node
  }

  function findData(value, predicate) {
    if (!value || typeof value !== 'object') return null
    if (!Array.isArray(value) && predicate(value)) return value
    for (const nested of Object.values(value)) {
      const match = findData(nested, predicate)
      if (match) return match
    }
    return null
  }

  function loadedWeek(weekStart) {
    const menu = fixture.menus[weekStart] ?? initialMenu(weekStart)
    fixture.menus[weekStart] = menu
    const ids = new Set(
      days.flatMap((day) => [
        menu.days[day].lunchRecipeId,
        menu.days[day].dinnerRecipeId,
      ]),
    )
    return {
      menu,
      recipeNames: Object.fromEntries(
        fixture.recipes
          .filter((recipe) => ids.has(recipe.id))
          .map((recipe) => [recipe.id, recipe.name]),
      ),
      hasSavedMenu: true,
    }
  }

  async function pause(kind) {
    if (!fixture.holds[kind]) return
    await new Promise((resolve) => {
      fixture.release[kind] = resolve
    })
    delete fixture.release[kind]
  }

  function json(result) {
    return new Response(JSON.stringify({ result }), {
      headers: { 'content-type': 'application/json' },
    })
  }

  window.fetch = async (input, init) => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    if (url.origin !== window.location.origin) return nativeFetch(input, init)

    if (url.pathname === '/api/auth/get-session') {
      return new Response(
        JSON.stringify({
          session: {
            id: 'synthetic-session',
            userId: fixture.userId,
            token: 'synthetic-not-a-real-token',
            expiresAt: '2099-01-01T00:00:00.000Z',
          },
          user: {
            id: fixture.userId,
            name: 'Recipe consistency tester',
            email: 'recipe-consistency@example.invalid',
            emailVerified: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        }),
        { headers: { 'content-type': 'application/json' } },
      )
    }

    if (url.pathname === '/api/auth/sign-out') {
      fixture.userId = null
      return json({ success: true })
    }

    if (!url.pathname.startsWith('/_serverFn/')) return nativeFetch(input, init)

    if (request.method === 'GET') {
      const search = decodeURIComponent(url.search)
      const weekStart = /\d{4}-\d{2}-\d{2}/.exec(search)?.[0]
      const kind = weekStart ? 'menu-read' : 'recipes-read'
      fixture.requests.push({ kind, weekStart })
      return json(
        weekStart ? loadedWeek(weekStart) : fixture.recipes,
      )
    }

    const raw = await request.text()
    let body
    try {
      const transport = JSON.parse(raw)
      body = decodeTransport(transport.t)
    } catch {
      body = raw
    }
    const menuInput = findData(
      body,
      (value) => typeof value.weekStart === 'string' && value.days,
    )
    const recipeInput = findData(
      body,
      (value) =>
        typeof value.name === 'string' &&
        ['lunch', 'dinner'].includes(value.slot) &&
        Array.isArray(value.ingredients),
    )
    const recipeIdInput = findData(
      body,
      (value) => typeof value.id === 'string',
    )

    if (menuInput) {
      fixture.posts.push({ kind: 'menu-save', data: menuInput })
      fixture.menus[menuInput.weekStart] = menuInput
      return json(loadedWeek(menuInput.weekStart))
    }

    if (recipeInput) {
      fixture.posts.push({ kind: 'recipe-create', data: recipeInput })
      await pause('create')
      const recipe = {
        id: `created-recipe-${fixture.recipes.length}`,
        name: recipeInput.name,
        slot: recipeInput.slot,
        ingredients: [],
      }
      fixture.recipes.push(recipe)
      return json(recipe)
    }

    if (recipeIdInput) {
      fixture.posts.push({ kind: 'recipe-delete', data: recipeIdInput })
      fixture.recipes = fixture.recipes.filter(
        (recipe) => recipe.id !== recipeIdInput.id,
      )
      for (const menu of Object.values(fixture.menus)) {
        for (const day of days) {
          const plan = menu.days[day]
          if (plan.lunchRecipeId === recipeIdInput.id) plan.lunchRecipeId = null
          if (plan.dinnerRecipeId === recipeIdInput.id)
            plan.dinnerRecipeId = null
        }
      }
      return json({ id: recipeIdInput.id })
    }

    fixture.requests.push({
      kind: 'unmatched-post',
      url: url.pathname,
      raw,
      decodedBody: body,
    })
    return json({})
  }
})()
