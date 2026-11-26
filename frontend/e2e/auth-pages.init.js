// Synthetic auth browser fixture. Never imported into the app.
;(() => {
  const nativeFetch = window.fetch.bind(window)
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  const fixture = (window.authFixture = { code: '482913', requests: [] })

  window.fetch = async (input, init) => {
    const request = new Request(input, init)
    const { pathname } = new URL(request.url)
    if (!pathname.startsWith('/api/auth/')) return nativeFetch(input, init)
    const path = pathname.slice('/api/auth/'.length)
    if (path === 'get-session') return json(null)
    const body = JSON.parse((await request.text()) || '{}')
    fixture.requests.push({ path, body })
    if (path === 'sign-in/email') {
      return body.password === 'wrong-password'
        ? json({ code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' }, 401)
        : json({ twoFactorRedirect: true })
    }
    if (path === 'two-factor/verify-otp' && body.code !== fixture.code) {
      return json({ code: 'INVALID_CODE', message: 'Invalid code' }, 401)
    }
    return json({ status: true })
  }
})()
