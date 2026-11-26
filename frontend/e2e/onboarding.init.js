// Browser-only fixture for onboarding. Load with agent-browser --init-script;
// never import this file into the application. Synthetic auth and recipes: no
// database, email or real account.
;(() => {
  const nativeFetch = window.fetch.bind(window)
  // Kept per tab, so a reload or a full navigation keeps what was saved.
  const read = (key, fallback) =>
    JSON.parse(window.sessionStorage.getItem(`onboarding:${key}`)) ?? fallback
  const fixture = {
    recipes: read('recipes', []),
    signedOut: read('signedOut', false),
    posts: [],
    set(key, value) {
      fixture[key] = value
      window.sessionStorage.setItem(`onboarding:${key}`, JSON.stringify(value))
    },
  }
  window.onboardingFixture = fixture

  // Server function requests arrive in the serializer's node format.
  function decode(node) {
    if (!node || typeof node !== 'object') return node
    if (node.t === 0 || node.t === 1) return node.s
    if (node.t === 2) return null
    if (node.t === 9) return node.a.map(decode)
    if (node.t === 10 || node.t === 11) {
      return Object.fromEntries(
        node.p.k.map((key, index) => [key, decode(node.p.v[index])]),
      )
    }
    return node
  }

  const json = (body) =>
    new Response(JSON.stringify(body), {
      headers: { 'content-type': 'application/json' },
    })

  const emptyWeek = (weekStart) => ({
    menu: {
      weekStart,
      days: Object.fromEntries(
        'Monday Tuesday Wednesday Thursday Friday Saturday Sunday'
          .split(' ')
          .map((day) => [
            day,
            {
              context: null,
              scope: 'both',
              lunchRecipeId: null,
              dinnerRecipeId: null,
            },
          ]),
      ),
    },
    recipeNames: {},
    hasSavedMenu: false,
  })

  window.fetch = async (input, init) => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    if (url.origin !== window.location.origin) return nativeFetch(input, init)

    if (url.pathname === '/api/auth/get-session') {
      if (fixture.signedOut) return json(null)
      return json({
        session: {
          id: 'synthetic-session',
          userId: 'onboarding-user',
          token: 'synthetic-not-a-real-token',
          expiresAt: '2099-01-01T00:00:00.000Z',
        },
        user: {
          id: 'onboarding-user',
          name: 'Ana García',
          email: 'ana@example.invalid',
          emailVerified: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      })
    }

    if (!url.pathname.startsWith('/_serverFn/')) return nativeFetch(input, init)

    if (request.method === 'GET') {
      const weekStart = /\d{4}-\d{2}-\d{2}/.exec(
        decodeURIComponent(url.search),
      )?.[0]
      return json({
        result: weekStart ? emptyWeek(weekStart) : fixture.recipes,
      })
    }

    const { data } = decode(JSON.parse(await request.text()).t)
    if (data?.name && data.slot) {
      fixture.posts.push(data)
      const id = data.id ?? `recipe-${fixture.recipes.length + 1}`
      const recipe = {
        ...data,
        id,
        ingredients: data.ingredients.map((ingredient, position) => ({
          ...ingredient,
          id: `${id}-${position}`,
          position,
        })),
      }
      fixture.set(
        'recipes',
        data.id
          ? fixture.recipes.map((item) => (item.id === id ? recipe : item))
          : [...fixture.recipes, recipe],
      )
      return json({ result: recipe })
    }
    return json({ result: {} })
  }
})()
