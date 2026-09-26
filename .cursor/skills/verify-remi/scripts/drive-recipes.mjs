#!/usr/bin/env node
/**
 * Drive Preferences recipes through Chrome CDP.
 * Requires scripts/launch.sh and a passing scripts/doctor.sh.
 * Evidence: .cursor/skills/verify-remi/evidence/<timestamp>/
 */
import { execFileSync, spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { connect } from 'node:net'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = join(SCRIPT_DIR, '../../../..')
const SKILL = join(ROOT, '.cursor/skills/verify-remi')
const RUN = join(SKILL, 'run')
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
const EVIDENCE = join(SKILL, 'evidence', `recipes-${stamp}`)
const ORIGIN = 'http://localhost:3001'
const STORAGE_KEY = 'remi:weekly-menu-planner:state'
const RECIPE_NAME = 'Lemon chickpea pasta'
const THROWAWAY_PASSWORD = 'recipe-drive-password'
const CHROME = process.env.CHROME_PATH || '/usr/local/bin/google-chrome'
const DEBUG_PORT = 9333

const report = {
  feature: 'preferences-recipes',
  origin: ORIGIN,
  startedAt: new Date().toISOString(),
  steps: [],
  network: [],
  console: [],
  storage: null,
  loggedIn: 'not-run',
  pass: false,
}

function step(name, ok, detail) {
  report.steps.push({ name, ok, detail })
  console.log(`${ok ? 'ok' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) throw new Error(`${name}: ${detail}`)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = connect({ host: '127.0.0.1', port })
    socket.once('connect', () => {
      socket.end()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
  })
}

class Cdp {
  constructor(ws) {
    this.ws = ws
    this.next = 0
    this.pending = new Map()
    this.handlers = []
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id)
        this.pending.delete(message.id)
        if (message.error) reject(new Error(JSON.stringify(message.error)))
        else resolve(message.result)
        return
      }
      for (const handler of this.handlers) handler(message)
    })
  }

  send(method, params = {}) {
    const id = ++this.next
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  on(handler) {
    this.handlers.push(handler)
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (result.exceptionDetails) {
      const text =
        result.exceptionDetails.exception?.description ||
        result.exceptionDetails.text
      throw new Error(text)
    }
    return result.result.value
  }
}

async function connectWs(url) {
  const ws = new WebSocket(url)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', () => reject(new Error(`websocket ${url}`)), {
      once: true,
    })
  })
  return new Cdp(ws)
}

async function launchChrome() {
  if (await portOpen(DEBUG_PORT)) {
    throw new Error(
      `port ${DEBUG_PORT} is in use. Refusing to attach to an existing Chrome.`,
    )
  }
  await mkdir(RUN, { recursive: true })
  await rm(join(RUN, 'chrome-profile'), { recursive: true, force: true })
  const log = createWriteStream(join(RUN, 'chrome.log'))
  const child = spawn(
    CHROME,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--window-size=1280,900',
      `--remote-debugging-port=${DEBUG_PORT}`,
      '--remote-allow-origins=*',
      `--user-data-dir=${join(RUN, 'chrome-profile')}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      'about:blank',
    ],
    { detached: true, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  child.stdout.pipe(log)
  child.stderr.pipe(log)
  child.unref()
  await writeFile(join(RUN, 'chrome.pid'), String(child.pid))
  for (let i = 0; i < 40; i++) {
    if (await portOpen(DEBUG_PORT)) return child
    if (child.exitCode != null) {
      throw new Error(`Chrome exited ${child.exitCode}. See run/chrome.log`)
    }
    await sleep(250)
  }
  throw new Error('Chrome debug port did not open')
}

async function stopChrome(child) {
  if (!child || child.killed || child.exitCode != null) return
  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch {
    child.kill('SIGTERM')
  }
  for (let i = 0; i < 20; i++) {
    if (child.exitCode != null) return
    await sleep(100)
  }
  try {
    process.kill(-child.pid, 'SIGKILL')
  } catch {
    child.kill('SIGKILL')
  }
}

async function newPage() {
  const version = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`).then(
    (response) => response.json(),
  )
  const browser = await connectWs(version.webSocketDebuggerUrl)
  const { targetId } = await browser.send('Target.createTarget', {
    url: 'about:blank',
  })
  let pageUrl
  for (let i = 0; i < 20; i++) {
    const list = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`).then(
      (response) => response.json(),
    )
    const target = list.find((item) => item.id === targetId)
    if (target?.webSocketDebuggerUrl) {
      pageUrl = target.webSocketDebuggerUrl
      break
    }
    await sleep(100)
  }
  if (!pageUrl) throw new Error('page target has no websocket')
  const page = await connectWs(pageUrl)
  await page.send('Page.enable')
  await page.send('Network.enable')
  await page.send('Runtime.enable')
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  })
  const requests = new Map()
  page.on((message) => {
    if (message.method === 'Network.requestWillBeSent') {
      requests.set(message.params.requestId, {
        url: message.params.request.url,
        method: message.params.request.method,
      })
    }
    if (message.method === 'Network.responseReceived') {
      const entry = requests.get(message.params.requestId) || {
        url: message.params.response.url,
      }
      entry.status = message.params.response.status
      requests.set(message.params.requestId, entry)
    }
    if (message.method === 'Runtime.consoleAPICalled') {
      const text = message.params.args
        .map((arg) => arg.value ?? arg.description ?? arg.type)
        .join(' ')
      report.console.push({ type: message.params.type, text })
    }
    if (message.method === 'Runtime.exceptionThrown') {
      report.console.push({
        type: 'exception',
        text: message.params.exceptionDetails?.text || 'exception',
      })
    }
  })
  page.requests = requests
  return page
}

