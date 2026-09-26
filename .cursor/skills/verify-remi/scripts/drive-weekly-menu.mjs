#!/usr/bin/env node
/**
 * Drive the weekly menu planner through Chrome CDP.
 * Requires scripts/launch.sh and a passing scripts/doctor.sh.
 * Evidence: .cursor/skills/verify-remi/evidence/<timestamp>/
 */
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
const CHROME =
  process.env.CHROME_PATH ||
  '/usr/local/bin/google-chrome'
const DEBUG_PORT = 9333

const report = {
  feature: 'weekly-menu-planner',
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
  const { data } = await page.send('Page.captureScreenshot', {
    format: 'png',
  })
  const file = join(EVIDENCE, name)
  await writeFile(file, Buffer.from(data, 'base64'))
  return file
}

async function clickSelector(page, selector) {
  const point = await page.evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const top = document.elementFromPoint(x, y);
    const hit = top === el || (top && el.contains(top));
    return {
      x, y, hit,
      text: (el.innerText || '').trim().slice(0, 120),
      tag: top ? top.tagName + '.' + top.className : null,
    };
  })()`)
  if (!point) throw new Error(`selector not found: ${selector}`)
  if (!point.hit) {
    throw new Error(
      `selector ${selector} is covered by ${point.tag} at ${point.x},${point.y}`,
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

async function bodyText(page) {
  return page.evaluate('document.body.innerText')
}

async function until(page, predicateSource, attempts, pauseMs) {
  for (let i = 0; i < attempts; i++) {
    const value = await page.evaluate(predicateSource)
    if (value) return value
    await sleep(pauseMs)
  }
  return null
}

async function writeReport(error) {
  report.finishedAt = new Date().toISOString()
  if (error) report.error = String(error.stack || error)
  await mkdir(EVIDENCE, { recursive: true })
  await writeFile(join(EVIDENCE, 'report.json'), JSON.stringify(report, null, 2))
  const lines = [
    `# Weekly menu planner ${report.pass ? 'PASS' : 'FAIL'}`,
    '',
    `Origin: ${ORIGIN}`,
    `Evidence: ${EVIDENCE}`,
    '',
    ...report.steps.map(
      (item) => `- ${item.ok ? 'PASS' : 'FAIL'} ${item.name}${item.detail ? `: ${item.detail}` : ''}`,
    ),
  ]
  if (error) lines.push('', '```', String(error.stack || error), '```')
  await writeFile(join(EVIDENCE, 'report.md'), lines.join('\n') + '\n')
}

