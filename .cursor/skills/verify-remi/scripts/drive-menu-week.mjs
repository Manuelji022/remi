#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { spawn } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { connect } from 'node:net'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = join(SCRIPT_DIR, '../../../..')
const SKILL = join(ROOT, '.cursor/skills/verify-remi')
const RUN = join(SKILL, 'run')
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
const EVIDENCE = join(SKILL, 'evidence', stamp)
const ORIGIN = 'http://localhost:3001'
const STORAGE_KEY = 'remi:weekly-menu-planner:state'
const CHROME = process.env.CHROME_PATH || '/usr/local/bin/google-chrome'
const DEBUG_PORT = 9333
const THROWAWAY_PASSWORD = 'week-drive-password'

const report = {
  feature: 'weekly-menu-week',
  origin: ORIGIN,
  startedAt: new Date().toISOString(),
  steps: [],
  network: [],
  console: [],
  storage: null,
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

function firstDayCardText() {
  return `(() => {
    const card = document.querySelector('.planner-day-grid .day-card');
    return card ? card.innerText : '';
  })()`
}

function mealName(dayIndex, slotIndex) {
  return `(() => {
    const card = document.querySelectorAll('.planner-day-grid .day-card')[${dayIndex}];
    const slot = card?.querySelectorAll('.meal-slot')[${slotIndex}];
    return slot?.querySelector('.meal-name')?.innerText || '';
  })()`
}

function serverFnOkCount(page) {
  return [...page.requests.values()].filter(
    (entry) => entry.url.includes('/_serverFn/') && entry.status === 200,
  ).length
}

const TUESDAY_EAT_OUT =
  '#preferences-schedule-panel .panel-day-list > .panel-day-card:nth-child(2) .panel-control-group:nth-child(2) button.panel-context-pill:nth-child(2)'

function guestBlobIntact(stored) {
  const dayContexts = stored?.savedPreferences?.dayContexts
  return (
    dayContexts?.Tuesday === 'eatOut' && dayContexts.Monday === undefined
  )
}

function databaseUrl() {
  const text = execFileSync(
    'bash',
    [
      '-lc',
      `grep -E '^DATABASE_URL=' ${JSON.stringify(join(ROOT, 'frontend/.env'))} | head -1 | cut -d= -f2-`,
    ],
    { encoding: 'utf8' },
  ).trim()
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
      name: 'Week Drive',
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
    [
      url,
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      `DELETE FROM "user" WHERE email = '${email}'`,
    ],
    { stdio: 'inherit' },
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

async function openSchedule(page) {
  let open = null
  for (let i = 0; i < 6 && !open; i++) {
    open = await page.evaluate(
      "document.querySelector('#preferences-schedule-panel') ? 'yes' : ''",
    )
    if (open) break
    await clickSelector(page, 'button.planner-secondary-btn')
    open = await until(
      page,
      "document.querySelector('#preferences-schedule-panel') ? 'yes' : ''",
      10,
      200,
    )
  }
  if (open !== 'yes') throw new Error('schedule panel did not open')
}

async function writeReport(error) {
  report.finishedAt = new Date().toISOString()
  if (error) report.error = String(error.stack || error)
  await mkdir(EVIDENCE, { recursive: true })
  await writeFile(join(EVIDENCE, 'report.json'), JSON.stringify(report, null, 2))
  const lines = [
    `# Weekly menu week ${report.pass ? 'PASS' : 'FAIL'}`,
    '',
    `Origin: ${ORIGIN}`,
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
  const doctor = execFileSync('bash', [join(SKILL, 'scripts/doctor.sh')], {
    encoding: 'utf8',
  })
  if (!doctor.includes('auth-submit: ready')) {
    throw new Error('auth-submit is not ready')
  }
  const chrome = await launchChrome()
  let page
  let email = null
  try {
    page = await newPage()
    await navigate(page, `${ORIGIN}/weekly-menu-planner`)
    const generated = await until(
      page,
      `(() => {
        const text = document.body.innerText;
        return text.includes('No home-planned meal') && text.includes('Regenerate menu') ? 'yes' : '';
      })()`,
      8,
      200,
    )
    if (generated !== 'yes') {
      await clickSelector(page, 'button.planner-primary-btn')
    }
    const meals = await until(
      page,
      `(() => {
        const text = document.body.innerText;
        return text.includes('No home-planned meal') &&
          text.includes('Regenerate menu') &&
          !text.includes('Roasted Tomato Soup & Sourdough') &&
          !text.includes('Herb-Crusted Salmon with Lentils') &&
          !text.includes('Mock set')
          ? 'yes'
          : '';
      })()`,
      20,
      200,
    )
    step('guest menu', meals === 'yes', 'empty pool grid, no mock dishes')
    await openSchedule(page)
    await clickSelector(page, TUESDAY_EAT_OUT)
    const eatOutPressed = await until(
      page,
      `document.querySelector(${JSON.stringify(TUESDAY_EAT_OUT)})?.getAttribute('aria-pressed')`,
      10,
      100,
    )
    step(
      'tuesday eat out selected',
      eatOutPressed === 'true',
      `pressed=${eatOutPressed}`,
    )
    await clickSelector(page, '.panel-footer button.panel-primary-btn')
    const guestSaved = await until(
      page,
      `(() => {
        const raw = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
        if (!raw) return '';
        const dayContexts = JSON.parse(raw).savedPreferences?.dayContexts;
        return dayContexts?.Tuesday === 'eatOut' && dayContexts.Monday === undefined ? 'yes' : '';
      })()`,
      20,
      100,
    )
    step(
      'guest save writes tuesday eat out',
      guestSaved === 'yes',
      'Monday stays unset',
    )
    email = `week-drive-${Date.now()}@example.com`
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
    await page.evaluate(
      "globalThis[Symbol.for('better-auth:focus-manager')].setFocused(true)",
    )
    const user = await until(
      page,
      "document.querySelector('.header-user')?.innerText || ''",
      25,
      200,
    )
    step('signed-in header', user === 'Week Drive', `header=${user}`)
    const afterSignIn = await readStorage(page)
    step(
      'sign-in keeps the guest blob',
      guestBlobIntact(afterSignIn),
      JSON.stringify(afterSignIn?.savedPreferences?.dayContexts ?? null),
    )
    let weekLoaded = false
    for (let i = 0; i < 30; i++) {
      weekLoaded = [...page.requests.values()].some(
        (entry) => entry.url.includes('/_serverFn/') && entry.status === 200,
      )
      if (weekLoaded) break
      await sleep(200)
    }
    step('week load', weekLoaded, weekLoaded ? 'server fn 200' : 'no server fn response')
    const currentPill = await page.evaluate(
      "document.querySelector('.planner-week-pill')?.innerText || ''",
    )
    step('current week pill', /week/i.test(currentPill), currentPill)
    await openRecipesTab(page)
    const form = await until(
      page,
      "document.querySelector('input[name=\"recipeName\"]') ? 'yes' : ''",
      25,
      200,
    )
    step('recipe form', form === 'yes', 'name input visible')
    await setControl(page, 'input[name="recipeName"]', 'Lemon pasta')
    await setControl(page, 'input[placeholder="Ex. chickpeas"]', 'pasta')
    await setControl(page, '.panel-ingredient-row input[type="number"]', '1')
    await setControl(page, '.panel-ingredient-row select', 'g')
    let added = null
    for (let i = 0; i < 4 && !added; i++) {
      added = await page.evaluate(
        "document.body.innerText.includes('Lemon pasta') && document.querySelector('.panel-recipe-card') ? 'yes' : ''",
      )
      if (added) break
      await clickSelector(page, 'button.panel-add-btn')
      added = await until(
        page,
        "document.body.innerText.includes('Lemon pasta') && document.querySelector('.panel-recipe-card') ? 'yes' : ''",
        15,
        200,
      )
    }
    const cardText = await page.evaluate(
      "document.querySelector('.panel-recipe-card')?.innerText || ''",
    )
    step(
      'add dinner recipe',
      added === 'yes' && cardText.includes('Lemon pasta') && cardText.includes('Dinner'),
      cardText.replaceAll('\n', ' ').slice(0, 180),
    )
    await clickSelector(page, 'button#preferences-schedule-tab')
    const schedule = await until(
      page,
      "document.querySelector('#preferences-schedule-panel') ? 'yes' : ''",
      10,
      200,
    )
    step('schedule tab', schedule === 'yes', 'schedule panel visible')
    await clickSelector(
      page,
      '#preferences-schedule-panel .panel-day-card button.panel-context-pill',
    )
    const officePressed = await until(
      page,
      "document.querySelector('#preferences-schedule-panel .panel-day-card button.panel-context-pill')?.getAttribute('aria-pressed')",
      10,
      100,
    )
    step('monday office selected', officePressed === 'true', `pressed=${officePressed}`)
    await clickSelector(page, '.panel-footer button.panel-primary-btn')
    const officeSaved = await until(
      page,
      `(() => {
        const text = ${firstDayCardText()};
        return /office/i.test(text) && text.includes('No home-planned meal') ? 'yes' : '';
      })()`,
      25,
      200,
    )
    step('monday office saved', officeSaved === 'yes', 'Monday shows Office')
    await clickSelector(page, 'button.planner-primary-btn')
    const officeCard = await until(
      page,
      `(() => {
        const text = ${firstDayCardText()};
        return /office/i.test(text) && text.includes('No home-planned meal') && text.includes('Lemon pasta') ? 'yes' : '';
      })()`,
      25,
      200,
    )
    step(
      'generated monday dinner',
      officeCard === 'yes',
      'Monday lunch is unplanned and dinner is Lemon pasta',
    )
    await screenshot(page, '01-current-week-office.png')
    const stored = await readStorage(page)
    step(
      'guest blob does not take the signed-in week',
      guestBlobIntact(stored),
      JSON.stringify(stored?.savedPreferences?.dayContexts ?? null),
    )

    await navigate(page, `${ORIGIN}/weekly-menu-planner`)
    const reloaded = await until(
      page,
      `(() => {
        const text = ${firstDayCardText()};
        return /office/i.test(text) && text.includes('No home-planned meal') && text.includes('Lemon pasta') ? 'yes' : '';
      })()`,
      30,
      200,
    )
    step('office survives reload', reloaded === 'yes', 'Monday still Office')
    await screenshot(page, '02-current-week-after-reload.png')

    await clickSelector(page, 'button[aria-label="Previous week"]')
    const prior = await until(
      page,
      `(() => {
        const pill = document.querySelector('.planner-week-pill')?.innerText || '';
        const body = document.body.innerText;
        return pill && pill !== ${JSON.stringify(currentPill)} && !body.includes('Lemon pasta') && !/office/i.test(body) ? 'yes' : '';
      })()`,
      30,
      200,
    )
    step(
      'prior week is a different menu',
      prior === 'yes',
      'previous Monday has no Office badge',
    )
    await screenshot(page, '03-prior-week.png')

    await clickSelector(page, 'button[aria-label="Next week"]')
    const back = await until(
      page,
      `(() => {
        const pill = document.querySelector('.planner-week-pill')?.innerText || '';
        const text = ${firstDayCardText()};
        return pill === ${JSON.stringify(currentPill)} && /office/i.test(text) && text.includes('No home-planned meal') && text.includes('Lemon pasta') ? 'yes' : '';
      })()`,
      30,
      200,
    )
    step('current week returns', back === 'yes', 'Office is back on this Monday')

    await openRecipesTab(page)
    const herbForm = await until(
      page,
      "document.querySelector('input[name=\"recipeName\"]') ? 'yes' : ''",
      25,
      200,
    )
    step('second recipe form', herbForm === 'yes', 'name input visible')
    await setControl(page, 'input[name="recipeName"]', 'Herb rice')
    await setControl(page, 'input[placeholder="Ex. chickpeas"]', 'rice')
    await setControl(page, '.panel-ingredient-row input[type="number"]', '1')
    await setControl(page, '.panel-ingredient-row select', 'g')
    let herb = null
    for (let i = 0; i < 4 && !herb; i++) {
      herb = await page.evaluate(
        "document.body.innerText.includes('Herb rice') && document.querySelectorAll('.panel-recipe-card').length >= 2 ? 'yes' : ''",
      )
      if (herb) break
      await clickSelector(page, 'button.panel-add-btn')
      herb = await until(
        page,
        "document.body.innerText.includes('Herb rice') && document.querySelectorAll('.panel-recipe-card').length >= 2 ? 'yes' : ''",
        15,
        200,
      )
    }
    step('add second dinner', herb === 'yes', 'Herb rice is saved')
    await clickSelector(page, 'button.panel-close-btn')
    const panelClosed = await until(
      page,
      "document.querySelector('aside.panel-drawer') ? '' : 'yes'",
      15,
      100,
    )
    step('recipes panel closed', panelClosed === 'yes', 'drawer is gone')

    const loadsBeforeNext = serverFnOkCount(page)
    await clickSelector(page, 'button[aria-label="Next week"]')
    const nextWeek = await until(
      page,
      `(() => {
        const pill = document.querySelector('.planner-week-pill')?.innerText || '';
        return pill && pill !== ${JSON.stringify(currentPill)} ? pill : '';
      })()`,
      30,
      200,
    )
    let nextLoaded = false
    for (let i = 0; i < 30 && !nextLoaded; i++) {
      nextLoaded = serverFnOkCount(page) > loadsBeforeNext
      if (!nextLoaded) await sleep(200)
    }
    step(
      'next week loaded',
      Boolean(nextWeek) && nextLoaded,
      nextWeek || 'pill did not change',
    )
    let avoided = null
    for (let i = 0; i < 4 && avoided !== 'yes'; i++) {
      await clickSelector(page, 'button.planner-primary-btn')
      avoided = await until(
        page,
        `(() => {
          const mondayLunch = ${mealName(0, 0)};
          const mondayDinner = ${mealName(0, 1)};
          const tuesdayDinner = ${mealName(1, 1)};
          return mondayLunch === 'No home-planned meal' &&
            mondayDinner === 'Herb rice' &&
            tuesdayDinner === 'Lemon pasta'
            ? 'yes'
            : '';
        })()`,
        20,
        200,
      )
    }
    step(
      'next week avoids the prior dinner',
      avoided === 'yes',
      'Monday dinner is Herb rice and Tuesday repeats Lemon pasta',
    )
    await screenshot(page, '04-next-week-avoids-prior.png')

    await clickSelector(page, 'button[aria-label="Previous week"]')
    const stillCurrent = await until(
      page,
      `(() => {
        const pill = document.querySelector('.planner-week-pill')?.innerText || '';
        const text = ${firstDayCardText()};
        return pill === ${JSON.stringify(currentPill)} && /office/i.test(text) && text.includes('Lemon pasta') ? 'yes' : '';
      })()`,
      30,
      200,
    )
    step(
      'prior week stays the saved menu',
      stillCurrent === 'yes',
      'generating next week did not replace this Monday',
    )

    await clickSelector(page, 'button.header-auth-button')
    const loggedOut = await until(
      page,
      "document.querySelector('.header-user') ? '' : 'yes'",
      30,
      200,
    )
    step('logged out', loggedOut === 'yes', 'header user is gone')
    await clickSelector(page, 'button.planner-primary-btn')
    const restored = await until(
      page,
      `(() => {
        const header = document.querySelector('.header-user')?.innerText || '';
        const cards = [...document.querySelectorAll('.planner-day-grid .day-card')];
        const monday = cards[0]?.innerText || '';
        const tuesday = cards[1]?.innerText || '';
        if (header) return '';
        return !/office/i.test(monday) && /eat out/i.test(tuesday) ? 'yes' : '';
      })()`,
      30,
      200,
    )
    step(
      'logout restores guest schedule',
      restored === 'yes',
      'Tuesday is Eat out and Monday Office is gone',
    )
    const afterLogout = await readStorage(page)
    step(
      'logout keeps the guest blob',
      guestBlobIntact(afterLogout),
      JSON.stringify(afterLogout?.savedPreferences?.dayContexts ?? null),
    )
    const posts = [...page.requests.values()].filter(
      (entry) => entry.url.includes('/_serverFn/') && entry.method === 'POST',
    )
    step(
      'week server posts',
      posts.some((entry) => entry.status === 200),
      posts.map((entry) => String(entry.status)).join(',') || 'none',
    )
    report.storage = await readStorage(page)
    report.network = [...page.requests.values()].filter((entry) =>
      /\/api\/auth\/|\/_serverFn\//.test(entry.url),
    )
    report.pass = true
    await writeReport()
    console.log(`evidence: ${EVIDENCE}`)
  } catch (error) {
    if (page) {
      try {
        await screenshot(page, 'failure.png')
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (!message.includes('Target closed')) console.error(error)
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
  process.exitCode = 1
})