async function navigate(page, url) {
  const loaded = new Promise((resolve) => {
    const onMessage = (message) => {
      if (message.method === 'Page.loadEventFired') {
        page.handlers = page.handlers.filter((handler) => handler !== onMessage)
        resolve()
      }
    }
    page.on(onMessage)
  })
  await page.send('Page.navigate', { url })
  await loaded
  await sleep(300)
}

async function screenshot(page, name) {
  const { data } = await page.send('Page.captureScreenshot', { format: 'png' })
  const file = join(EVIDENCE, name)
  await writeFile(file, Buffer.from(data, 'base64'))
  return file
}

async function clickSelector(page, selector) {
  const expression = `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) {
      return { pending: true, x, y, width: window.innerWidth };
    }
    const top = document.elementFromPoint(x, y);
    const hit = top === el || (top && el.contains(top));
    return {
      x, y, hit,
      text: (el.innerText || '').trim().slice(0, 120),
      tag: top ? top.tagName + '.' + String(top.className) : null,
    };
  })()`
  let point = null
  for (let i = 0; i < 20; i++) {
    point = await page.evaluate(expression)
    if (point && !point.pending && point.hit) break
    await sleep(100)
  }
  if (!point) throw new Error(`selector not found: ${selector}`)
  if (point.pending || !point.hit) {
    throw new Error(
      `selector ${selector} is covered by ${point.tag ?? 'nothing'} at ${point.x},${point.y}`,
    )
  }
  for (const type of ['mousePressed', 'mouseReleased']) {
    await page.send('Input.dispatchMouseEvent', {
      type,
      x: point.x,
      y: point.y,
      button: 'left',
      clickCount: 1,
    })
  }
  return point
}

async function until(page, predicateSource, attempts, pauseMs) {
  for (let i = 0; i < attempts; i++) {
    const value = await page.evaluate(predicateSource)
    if (value) return value
    await sleep(pauseMs)
  }
  return null
}

async function readStorage(page) {
  return page.evaluate(`(() => {
    const raw = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
    return raw ? JSON.parse(raw) : null;
  })()`)
}

function serverFnRequests(page) {
  return [...page.requests.values()].filter((entry) =>
    entry.url.includes('/_serverFn/'),
  )
}

async function openRecipesTab(page) {
  let open = null
  for (let i = 0; i < 6 && !open; i++) {
    open = await page.evaluate(
      "document.querySelector('aside.panel-drawer') ? 'yes' : ''",
    )
    if (open) break
    await clickSelector(page, 'button.planner-secondary-btn')
    open = await until(
      page,
      "document.querySelector('aside.panel-drawer') ? 'yes' : ''",
      10,
      200,
    )
  }
  if (open !== 'yes') throw new Error('preferences dialog did not open')

  let recipes = null
  for (let i = 0; i < 4 && !recipes; i++) {
    recipes = await page.evaluate(
      "document.querySelector('#preferences-recipes-panel') ? 'yes' : ''",
    )
    if (recipes) break
    await clickSelector(page, 'button#preferences-recipes-tab')
    recipes = await until(
      page,
      "document.querySelector('#preferences-recipes-panel') ? 'yes' : ''",
      8,
      150,
    )
  }
  if (recipes !== 'yes') throw new Error('recipes tab did not open')
}