async function main() {
  await mkdir(EVIDENCE, { recursive: true })
  const chrome = await launchChrome()
  let page
  try {
    page = await newPage()
    await navigate(page, `${ORIGIN}/`)
    const home = await bodyText(page)
    step(
      'home copy',
      home.includes('Probando') && home.includes('Weekly menu'),
      'Probando and Weekly menu visible',
    )
    const lang = await page.evaluate('document.documentElement.lang')
    step('home lang', lang === 'en', `lang=${lang}`)
    await screenshot(page, '01-home.png')

    let path = null
    for (let i = 0; i < 6 && path !== '/weekly-menu-planner'; i++) {
      path = await page.evaluate('location.pathname')
      if (path === '/weekly-menu-planner') break
      await clickSelector(page, 'main.home-page a.planner-entry-link')
      path = await until(
        page,
        "location.pathname === '/weekly-menu-planner' ? location.pathname : ''",
        10,
        200,
      )
    }
    step('open planner', path === '/weekly-menu-planner', `path=${path}`)

    const empty = await until(
      page,
      "document.body.innerText.includes('No Weekly Menu yet') ? 'empty' : ''",
      15,
      200,
    )
    const shoppingDisabled = await page.evaluate(`(() => {
      const button = [...document.querySelectorAll('button.tab-btn')]
        .find((node) => node.innerText.startsWith('Shopping List'));
      return Boolean(button && button.disabled);
    })()`)
    step('empty state', empty === 'empty' && shoppingDisabled, 'Shopping List disabled')
    await screenshot(page, '02-planner-empty.png')

    let generated = null
    for (let i = 0; i < 6 && !generated; i++) {
      generated = await page.evaluate(
        "document.body.innerText.includes('Roasted Tomato Soup & Sourdough') ? 'yes' : ''",
      )
      if (generated) break
      await clickSelector(page, 'button.planner-primary-btn')
      generated = await until(
        page,
        "document.body.innerText.includes('Roasted Tomato Soup & Sourdough') ? 'yes' : ''",
        12,
        200,
      )
    }
    const afterGenerate = await bodyText(page)
    step(
      'generate menu',
      afterGenerate.includes('Roasted Tomato Soup & Sourdough') &&
        afterGenerate.includes('Herb-Crusted Salmon with Lentils') &&
        afterGenerate.includes('Regenerate menu') &&
        afterGenerate.includes('Mock set 1 of 3') &&
        !afterGenerate.includes('No Weekly Menu yet'),
      'Monday meals, regenerate label, mock set 1 of 3',
    )
    await screenshot(page, '03-planner-generated.png')

    const storageAfterGenerate = await page.evaluate(`(() => {
      const raw = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
      return raw ? JSON.parse(raw) : null;
    })()`)
    step(
      'storage index',
      storageAfterGenerate?.currentMenuIndex === 0,
      `currentMenuIndex=${storageAfterGenerate?.currentMenuIndex}`,
    )

    let shopping = null
    for (let i = 0; i < 4 && !shopping; i++) {
      shopping = await page.evaluate(
        "document.body.innerText.includes('Everything you need for this week') ? 'yes' : ''",
      )
      if (shopping) break
      await page.evaluate(`(() => {
        const button = [...document.querySelectorAll('button.tab-btn')]
          .find((node) => node.innerText.startsWith('Shopping List'));
        if (!button) return false;
        button.scrollIntoView({ block: 'center' });
        return true;
      })()`)
      const buttons = await page.evaluate(`(() => {
        return [...document.querySelectorAll('button.tab-btn')].map((node) => ({
          text: node.innerText.trim().slice(0, 40),
          disabled: node.disabled,
        }));
      })()`)
      const target = await page.evaluate(`(() => {
        const button = [...document.querySelectorAll('button.tab-btn')]
          .find((node) => node.innerText.startsWith('Shopping List'));
        if (!button || button.disabled) return null;
        const rect = button.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`)
      if (!target) {
        await sleep(300)
        continue
      }
      for (const type of ['mousePressed', 'mouseReleased']) {
        await page.send('Input.dispatchMouseEvent', {
          type,
          x: target.x,
          y: target.y,
          button: 'left',
          clickCount: 1,
        })
      }
      shopping = await until(
        page,
        "document.body.innerText.includes('Everything you need for this week') ? 'yes' : ''",
        10,
        200,
      )
      if (!shopping) report.console.push({ type: 'debug', text: JSON.stringify(buttons) })
    }
    step('shopping tab', shopping === 'yes', 'Everything you need for this week')

    let pressed = null
    for (let i = 0; i < 4 && pressed !== 'true'; i++) {
      pressed = await page.evaluate(`(() => {
        const row = document.querySelector('button.planner-ingredient-row');
        return row ? row.getAttribute('aria-pressed') : '';
      })()`)
      if (pressed === 'true') break
      await clickSelector(page, 'button.planner-ingredient-row')
      pressed = await until(
        page,
        `(() => {
          const row = document.querySelector('button.planner-ingredient-row');
          return row && row.getAttribute('aria-pressed') === 'true' ? 'true' : '';
        })()`,
        8,
        150,
      )
    }
    const rowText = await page.evaluate(
      "document.querySelector('button.planner-ingredient-row')?.innerText || ''",
    )
    step(
      'toggle ingredient',
      pressed === 'true' && rowText.includes('Cherry tomatoes') && rowText.includes('In fridge'),
      rowText.replaceAll('\n', ' ').slice(0, 160),
    )
    await screenshot(page, '04-shopping-toggled.png')

    report.storage = await page.evaluate(`(() => {
      const raw = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
      return raw ? JSON.parse(raw) : null;
    })()`)
    const item = report.storage?.shoppingChecklist?.['produceAndFreshHerbs::Cherry tomatoes']
    step(
      'storage checklist',
      item?.checked === true && item?.inFridge === true,
      JSON.stringify(item),
    )

    report.network = [...page.requests.values()].filter((entry) =>
      /\/api\/auth\/get-session|localhost:3001\/($|weekly-menu-planner)/.test(entry.url),
    )
    const session = report.network.find((entry) =>
      entry.url.includes('/api/auth/get-session'),
    )
    step(
      'session endpoint',
      session?.status === 200,
      session ? `${session.status} ${session.url}` : 'get-session was not requested',
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
        // The page may already be gone. The report still records the error.
      }
    }
    await writeReport(error)
    console.error(error)
    process.exitCode = 1
  } finally {
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
