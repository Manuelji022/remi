export default async function scenario({ assert, browser, evaluate, wait, click, open, accounting, saved, withRecipeTableHidden, emit, artifact }) {
  const preview = "document.querySelector('.planner-ai-preview')"
  const skeleton = "document.querySelector('.planner-ai-skeleton')"
  const dialog = "document.querySelector('dialog[aria-labelledby=\"ai-generation-title\"][open]')"
  async function generate(mock, first = false) {
    await open(mock)
    await browser(['click', '.planner-actions .planner-primary-btn'])
    await wait(`${dialog} !== null`)
    if (first) emit('authenticated planner: Generate opens schedule dialog')
    const start = Date.now()
    await click('Confirm schedule and generate')
    if (mock === 'ok') {
      await wait(`${skeleton} !== null && ${dialog} === null`)
      if (first) emit('confirmation closes dialog and displays skeleton')
      await wait(`${preview} !== null`)
      assert(Date.now() - start >= 1500)
      await wait(`${preview}.querySelector('.planner-primary-btn:not(:disabled)') !== null`)
    }
  }
  await generate('ok', true)
  const shown = await evaluate(`Array.from(${preview}.querySelectorAll('.day-card'), card => ({day:card.querySelector('.day-name').textContent, ids:Array.from(card.querySelectorAll('select'), s=>s.value || null), names:Array.from(card.querySelectorAll('.meal-name'), s=>s.textContent)}))`)
  assert.equal(shown.length, 7)
  assert(shown.every((day) => day.names.includes('Synthetic dinner') && day.names.includes('Synthetic lunch')))
  assert.deepEqual(await accounting(), { attempts: 1, leases: 0 })
  assert.deepEqual(await saved(), [])
  emit('mock ok waits 1.5s, consumes one attempt, releases lease, preview does not save', shown)
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
  await browser(['click', '.planner-actions .planner-primary-btn'])
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
  await browser(['click', '.planner-actions .planner-primary-btn'])
  await wait(`${dialog} !== null`)
  await click('Confirm schedule and generate')
  await browser(['wait', '--text', errors['rate-limited']])
  assert.deepEqual(await accounting(), { attempts: 5, leases: 0 })
  assert.deepEqual(await saved(), baseline)
  emit('sixth ok generation hits real rolling-hour DB limit; saved week unchanged')
}