async function setControl(page, selector, value) {
  const ok = await page.evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return false;
    const proto = el instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`)
  if (!ok) throw new Error(`control not found: ${selector}`)
}

function doctorText() {
  return execFileSync('bash', [join(SKILL, 'scripts/doctor.sh')], {
    encoding: 'utf8',
  })
}

function databaseUrl() {
  const text = execFileSync('bash', [
    '-lc',
    `grep -E '^DATABASE_URL=' ${JSON.stringify(join(ROOT, 'frontend/.env'))} | head -1 | cut -d= -f2-`,
  ], { encoding: 'utf8' }).trim()
  if (!text) throw new Error('DATABASE_URL missing from frontend/.env')
  return text
}

async function signUpThrowaway(email) {
  const response = await fetch(`${ORIGIN}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: ORIGIN,
    },
    body: JSON.stringify({
      name: 'Recipe Drive',
      email,
      password: THROWAWAY_PASSWORD,
    }),
  })
  const body = await response.text()
  if (response.status !== 200) {
    throw new Error(`sign-up HTTP ${response.status}: ${body.slice(0, 240)}`)
  }
  const header = response.headers
    .getSetCookie()
    .find((cookie) => cookie.startsWith('better-auth.session_token='))
  if (!header) throw new Error('sign-up did not set better-auth.session_token')
  const pair = header.split(';')[0]
  return decodeURIComponent(pair.slice('better-auth.session_token='.length))
}

function deleteThrowaway(email) {
  const url = databaseUrl()
  execFileSync(
    'psql',
    [url, '-v', 'ON_ERROR_STOP=1', '-c', `DELETE FROM "user" WHERE email = '${email}'`],
    { stdio: 'inherit' },
  )
}

async function writeReport(error) {
  report.finishedAt = new Date().toISOString()
  if (error) report.error = String(error.stack || error)
  await mkdir(EVIDENCE, { recursive: true })
  await writeFile(join(EVIDENCE, 'report.json'), JSON.stringify(report, null, 2))
  const lines = [
    `# Preferences recipes ${report.pass ? 'PASS' : 'FAIL'}`,
    '',
    `Origin: ${ORIGIN}`,
    `Logged in: ${report.loggedIn}`,
    `Evidence: ${EVIDENCE}`,
    '',
    ...report.steps.map(
      (item) =>
        `- ${item.ok ? 'PASS' : 'FAIL'} ${item.name}${item.detail ? `: ${item.detail}` : ''}`,
    ),
  ]
  if (error) lines.push('', '```', String(error.stack || error), '```')
  await writeFile(join(EVIDENCE, 'report.md'), `${lines.join('\n')}\n`)
}

