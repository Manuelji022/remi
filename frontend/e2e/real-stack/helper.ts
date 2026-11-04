import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import postgres from 'postgres'

const url = process.env.DATABASE_URL!
assert(['localhost', '127.0.0.1'].includes(new URL(url).hostname))
assert.equal(new URL(url).pathname, '/remi_real_stack')
assert.equal(process.env.NODE_ENV, 'development')
assert.equal(process.env.AI_WEEKLY_MENU_MOCK, 'true')
assert.equal(process.env.AI_GATEWAY_API_KEY, undefined)
const sql = postgres(url, { max: 1 })
const [, , mode, cookiePath, artifact] = process.argv
const userId = 'real-stack-user'
try {
  if (mode === 'seed') {
    const { auth } = await import('#/features/auth/auth')
    const { db } = await import('#/shared/db')
    try {
      const ctx = await auth.$context
      const user = await ctx.internalAdapter.createUser(
        {
          id: userId,
          name: 'Synthetic E2E',
          email: 'real-stack@example.invalid',
          emailVerified: true,
          twoFactorEnabled: true,
        },
        { method: 'admin' },
      )
      assert.equal(user.id, userId)
      // Same terminal state as two-factor/verify-two-factor.valid(): createSession
      // followed by setSessionCookie. No pending challenge or trust-device cookie.
      const session = await ctx.internalAdapter.createSession(user.id, false)
      assert(session)
      const signature = createHmac('sha256', ctx.secret)
        .update(session.token)
        .digest('base64')
      const cookie = `${ctx.authCookies.sessionToken.name}=${encodeURIComponent(`${session.token}.${signature}`)}`
      await writeFile(cookiePath, JSON.stringify({ cookie, userId }), {
        mode: 0o600,
      })
      // 0005 targets manueljialt@gmail.com and skips a fresh database. Seed ours.
      for (const slot of ['lunch', 'dinner']) {
        await sql`insert into recipe (id,user_id,name,slot) values (${`e2e-${slot}`},${userId},${`Synthetic ${slot}`},${slot})`
      }
      assert.equal(
        (await sql`select * from drizzle.__drizzle_migrations`).length,
        8,
      )
      await sql`select * from ai_menu_generation_request limit 0`
      await sql`select * from ai_menu_generation_lease limit 0`
      console.log(
        'PASS migrations 0000–0007, synthetic recipes, post-2FA session seeded',
      )
    } finally {
      await db.$client.end()
    }
  } else {
    const { cookie } = JSON.parse(await readFile(cookiePath, 'utf8'))
    const base = process.env.BETTER_AUTH_URL!
    const session = await fetch(`${base}/api/auth/get-session`, {
      headers: { cookie },
    }).then((r) => r.json())
    assert.equal(session.user.id, userId)
    assert.equal(session.user.twoFactorEnabled, true)
    const invalid = await fetch(`${base}/api/auth/get-session`, {
      headers: { cookie: `${cookie}tampered` },
      signal: AbortSignal.timeout(10000),
    }).then((r) => r.json())
    assert.equal(invalid, null)
    const results: object[] = []
    const emit = (check: string, evidence: unknown = true) => {
      results.push({ check, verdict: 'PASS', evidence })
      console.log(`PASS ${check}`)
    }
    const browser = (args: string[]) =>
      new Promise<unknown>((resolve, reject) => {
        const child = spawn(
          'agent-browser',
          ['--session', process.env.REAL_STACK_BROWSER!, '--json', ...args],
          { timeout: 45000 },
        )
        let out = '',
          error = ''
        child.stdout.on('data', (chunk) => {
          out += chunk
        })
        child.stderr.on('data', (chunk) => {
          error += chunk
        })
        child.on('error', reject)
        child.on('close', (code) => {
          try {
            const response = JSON.parse(out)
            if (code || !response.success)
              throw Error(JSON.stringify(response.error ?? response))
            resolve(response.data)
          } catch (e) {
            reject(
              new Error(
                `${args[0] === 'cookies' ? 'cookie setup' : args.join(' ')}: ${String(e)} ${error}`,
              ),
            )
          }
        })
      })
    const evaluate = async (source: string) => {
      const data = (await browser(['eval', source])) as { result: unknown }
      return data.result
    }
    const wait = (condition: string) => browser(['wait', '--fn', condition])
    const click = (name: string) =>
      browser(['find', 'role', 'button', 'click', '--name', name, '--exact'])
    let loaded = false
    const open = async (mock: string) => {
      const pageUrl = `${base}/weekly-menu-planner?mock=${mock}`
      if (!loaded) {
        await browser(['open', pageUrl])
        loaded = true
      } else {
        if (await evaluate("!!document.querySelector('.planner-ai-preview')")) {
          await click('Discard preview')
          await click('Discard generated preview')
        }
        await evaluate(
          `history.replaceState(null, '', ${JSON.stringify(pageUrl)}); true`,
        )
      }
      await wait(
        "document.querySelector('.planner-actions .planner-primary-btn:not(:disabled)') !== null",
      )
    }
    const accounting = async () => ({
      attempts: Number(
        (
          await sql`select count(*) from ai_menu_generation_request where user_id=${userId}`
        )[0].count,
      ),
      leases: Number(
        (
          await sql`select count(*) from ai_menu_generation_lease where user_id=${userId}`
        )[0].count,
      ),
    })
    const saved = async () =>
      Array.from(
        await sql`select m.week_start::text, d.day,d.context,d.scope,d.lunch_recipe_id,d.dinner_recipe_id from weekly_menu m join weekly_menu_day d on d.weekly_menu_id=m.id where m.user_id=${userId} order by d.day`,
      )
    try {
      emit(
        'real server accepts signed post-2FA session and rejects tampered cookie',
      )
      await browser(['--args', '--no-sandbox', 'open', base])
      await browser([
        'cookies',
        'set',
        cookie.split('=')[0],
        cookie.slice(cookie.indexOf('=') + 1),
        '--url',
        base,
        '--httpOnly',
      ])
      await browser(['set', 'viewport', '1440', '1200'])
      const scenarioPath = './selected.scenario.js'
      const scenario = await import(scenarioPath)
      await scenario.default({
        assert,
        browser,
        evaluate,
        wait,
        click,
        open,
        accounting,
        saved,
        emit,
        artifact,
      })
    } catch (error) {
      results.push({ verdict: 'FAIL', error: String(error) })
      await browser([
        'screenshot',
        artifact.replace(/\.json$/, '-failure.png'),
      ]).catch(() => {})
      throw error
    } finally {
      await writeFile(
        artifact,
        JSON.stringify({ suite: 'real-stack', results }, null, 2) + '\n',
      )
    }
  }
} finally {
  await sql.end()
}
