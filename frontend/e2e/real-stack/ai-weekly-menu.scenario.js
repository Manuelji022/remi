import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export default async function scenario({ assert, browser, evaluate, wait, click, open, accounting, saved, withRecipeTableHidden, seedDecisionFixture, transportLog, emit, artifact }) {
  const preview = "document.querySelector('.planner-ai-preview')"
  const skeleton = "document.querySelector('.planner-ai-skeleton')"
  const dialog = "document.querySelector('dialog[aria-labelledby=\"ai-generation-title\"][open]')"
  const textButton = (scope, labels) =>
    `Array.from(${scope}.querySelectorAll('button')).find(button => ${JSON.stringify(labels)}.some(label => button.textContent.includes(label)))`
  const readyButton = textButton('document', [
    'Generate menu',
    'Regenerate menu',
  ])
  const clickGeneration = async () => {
    try {
      await click('Generate menu')
    } catch {
      await click('Regenerate menu')
    }
  }
  async function generate(mock, first = false) {
    await open(mock)
    await clickGeneration()
    await wait(`${dialog} !== null`)
    if (first) emit('authenticated planner: Generate opens schedule dialog')
    await click('Confirm schedule and generate')
    if (mock === 'ok') {
      await wait(`${dialog} === null`)
      if (first) emit('confirmation closes dialog and settles to preview')
      await wait(`${preview} !== null`)
      const acceptButton = textButton(preview, ['Accept and save menu'])
      await wait(`${acceptButton} && !${acceptButton}.disabled`)
    }
  }
  await generate('ok', true)
  const shown = await evaluate(`Array.from(${preview}.querySelectorAll('.day-card'), card => ({day:card.querySelector('.day-name').textContent, ids:Array.from(card.querySelectorAll('select'), s=>s.value || null), names:Array.from(card.querySelectorAll('.meal-name'), s=>s.textContent)}))`)
  assert.equal(shown.length, 7)
  assert(shown.every((day) => day.names.includes('Synthetic dinner') && day.names.includes('Synthetic lunch')))
  assert.deepEqual(await accounting(), { attempts: 1, leases: 0 })
  assert.deepEqual(await saved(), [])
  emit('mock ok consumes one attempt, releases lease, preview does not save', shown)
  await browser(['screenshot', artifact.replace(/\.json$/, '.png')])
  await click('Accept and save menu')
  await browser(['wait', '--text', 'Weekly Menu saved.'])
  const baseline = await saved()
  const nextMonday = new Date()
  nextMonday.setUTCDate(nextMonday.getUTCDate() + ((8 - nextMonday.getUTCDay()) % 7 || 7))
  const target = nextMonday.toISOString().slice(0, 10)
  assert.equal(baseline.length, 7)
  for (const row of baseline) {
    const day = shown.find((item) => item.day === row.day)
    assert(day)
    assert.equal(row.week_start, target)
    assert.equal(row.scope, 'both')
    assert.equal(row.context, null)
    assert.deepEqual([row.lunch_recipe_id, row.dinner_recipe_id], day.ids)
  }
  emit('Accept persists exactly seven preview days and recipe IDs for next week', baseline)
  const errors = {
    error: 'Could not generate next week’s menu.',
    'rate-limited': 'You have reached the AI menu request limit.',
    'in-progress': 'An AI menu is already being generated for your account.',
    stale: 'The Calendar Week changed.',
  }
  for (const [mock, message] of Object.entries(errors)) {
    await generate(mock)
    await browser(['wait', '--text', message])
    await wait(`${skeleton} === null`)
    if (mock === 'error') {
      await browser(['wait', '--text', 'Retry generation'])
      await browser(['screenshot', artifact.replace(/\.json$/, '-error.png')])
    }
    assert.deepEqual(await accounting(), { attempts: 1, leases: 0 })
    assert.deepEqual(await saved(), baseline)
    emit(`${mock}: real server feedback, zero attempts, no lease, saved week unchanged`)
  }
  await open('ok')
  await clickGeneration()
  await wait(`${dialog} !== null`)
  await withRecipeTableHidden(async () => {
    await click('Confirm schedule and generate')
    await browser(['wait', '--text', errors.error])
    await wait(`${skeleton} === null`)
  })
  assert.deepEqual(await accounting(), { attempts: 1, leases: 0 })
  assert.deepEqual(await saved(), baseline)
  emit('ok whose context read fails: loaded before the lease, so zero attempts and no lease')
  for (let attempts = 2; attempts <= 5; attempts++) {
    await generate('ok')
    assert.deepEqual(await accounting(), { attempts, leases: 0 })
    assert.deepEqual(await saved(), baseline)
    emit(`guarded ok generation ${attempts}: attempt recorded and lease released`)
  }
  await open('ok')
  await clickGeneration()
  await wait(`${dialog} !== null`)
  await click('Confirm schedule and generate')
  await browser(['wait', '--text', errors['rate-limited']])
  assert.deepEqual(await accounting(), { attempts: 5, leases: 0 })
  assert.deepEqual(await saved(), baseline)
  emit('sixth ok generation hits real rolling-hour DB limit; saved week unchanged')

  // ---- Decisions adapter (mock transport only; no model-quality claim) ----
  await seedDecisionFixture()
  const dir = dirname(artifact)
  const stem = join(dir, 'weekly-menu-decisions-results')
  const shots = ['preview', 'manual', 'failure-recovery', 'accepted', 'local-fallback']
  await Promise.all([`${stem}.json`, ...shots.map((n) => `${stem}-${n}.png`)].map((f) => rm(f, { force: true })))
  const assertions = []
  const check = async (name, run) => {
    try {
      await run()
      assertions.push({ name, verdict: 'PASS' })
    } catch (error) {
      assertions.push({ name, verdict: 'FAIL', error: String(error) })
      throw error
    }
  }
  const genAnother = "document.querySelector('dialog[aria-labelledby=\"ai-generate-another-title\"][open]')"
  const read = () => evaluate(`Array.from(${preview}.querySelectorAll('.day-card'), card => Array.from(card.querySelectorAll('.meal-slot'), slot => slot.querySelector('select')?.value || null))`)
  const names = () => evaluate(`Array.from(document.querySelectorAll('.day-card .meal-name'), n => n.textContent)`)
  const setMock = (m) => evaluate(`history.replaceState(null, '', location.pathname + '?mock=${m}'); true`)
  const origin = await evaluate('location.origin')
  const pageUrl = `${origin}/weekly-menu-planner?mock=ok`
  const ready = `${readyButton} && !${readyButton}.disabled`
  let result = { scenario: 'decisions-real-stack-mock-transport', verdict: 'FAIL' }
  try {
    // A: initial generation through the real adapter, SDK and HTTP transport code.
    await browser(['open', pageUrl])
    await wait(ready)
    await clickGeneration()
    await wait(`${dialog} !== null`)
    // Office on Monday: lunch becomes a covered slot without a recipe.
    await evaluate(`Array.from(document.querySelectorAll('dialog .panel-day-card')[0].querySelectorAll('button')).find(b => b.textContent.includes('Office')).click(); true`)
    await click('Confirm schedule and generate')
    await wait(`${preview} !== null && ${preview}.querySelector('select') !== null`)
    const generated = await read()
    const [transport] = await transportLog()
    await check('transport called once with more than one candidate', () => {
      assert.equal((transport ? 1 : 0), 1)
      assert(transport.candidateCount > 1)
    })
    await check('selected the LAST (non-first) candidate; preview equals it', () => {
      assert.equal(transport.choice, `menu-${transport.candidateCount - 1}`)
      assert.deepEqual(generated, transport.selected)
    })
    await check('covered Monday lunch has no recipe and no selector', () => assert.equal(generated[0][0], null))
    await check('every home slot has a recipe', () => assert(generated.flat().filter((id) => id !== null).length === 13))
    await check('one guarded attempt, no lease, nothing saved by preview', async () => {
      assert.deepEqual(await accounting(), { attempts: 1, leases: 0 })
      assert.deepEqual(await saved(), [])
    })
    await browser(['screenshot', `${stem}-preview.png`])
    emit('ok: real adapter selected last candidate; one guarded attempt; preview unsaved', { candidateCount: transport.candidateCount, choice: transport.choice })

    // B: manual edit of one home slot.
    const swapped = await evaluate(`(() => {
      const select = document.querySelectorAll('.planner-ai-preview .day-card')[1].querySelectorAll('select')[1]
      const used = new Set(Array.from(document.querySelectorAll('.planner-ai-preview select'), s => s.value))
      const next = Array.from(select.options).map(o => o.value).find(v => v && !used.has(v)) ?? Array.from(select.options).map(o => o.value).find(v => v && v !== select.value)
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, next)
      select.dispatchEvent(new Event('change', { bubbles: true }))
      return { to: next }
    })()`)
    await wait(`${preview}.querySelectorAll('.day-card')[1].querySelectorAll('select')[1].value === ${JSON.stringify(swapped.to)}`)
    const edited = await read()
    await check('manual change is reflected only in the edited slot', () => {
      assert.equal(edited[1][1], swapped.to)
      assert.notEqual(generated[1][1], swapped.to)
      assert.deepEqual(edited.flat().filter((id, i) => id !== generated.flat()[i]), [swapped.to])
    })
    await check('manual change: no extra generateNextWeeklyMenu call or attempt row', async () => {
      assert.deepEqual(await accounting(), { attempts: 1, leases: 0 })
      assert.equal((await transportLog()).length, 1)
    })
    await browser(['screenshot', `${stem}-manual.png`])
    emit('manual selector change: no further generation call, no extra attempt', { swappedTo: swapped.to })

    // D: failed regeneration keeps the edited preview intact.
    await setMock('decision-invalid')
    await click('Generate another')
    await wait(`${genAnother} !== null`)
    await evaluate(`${textButton(genAnother, ['Generate another'])}.click(); true`)
    await browser(['wait', '--text', errors.error])
    await wait(`${skeleton} === null && ${preview} !== null && ${preview}.querySelector('select') !== null`)
    const restored = await read()
    const log = await transportLog()
    await check('invalid choice fails recoverably and edited preview is restored intact', () => assert.deepEqual(restored, edited))
    await check('invalid transport answered with an unknown id', () => {
      assert.equal(log.length, 2)
      assert.equal(log[1].scenario, 'decision-invalid')
      assert.equal(log[1].selected, null)
    })
    await check('failed regeneration: attempt counted, lease released, nothing saved', async () => {
      assert.deepEqual(await accounting(), { attempts: 2, leases: 0 })
      assert.deepEqual(await saved(), [])
    })
    await browser(['screenshot', `${stem}-failure-recovery.png`])
    emit('decision-invalid: loss dialog, recoverable error, edited preview restored, lease released')

    // C: accept saves exactly the visible edited menu; reload and shopping list.
    await click('Accept and save menu')
    await browser(['wait', '--text', 'Weekly Menu saved.'])
    const week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const rows = (await saved()).sort((a, b) => week.indexOf(a.day) - week.indexOf(b.day))
    await check('PostgreSQL week equals the visible edited menu', () => {
      assert.equal(rows.length, 7)
      assert.deepEqual(rows.map((r) => [r.day, r.lunch_recipe_id, r.dinner_recipe_id]), edited.map((d, i) => [week[i], ...d]))
      assert.equal(rows[0].context, 'office')
      assert.equal(rows[0].lunch_recipe_id, null)
    })
    await browser(['screenshot', `${stem}-accepted.png`])
    await browser(['open', pageUrl])
    await wait(ready)
    await click('Next week')
    await wait("document.querySelectorAll('.day-card .meal-name').length >= 14")
    const reloaded = await evaluate(`Array.from(document.querySelectorAll('.day-card'), card => Array.from(card.querySelectorAll('.meal-slot .meal-name'), n => n.textContent))`)
    const expectedNames = edited.map((day) => day.map((id) => (id ? `Decision ${id.slice(4).replace('-', ' ')}` : null)))
    await check('reload shows the saved edited menu', () => {
      assert.equal(reloaded.length, 7)
      reloaded.forEach((day, d) => day.forEach((n, i) => { if (expectedNames[d][i]) assert.equal(n, expectedNames[d][i]) }))
    })
    await evaluate("Array.from(document.querySelectorAll('.tab-btn')).find((b) => b.textContent.startsWith('Shopping List')).click(); true")
    await wait("document.querySelector('.planner-shopping-item') !== null")
    const lines = await evaluate(`Array.from(document.querySelectorAll('.planner-shopping-item span'), s => s.textContent)`)
    const expectedIngredients = [...new Set(edited.flat().filter(Boolean))].map((id) => `Ingredient ${id.slice(4).replace('-', ' ')}`).sort()
    await check('shopping list contains exactly the edited menu ingredients, including the swapped recipe', () => {
      assert.equal(lines.length, expectedIngredients.length)
      for (const name of expectedIngredients) assert(lines.some((l) => l.includes(name)), name)
      assert(lines.some((l) => l.includes(`Ingredient ${swapped.to.slice(4).replace('-', ' ')}`)))
      assert(!lines.some((l) => l.includes(`Ingredient ${generated[1][1].slice(4).replace('-', ' ')}`)) || edited.flat().includes(generated[1][1]))
    })
    emit('accept persists the edited menu; reload and shopping list match it', { shoppingLines: lines.length })
    // E: initial generation with an invalid choice falls back to the local menu.
    const noticeText = "Here's a basic menu. You can review and change the dishes before saving."
    const notice = `Array.from(${preview}?.querySelectorAll('[role="status"]') ?? [], n => n.textContent).includes(${JSON.stringify(noticeText)})`
    const before = { acc: await accounting(), calls: (await transportLog()).length }
    await browser(['open', `${origin}/weekly-menu-planner?mock=decision-invalid`])
    await wait(ready)
    await clickGeneration()
    await wait(`${dialog} !== null`)
    await click('Confirm schedule and generate')
    await wait(`${preview} !== null && ${preview}.querySelector('select') !== null`)
    const fallback = await read()
    const flog = await transportLog()
    await check('local fallback preview shows the plain-language notice', async () => assert(await evaluate(notice)))
    await check('one guarded attempt, one transport call, lease released, nothing saved by preview', async () => {
      assert.deepEqual(await accounting(), { attempts: before.acc.attempts + 1, leases: 0 })
      assert.equal(flog.length, before.calls + 1)
      assert.equal(flog.at(-1).scenario, 'decision-invalid')
      assert.equal(flog.at(-1).selected, null)
      assert.deepEqual((await saved()).sort((a, b) => week.indexOf(a.day) - week.indexOf(b.day)).map((r) => [r.day, r.lunch_recipe_id, r.dinner_recipe_id]), rows.map((r) => [r.day, r.lunch_recipe_id, r.dinner_recipe_id]))
    })
    await check('fallback recipes come from the user catalog', () => {
      const ids = fallback.flat().filter(Boolean)
      assert(ids.length > 0)
      assert(ids.every((id) => /^dec-(lunch|dinner)-\d$/.test(id)))
    })
    await browser(['screenshot', `${stem}-local-fallback.png`])
    const fbSwap = await evaluate(`(() => {
      const select = ${preview}.querySelectorAll('.day-card')[2].querySelectorAll('select')[1]
      const next = Array.from(select.options).map(o => o.value).find(v => v && v !== select.value)
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, next)
      select.dispatchEvent(new Event('change', { bubbles: true }))
      return next
    })()`)
    await wait(`${preview}.querySelectorAll('.day-card')[2].querySelectorAll('select')[1].value === ${JSON.stringify(fbSwap)}`)
    const fbEdited = await read()
    await check('manual change keeps the notice', async () => assert(await evaluate(notice)))
    await click('Accept and save menu')
    await browser(['wait', '--text', 'Weekly Menu saved.'])
    await check('accept saves exactly the visible menu and the notice disappears', async () => {
      const saved2 = (await saved()).sort((a, b) => week.indexOf(a.day) - week.indexOf(b.day))
      assert.deepEqual(saved2.map((r) => [r.lunch_recipe_id, r.dinner_recipe_id]), fbEdited)
      assert.equal(await evaluate(`document.body.innerText.includes(${JSON.stringify(noticeText)})`), false)
    })
    emit('decision-invalid on initial generation: local basic menu with notice; one attempt; accept saves the visible menu')

    result = {
      scenario: 'decisions-real-stack-mock-transport',
      verdict: 'PASS',
      label: 'mock transport (in-process fake fetch); no live Gateway, no model-quality claim',
      input: { recipes: '9 lunch + 9 dinner synthetic with one ingredient each (+1 legacy lunch/dinner)', schedule: 'Monday office (lunch covered), other days both', engine: 'AI_WEEKLY_MENU_MOCK=true' },
      seed: 17,
      rubricVersion: 'weekly-menu-choice-v1',
      candidateCount: transport.candidateCount,
      selectedChoiceId: transport.choice,
      selectionSource: 'decision (mock transport)',
      invalidChoiceId: log[1].choice,
      manualChange: { day: 'Tuesday', slot: 'dinner', from: generated[1][1], to: swapped.to },
      attempts: 2,
      localFallback: { selectionSource: 'local (mock transport failure)', attempts: 1, transportCalls: 1, noticeVisible: true, manualChangeKeepsNotice: true },
      screenshots: shots.map((n) => `weekly-menu-decisions-results-${n}.png`),
    }
  } finally {
    await mkdir(dir, { recursive: true })
    await writeFile(`${stem}.json`, JSON.stringify({ ...result, assertions }, null, 2) + '\n')
  }
}