async function main() {
  await mkdir(EVIDENCE, { recursive: true })
  const doctor = doctorText()
  const authReady = doctor.includes('auth-submit: ready')
  const chrome = await launchChrome()
  let page
  let email = null
  try {
    page = await newPage()
    await navigate(page, `${ORIGIN}/weekly-menu-planner`)
    const ready = await until(
      page,
      "document.body.innerText.includes('Preferences') ? 'yes' : ''",
      20,
      200,
    )
    step('planner ready', ready === 'yes', 'Preferences button visible')
    await openRecipesTab(page)
    const signedOut = await until(
      page,
      "document.body.innerText.includes('Sign in to save recipes.') ? 'yes' : ''",
      15,
      200,
    )
    const formAbsent = await page.evaluate(
      "document.querySelector('input[name=\"recipeName\"]') ? 'present' : 'absent'",
    )
    step(
      'signed-out recipes',
      signedOut === 'yes' && formAbsent === 'absent',
      `copy=${signedOut} form=${formAbsent}`,
    )
    await screenshot(page, '01-recipes-signed-out.png')
    const storage = await readStorage(page)
    const customRecipes = storage?.savedPreferences?.customRecipes
    step(
      'storage omits recipes',
      customRecipes === undefined,
      `customRecipes=${JSON.stringify(customRecipes ?? null)}`,
    )
    const earlyServerFns = serverFnRequests(page)
    step(
      'no recipe server call while signed out',
      earlyServerFns.length === 0,
      earlyServerFns.map((entry) => entry.url).join(' ') || 'none',
    )

    if (!authReady) {
      report.loggedIn = 'skipped'
      step(
        'logged-in recipes',
        true,
        'skipped (auth-submit blocked). Needs frontend/.env DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL=http://localhost:3001, and pg_isready. /login does not keep a session without email OTP.',
      )
    } else {
      report.loggedIn = 'ran'
      email = `recipe-drive-${Date.now()}@example.com`
      const token = await signUpThrowaway(email)
      const cookie = await page.send('Network.setCookie', {
        name: 'better-auth.session_token',
        value: token,
        url: ORIGIN,
        httpOnly: true,
        path: '/',
        sameSite: 'Lax',
      })
      step('session cookie', cookie.success === true, 'better-auth.session_token')
      await navigate(page, `${ORIGIN}/weekly-menu-planner`)
      const user = await until(
        page,
        "document.querySelector('.header-user')?.innerText || ''",
        20,
        200,
      )
      step('signed-in header', user === 'Recipe Drive', `header=${user}`)
      await openRecipesTab(page)
      const form = await until(
        page,
        "document.querySelector('input[name=\"recipeName\"]') ? 'yes' : ''",
        25,
        200,
      )
      step('recipe form', form === 'yes', 'name input visible')
      await setControl(page, 'input[name="recipeName"]', RECIPE_NAME)
      await setControl(page, 'input[placeholder="Ex. chickpeas"]', 'chickpeas')
      await setControl(page, '.panel-ingredient-row input[type="number"]', '1')
      await setControl(page, '.panel-ingredient-row select', 'g')
      let added = null
      for (let i = 0; i < 4 && !added; i++) {
        added = await page.evaluate(
          `document.body.innerText.includes(${JSON.stringify(RECIPE_NAME)}) && document.querySelector('.panel-recipe-card') ? 'yes' : ''`,
        )
        if (added) break
        await clickSelector(page, 'button.panel-add-btn')
        added = await until(
          page,
          `document.body.innerText.includes(${JSON.stringify(RECIPE_NAME)}) && document.querySelector('.panel-recipe-card') ? 'yes' : ''`,
          15,
          200,
        )
      }
      const cardText = await page.evaluate(
        "document.querySelector('.panel-recipe-card')?.innerText || ''",
      )
      step(
        'add recipe',
        added === 'yes' &&
          cardText.includes(RECIPE_NAME) &&
          cardText.includes('Dinner') &&
          /chickpeas/i.test(cardText),
        cardText.replaceAll('\n', ' ').slice(0, 180),
      )
      await screenshot(page, '02-recipe-added.png')
      await navigate(page, `${ORIGIN}/weekly-menu-planner`)
      await openRecipesTab(page)
      const reloaded = await until(
        page,
        `document.body.innerText.includes(${JSON.stringify(RECIPE_NAME)}) ? 'yes' : ''`,
        25,
        200,
      )
      step('recipe survives reload', reloaded === 'yes', RECIPE_NAME)
      await screenshot(page, '03-recipe-after-reload.png')
      const afterReload = await readStorage(page)
      step(
        'storage still omits recipes',
        afterReload?.savedPreferences?.customRecipes === undefined,
        'customRecipes absent',
      )
      await clickSelector(
        page,
        `button[aria-label=${JSON.stringify(`Delete ${RECIPE_NAME}`)}]`,
      )
      const gone = await until(
        page,
        "document.body.innerText.includes('No recipes saved yet.') ? 'yes' : ''",
        15,
        200,
      )
      step('delete recipe', gone === 'yes', 'empty copy returned')
      const posts = serverFnRequests(page).filter((entry) => entry.method === 'POST')
      step(
        'recipe server posts',
        posts.some((entry) => entry.status === 200),
        posts.map((entry) => `${entry.status}`).join(',') || 'none',
      )
    }

    report.storage = await readStorage(page)
    report.network = [...page.requests.values()].filter((entry) =>
      /\/api\/auth\/|\/_serverFn\//.test(entry.url),
    )
    report.title = await page.evaluate('document.title')
    report.url = await page.evaluate('location.href')
    report.pass = true
    await writeReport()
    console.log(`evidence: ${EVIDENCE}`)
  } catch (error) {
    if (page) {
      try {
        await screenshot(page, 'failure.png')
      } catch {
        // The page may already be gone.
      }
    }
    await writeReport(error)
    console.error(error)
    process.exitCode = 1
  } finally {
    if (email) {
      try {
        deleteThrowaway(email)
      } catch (error) {
        console.error(error)
        process.exitCode = 1
      }
    }
    await stopChrome(chrome)
  }
}

main().catch(async (error) => {
  console.error(error)
  try {
    await writeReport(error)
  } catch {
    // Evidence dir may not exist yet.
  }
  process.exitCode = 1
})
