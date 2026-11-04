/* global browser, emit */
// Run through agent_browser_code with ai-weekly-menu.init.js loaded.
const base = 'http://127.0.0.1:3101'
const fixture = 'window.aiWeeklyMenuFixture'
const dialogSelector = 'dialog[aria-labelledby="ai-generation-title"]'
const dialog = `document.querySelector(${JSON.stringify(dialogSelector)})`
const previewSelector = '.planner-ai-preview'
const preview = `document.querySelector(${JSON.stringify(previewSelector)})`
const generateAnotherButton = `[...${preview}.querySelectorAll('.planner-ai-preview-actions button')].find(button => /Generate another|Generar otra/.test(button.textContent))`
const firstDayDinnerSelector = `${previewSelector} .delay-1 .meal-recipe-editor select[aria-label="Choose a saved dinner recipe"]`
const noticeDialog = `document.querySelector('dialog[aria-labelledby="ai-recipes-needed-title"]')`
const skeleton = `document.querySelector('.planner-ai-skeleton')`
const shell = 'document.querySelector(".planner-shell")'
const generationCount = `${fixture}.generationRequests.length`
const saveCount = `${fixture}.saveRequests.length`
const click = (name) => ['find', 'role', 'button', 'click', '--name', name, '--exact']
const wait = (condition) => ['wait', '--fn', condition]
const text = (value) => ['wait', '--text', value]
const waitPreviewAcceptable = () =>
  wait(`${preview} && !${preview}.querySelector('.planner-ai-preview-actions .planner-primary-btn').disabled`)
// CDP eval serializes the completion value; returning a React-owned DOM node can
// overflow its object graph. Harness steps are side effects/assertions, so return
// a JSON-safe scalar while allowing thrown assertion errors to propagate.
const evaluate = (source) => ['eval', `(() => { ${source}; return true })()`]
const evaluateAsync = (source) => ['eval', `(async () => { ${source}; return true })()`]
const open = (fixtureScenario, locale = '', mockScenario) => [
  'open',
  `${base}${locale}/weekly-menu-planner?scenario=${fixtureScenario}${mockScenario ? `&mock=${mockScenario}` : ''}`,
]
const assert = (condition, message) =>
  evaluate(`(() => {
    if (!(${condition})) throw new Error(${JSON.stringify(message)});
    return { verdict: 'PASS', check: ${JSON.stringify(message)} };
  })()`)

async function scenario(name, steps) {
  const segments = Array.isArray(steps[0]?.[0]) ? steps : [steps]
  const run = async (args, stdin) => {
    const result = await browser({ args, stdin, timeoutMs: 60000 })
    if (!result.success) {
      emit({ scenario: name, verdict: 'FAIL', error: result.error, data: result.data })
      throw new Error(name)
    }
  }
  for (const segment of segments) {
    let commands = []
    const flush = async () => {
      if (commands.length === 0) return
      await run(['batch', '--bail'], JSON.stringify(commands))
      commands = []
    }
    for (const step of segment) {
      if (step[0] === 'back') {
        await flush()
        await run(['back'])
        await run(['get', 'url'])
        await run(['snapshot', '-i'])
        continue
      }
      if (step[0] === 'find' && step.includes('Confirm schedule and generate')) {
        commands.push(['wait', '--text', 'Review next week’s schedule'], step)
      } else if (['click', 'select'].includes(step[0])) {
        commands.push(['scrollintoview', step[1]], step)
      } else {
        commands.push(...(['eval', 'open'].includes(step[0]) ? [step, ['get', 'url']] : [step]))
      }
    }
    await flush()
  }
  emit({ scenario: name, verdict: 'PASS' })
}

await scenario('schedule dialog contains keyboard focus and Escape restores its opener', [
  open('ready'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  evaluate(`window.__dialogOpener = [...document.querySelectorAll('button')].find(button => button.textContent.trim()==='Regenerate menu')`),
  click('Regenerate menu'),
  text("Review next week’s schedule"),
  ['press', 'Tab'],
  assert(`${dialog} && ${dialog}.contains(document.activeElement)`, 'keyboard Tab remains inside the schedule dialog'),
  ['press', 'Shift+Tab'],
  assert(`${dialog} && ${dialog}.contains(document.activeElement)`, 'keyboard Shift+Tab remains inside the schedule dialog'),
  ['press', 'Escape'],
  assert(`!${dialog} && document.activeElement===window.__dialogOpener`, 'Escape closes schedule dialog and restores focus to the exact opener element'),
])

await scenario('schedule preparation retains the opener for Escape focus restoration', [
  open('ready'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  evaluate(`window.__dialogOpener = [...document.querySelectorAll('button')].find(button => button.textContent.trim()==='Regenerate menu'); ${fixture}.holdTargetLoad=true`),
  click('Regenerate menu'),
  wait(`${fixture}.pendingTargetLoad`),
  assert(`!${dialog} && window.__dialogOpener.disabled`, 'the dialog opener becomes disabled while schedule preparation is pending'),
  evaluate(`${fixture}.releaseTargetLoad()`),
  text("Review next week’s schedule"),
  ['press', 'Escape'],
  assert(`!${dialog} && document.activeElement===window.__dialogOpener`, 'Escape restores focus to the exact opener after asynchronous preparation'),
])

await scenario('generation retry restores Escape focus to the stable schedule header trigger', [
  open('ready'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  evaluate(`window.__stableScheduleTarget = [...document.querySelectorAll('.planner-actions button')].find(button => button.textContent.includes('Regenerate menu')); ${fixture}.failGeneration=true`),
  click('Regenerate menu'),
  click('Confirm schedule and generate'),
  text('Could not generate next week’s menu'),
  wait(`document.querySelector('[role="alert"] .planner-secondary-btn') && !document.querySelector('[role="alert"] .planner-secondary-btn').disabled`),
  evaluate(`${fixture}.failGeneration=false; window.__retryTrigger = document.querySelector('[role="alert"] .planner-secondary-btn')`),
  click('Retry generation'),
  text("Review next week’s schedule"),
  assert(`!window.__retryTrigger.isConnected && ${dialog}`, 'retry trigger is removed while its schedule dialog is open'),
  ['press', 'Escape'],
  assert(`!${dialog} && document.activeElement===window.__stableScheduleTarget`, 'Escape returns focus to the stable schedule header trigger, not the removed retry trigger'),
])

await scenario('schedule confirmation is required; accept alone persists next week', [
  open('ready'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  click('Regenerate menu'),
  text("Review next week’s schedule"),
  assert(
    `${dialog} && ${dialog}.querySelectorAll('.panel-day-card').length===7 && ${generationCount}===0 && ${saveCount}===0`,
    'all seven days require explicit confirmation before network generation',
  ),
  click('Confirm schedule and generate'),
  wait(`${preview} !== null`),
  assert(
    `${fixture}.generationRequests.length===1 && ${fixture}.saveRequests.length===0 && ${preview}.querySelectorAll('.day-card').length===7 && JSON.stringify(${fixture}.generationRequests[0].payload).includes(${fixture}.targetWeekStart)`,

    'fresh complete preview targets next week and does not save',
  ),
  assert(
    `!JSON.stringify(${fixture}.generationRequests[0].payload).includes(${fixture}.userId) && JSON.stringify(${fixture}.generationRequests[0].payload).includes(Intl.DateTimeFormat().resolvedOptions().timeZone)`,
    'client request contains its IANA calendar timezone but no account identity',
  ),
  wait(`${preview}.querySelector(${JSON.stringify(firstDayDinnerSelector)}) !== null`),
  ['select', firstDayDinnerSelector, 'saved-dinner-alternative'],
  assert(
    `${preview}.querySelector(${JSON.stringify(firstDayDinnerSelector)}).value==='saved-dinner-alternative' && ${preview}.querySelector('.delay-1 .meal-slot:nth-child(2) .meal-name').textContent==='Mushroom barley bowl'`,
    'preview assignments can be manually changed in the first day dinner slot to an owned dinner recipe',
  ),
  waitPreviewAcceptable(),
  click('Accept and save menu'),
  text('Weekly Menu saved.'),
  assert(
    `${fixture}.saveRequests.length===1 && JSON.stringify(${fixture}.saveRequests[0].payload).includes(${fixture}.targetWeekStart) && JSON.stringify(${fixture}.saveRequests[0].payload).includes('saved-dinner-alternative')`,

    'explicit acceptance is the first persistence request and saves next week',
  ),
])

await scenario('accept waits for the saved target menu and owned recipe catalog', [
  open('ready'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  click('Regenerate menu'),
  text("Review next week’s schedule"),
  evaluate(`${fixture}.holdTargetLoad=true`),
  click('Confirm schedule and generate'),
  wait(`${preview} !== null && ${fixture}.pendingTargetLoad`),
  assert(
    `${preview}.querySelector('.planner-ai-preview-actions .planner-primary-btn').disabled && ${saveCount}===0`,
    'acceptance remains disabled while the target week and catalog are loading',
  ),
  evaluate(`(() => { ${fixture}.holdTargetLoad=false; ${fixture}.releaseTargetLoad(); return true })()`),
  waitPreviewAcceptable(),
  click('Accept and save menu'),
  text('Weekly Menu saved.'),
  assert(`${saveCount}===1`, 'the preview is accepted after its target recipe catalog is ready'),
])

await scenario('an unsaved target schedule starts all-at-home, not from current week', [
  open('ready'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  assert(`${shell}.querySelector('.day-context-badge')?.textContent==='Office'`, 'current week fixture has Office context'),
  click('Regenerate menu'),
  text("Review next week’s schedule"),
  assert(
    `${dialog}.querySelector('.panel-day-card:first-child .panel-context-pill[aria-pressed="true"]')===null`,
    'unsaved next week does not inherit current week Office schedule',
  ),
  assert(
    `${dialog}.querySelectorAll('.panel-day-card .panel-context-pill[aria-pressed="true"]').length===0`,
    'unsaved next week begins with no Office or Eat Out days',
  ),
  ['click', `${dialogSelector} .panel-day-card:first-child .panel-context-pill:first-child`],
  assert(
    `${dialog}.querySelector('.panel-day-card:first-child .panel-context-pill:first-child').getAttribute('aria-pressed')==='true' && ${dialog}.querySelector('.panel-day-card:first-child .panel-scope-pill[aria-pressed="true"]').textContent.includes('Dinner')`,
    'Office covers lunch and leaves Dinner planned at home',
  ),
  ['click', `${dialogSelector} .panel-day-card:nth-child(2) .panel-context-pill:nth-child(2)`],
  wait(`${dialog}.querySelector('.panel-day-card:nth-child(2) .panel-context-pill:nth-child(2)').getAttribute('aria-pressed')==='true'`),
  ['click', `${dialogSelector} .panel-day-card:nth-child(2) .panel-scope-pill:nth-child(2)`],
  assert(
    `${dialog}.querySelector('.panel-day-card:nth-child(2) .panel-context-pill[aria-pressed="true"]').textContent.includes('Eat out') && ${dialog}.querySelector('.panel-day-card:nth-child(2) .panel-scope-pill[aria-pressed="true"]').textContent.includes('Dinner')`,
    'Eat Out keeps the chosen home planning scope without packed-lunch behavior',
  ),
  click('Cancel'),
  assert(`${generationCount}===0 && ${saveCount}===0`, 'cancelling schedule confirmation sends no requests'),
])

await scenario('saved target-week schedule is prefilled for all seven-day confirmation', [
  open('target-saved'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  click('Regenerate menu'),
  text("Review next week’s schedule"),
  assert(
    `${dialog}.querySelector('.panel-day-card:first-child .panel-context-pill[aria-pressed="true"]')?.textContent.includes('Office') && ${dialog}.querySelector('.panel-day-card:nth-child(2) .panel-context-pill[aria-pressed="true"]')?.textContent.includes('Eat out') && ${dialog}.querySelector('.panel-day-card:nth-child(2) .panel-scope-pill[aria-pressed="true"]')?.textContent.includes('Lunch')`,
    'target week schedule, including Eat Out home scope, is prefilled from target week only',
  ),
  assert(`${generationCount}===0 && ${saveCount}===0`, 'opening confirmation itself does not generate or persist'),
])

await scenario('discard and edit schedule guard the fresh preview', [
  open('ready'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  click('Regenerate menu'),
  click('Confirm schedule and generate'),
  wait(`${preview} !== null`),
  click('Discard preview'),
  text('Discard this generated preview?'),
  assert(`${preview} !== null && ${saveCount}===0`, 'discard warning keeps preview and saved menu'),
  click('Keep preview'),
  waitPreviewAcceptable(),
  ['select', firstDayDinnerSelector, 'saved-dinner-alternative'],
  assert(
    `${preview}.querySelector(${JSON.stringify(firstDayDinnerSelector)}).value==='saved-dinner-alternative'`,
    'manual recipe swap is in place before schedule edits',
  ),
  click('Edit target schedule'),
  text("Review next week’s schedule"),
  ['click', `${dialogSelector} .panel-day-card:first-child .panel-context-pill:first-child`],
  assert(`${preview}===null && ${generationCount}===1 && ${saveCount}===0`, 'changing the schedule hides the stale preview without saving'),
  click('Cancel'),
  assert(
    `${preview}!==null && ${preview}.querySelector(${JSON.stringify(firstDayDinnerSelector)}).value==='saved-dinner-alternative' && ${saveCount}===0`,
    'cancel restores the preview with its manual recipe swap and does not save',
  ),
  click('Edit target schedule'),
  text("Review next week’s schedule"),
  ['click', `${dialogSelector} .panel-day-card:first-child .panel-context-pill:first-child`],
  assert(`${preview}===null && ${generationCount}===1 && ${saveCount}===0`, 'schedule edit invalidates stale preview without saving'),
  evaluate(`${fixture}.failGeneration=true`),
  click('Confirm schedule and generate'),
  text('Could not generate next week’s menu'),
  assert(`${preview}===null && ${generationCount}===2 && ${saveCount}===0`, 'failed changed-schedule regeneration never restores the stale preview'),
  evaluate(`${fixture}.failGeneration=false`),
  click('Retry generation'),
  text("Review next week’s schedule"),
  click('Confirm schedule and generate'),
  wait(`${preview} !== null && ${generationCount}===3`),
  click('Discard preview'),
  click('Discard generated preview'),
  assert(`${preview}===null && ${saveCount}===0`, 'confirmed discard removes preview without persistence'),
])

await scenario('route navigation protects a preview stashed by schedule editing', [
  open('target-saved'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  evaluateAsync(`
    const waitFor = (label, predicate) => new Promise((resolve, reject) => {
      const started = Date.now()
      const poll = () => {
        if (predicate()) resolve()
        else if (Date.now() - started > 12000) reject(new Error('timed out waiting for ' + label))
        else setTimeout(poll, 25)
      }
      poll()
    })
    const button = (name) => {
      const node = [...document.querySelectorAll('button')].find((item) => item.textContent.trim() === name)
      if (!node) throw new Error('missing button ' + name)
      node.click()
    }
    const link = (name) => {
      const node = name === 'Remi home'
        ? document.querySelector('a[aria-label="Remi home"]')
        : [...document.querySelectorAll('a')].find((item) => item.textContent.trim() === name)
      if (!node) throw new Error('missing link ' + name)
      node.click()
    }
    await waitFor('saved menu', () => ${shell}?.innerText.includes('Saved dinner'))
    button('Regenerate menu')
    await waitFor('schedule dialog', () => ${dialog}?.open)
    button('Confirm schedule and generate')
    await waitFor('preview', () => Boolean(${preview}))
    const dinner = ${preview}?.querySelector(${JSON.stringify(firstDayDinnerSelector)})
    if (!dinner) throw new Error('missing dinner selector')
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(dinner, 'saved-dinner-alternative')
    dinner.dispatchEvent(new Event('change', { bubbles: true }))
    button('Edit target schedule')
    await waitFor('edit schedule dialog', () => ${dialog}?.open)
    const context = ${dialog}?.querySelector('.panel-day-card:first-child .panel-context-pill:first-child')
    if (!context) throw new Error('missing schedule context')
    context.click()
    await waitFor('preview invalidation', () => !${preview})
    link('Remi home')
    await waitFor('discard confirmation', () => document.querySelector('dialog[aria-labelledby="ai-preview-discard-title"]')?.open)
    if (!${dialog} || ${preview}) throw new Error('schedule edit state was not preserved')
    button('Discard generated preview')
    await waitFor('home route', () => location.pathname === '/')
    link('Weekly menu')
    await waitFor('planner route', () => location.pathname.endsWith('/weekly-menu-planner'))
    await waitFor('clean state', () => !${preview} && !${dialog} && !document.querySelector('dialog[aria-labelledby="ai-preview-discard-title"]'))
  `),
  ['snapshot', '-i'],
])

await scenario('unchanged selected scope and failed regeneration preserve manual edits', [
  open('ready'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  click('Regenerate menu'),
  click('Confirm schedule and generate'),
  wait(`${preview} !== null`),
  waitPreviewAcceptable(),
  ['select', firstDayDinnerSelector, 'saved-dinner-alternative'],
  click('Edit target schedule'),
  text('Review next week’s schedule'),
  ['click', `${dialogSelector} .panel-day-card:first-child .panel-scope-pill[aria-pressed="true"]`],
  click('Cancel'),
  assert(`${preview}?.querySelector(${JSON.stringify(firstDayDinnerSelector)}).value==='saved-dinner-alternative'`, 'selecting the effective scope and cancelling retains manual edits'),
  click('Edit target schedule'),
  evaluate(`${fixture}.failGeneration=true`),
  click('Confirm schedule and generate'),
  text('Could not generate next week’s menu'),
  assert(`${preview}?.querySelector(${JSON.stringify(firstDayDinnerSelector)}).value==='saved-dinner-alternative'`, 'failed unchanged regeneration retains manual edits'),
  waitPreviewAcceptable(),
  click('Accept and save menu'),
  text('Weekly Menu saved.'),
])

for (const fail of [false, true]) {
  await scenario(`route discard is blocked while acceptance settles (failure=${fail})`, [
    open('ready'),
    wait(`${shell}.innerText.includes('Saved dinner')`),
    click('Regenerate menu'),
    click('Confirm schedule and generate'),
    wait(`${preview} !== null`),
    waitPreviewAcceptable(),
    evaluate(`${fixture}.holdSave=true; ${fixture}.failSave=${fail}`),
    click('Accept and save menu'),
    wait(`${fixture}.pendingSave`),
    ['find', 'role', 'link', 'click', '--name', 'Remi home', '--exact'],
    text('Wait for saving to finish before leaving or discarding this preview.'),
    assert(`document.querySelector('dialog[aria-labelledby="ai-preview-discard-title"] .panel-primary-btn').disabled`, 'Discard cannot proceed during acceptance'),
    ['press', 'Escape'],
    assert(`!document.querySelector('dialog[aria-labelledby="ai-preview-discard-title"]') && location.pathname.endsWith('/weekly-menu-planner')`, 'Escape cancels navigation during acceptance'),
    ['find', 'role', 'link', 'click', '--name', 'Remi home', '--exact'],
    click('Keep preview'),
    assert(`location.pathname.endsWith('/weekly-menu-planner') && ${preview}!==null`, 'Keep cancels navigation and retains pending preview'),
    ['find', 'role', 'link', 'click', '--name', 'Remi home', '--exact'],
    text('Wait for saving to finish before leaving or discarding this preview.'),
    evaluate(`document.querySelector('dialog[aria-labelledby="ai-preview-discard-title"] .panel-primary-btn').click()`),
    assert(`location.pathname.endsWith('/weekly-menu-planner') && ${preview}!==null`, 'disabled Discard does not navigate or remove the saving preview'),
    evaluate(`(() => { ${fixture}.holdSave=false; ${fixture}.releaseSave(); return true })()`),
    text(fail ? 'Could not confirm the preview was saved.' : 'Weekly Menu saved.'),
    assert(fail ? `${preview}!==null && !document.querySelector('dialog[aria-labelledby="ai-preview-discard-title"] .panel-primary-btn').disabled` : `${preview}===null && !document.querySelector('dialog[aria-labelledby="ai-preview-discard-title"]')`, 'failure retains preview and enables explicit discard; success cancels pending navigation'),
    ...(fail ? [click('Discard generated preview'), ['wait', '--url', `${base}/`]] : [
      ['find', 'role', 'link', 'click', '--name', 'Remi home', '--exact'],
      ['wait', '--url', `${base}/`],
    ]),
  ])
}

await scenario('same-target retry retains the confirmed draft schedule after provider failure', [
  open('ready'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  click('Regenerate menu'),
  text("Review next week’s schedule"),
  ['click', `${dialogSelector} .panel-day-card:first-child .panel-context-pill:first-child`],
  evaluate(`${fixture}.failGeneration=true`),
  click('Confirm schedule and generate'),
  text('Could not generate next week’s menu'),
  assert(
    `${preview}===null && ${shell}.innerText.includes('Saved dinner') && ${generationCount}===1 && ${saveCount}===0`,
    'provider error preserves saved menu and never persists a fallback',
  ),
  evaluate(`${fixture}.failGeneration=false`),
  click('Retry generation'),
  text("Review next week’s schedule"),
  assert(
    `${generationCount}===1 && ${dialog}.querySelector('.panel-day-card:first-child .panel-context-pill[aria-pressed="true"]').textContent.includes('Office')`,
    'same-target retry preserves the confirmed draft schedule and still requires confirmation',
  ),
  click('Confirm schedule and generate'),
  wait(`${preview} !== null && ${generationCount}===2`),
  assert(`${saveCount}===0`, 'confirmed retry returns a preview and still waits for acceptance'),
])

for (const reason of ['in-progress']) {
  await scenario(`${reason} retry keeps the confirmed schedule draft`, [
    open('ready'),
    wait(`${shell}.innerText.includes('Saved dinner')`),
    click('Regenerate menu'),
    text('Review next week’s schedule'),
    ['click', `${dialogSelector} .panel-day-card:first-child .panel-context-pill:first-child`],
    evaluate(`${fixture}.generationRejection=${JSON.stringify(reason)}`),
    click('Confirm schedule and generate'),
    wait(`document.querySelector('[role="alert"] .planner-secondary-btn') && !document.querySelector('[role="alert"] .planner-secondary-btn').disabled`),
    click('Retry generation'),
    text('Review next week’s schedule'),
    assert(`${dialog}.querySelector('.panel-day-card:first-child .panel-context-pill[aria-pressed="true"]')?.textContent.includes('Office')`, 'non-stale rejection retry retains Office draft'),
    click('Cancel'),
  ])
}

await scenario('retry after a failed generation across Monday loads the new target schedule', [
  open('retry-rollover'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  click('Regenerate menu'),
  text("Review next week’s schedule"),
  ['click', `${dialogSelector} .panel-day-card:first-child .panel-context-pill:first-child`],
  evaluate(`${fixture}.failGeneration=true`),
  click('Confirm schedule and generate'),
  text('Could not generate next week’s menu'),
  assert(`${fixture}.retryRolledOver && ${generationCount}===1`, 'ordinary generation failure arrived after the controlled Sunday-to-Monday rollover'),
  wait(`document.querySelector('[role="alert"] .planner-secondary-btn') && !document.querySelector('[role="alert"] .planner-secondary-btn').disabled`),
  evaluate(`${fixture}.failGeneration=false`),
  click('Retry generation'),
  text("Review next week’s schedule"),
  assert(
    `${dialog}.querySelector('.panel-day-card:first-child .panel-context-pill[aria-pressed="true"]')===null && ${dialog}.querySelector('.panel-day-card:nth-child(2) .panel-context-pill[aria-pressed="true"]')?.textContent.includes('Eat out') && ${dialog}.querySelector('.panel-day-card:nth-child(2) .panel-scope-pill[aria-pressed="true"]')?.textContent.includes('Lunch')`,
    'retry uses the newly targeted saved schedule instead of the prior target draft',
  ),
  assert(
    `${fixture}.reads.some(read=>read.kind==='load' && read.weekStart===${fixture}.expectedAfterRollover)`,
    'the rolled-over retry loaded its actual new target week',
  ),
  click('Cancel'),
  assert(`${generationCount}===1 && ${saveCount}===0`, 'retry schedule confirmation does not generate or save until confirmed'),
])

await scenario('recipe edits are disabled and ignored while acceptance save is pending', [
  open('ready'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  click('Regenerate menu'),
  click('Confirm schedule and generate'),
  wait(`${preview} !== null`),
  waitPreviewAcceptable(),
  evaluate(`${fixture}.holdSave=true; ${fixture}.failSave=true`),
  click('Accept and save menu'),
  wait(`${fixture}.pendingSave`),
  assert(
    `${preview}.querySelector(${JSON.stringify(firstDayDinnerSelector)}).disabled && ${saveCount}===1`,
    'all preview recipe controls disable synchronously while acceptance is pending',
  ),
  evaluate(`(() => {
    const select = document.querySelector(${JSON.stringify(firstDayDinnerSelector)});
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    setter.call(select, 'saved-dinner-alternative');
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`),
  evaluate(`(() => { ${fixture}.holdSave=false; ${fixture}.releaseSave(); return true })()`),
  text('Could not confirm the preview was saved.'),
  assert(
    `${preview}.querySelector(${JSON.stringify(firstDayDinnerSelector)}).value==='saved-dinner' && !JSON.stringify(${fixture}.saveRequests[0].payload).includes('saved-dinner-alternative')`,
    'pending-save change events cannot mutate the accepted menu snapshot or retained preview',
  ),
  evaluate(`${fixture}.failSave=false`),
  click('Retry saving menu'),
  text('Weekly Menu saved.'),
  assert(
    `${preview}===null && !JSON.stringify(${fixture}.saveRequests[1].payload).includes('saved-dinner-alternative')`,
    'retry persists the retained accepted state and discards no user edit',
  ),
])

await scenario('a successful Sunday preview remains editable and acceptable after Monday', [
  open('preview-rollover'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  click('Regenerate menu'),
  click('Confirm schedule and generate'),
  wait(`${preview} !== null`),
  waitPreviewAcceptable(),
  assert(`new Date().getDay()===0`, 'the successful preview arrives while the browser still sees Sunday'),
  evaluate(`${fixture}.advanceClock(2 * 60 * 1000)`),
  assert(`new Date().getDay()===1`, 'the browser clock crosses into Monday while preview is open'),
  ['select', firstDayDinnerSelector, 'saved-dinner-alternative'],
  waitPreviewAcceptable(),
  assert(
    `${preview}.querySelector(${JSON.stringify(firstDayDinnerSelector)}).value==='saved-dinner-alternative'`,
    'the absolute preview week remains loaded, editable, and acceptable after rollover',
  ),
  click('Accept and save menu'),
  text('Weekly Menu saved.'),
  assert(
    `${fixture}.saveRequests.length===1 && JSON.stringify(${fixture}.saveRequests[0].payload).includes(${fixture}.targetWeekStart) && JSON.stringify(${fixture}.saveRequests[0].payload).includes('saved-dinner-alternative')`,
    'acceptance persists the rolled-over preview week and edited dinner slot',
  ),
])

await scenario('editing a Sunday preview after Monday preserves its absolute target week', [
  open('preview-rollover'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  click('Regenerate menu'),
  click('Confirm schedule and generate'),
  wait(`${preview} !== null`),
  evaluate(`${fixture}.advanceClock(2 * 60 * 1000)`),
  assert(`new Date().getDay()===1`, 'the preview is now past the Sunday-to-Monday rollover'),
  click('Edit target schedule'),
  text("Review next week’s schedule"),
  assert(
    `${dialog} && ${dialog}.querySelectorAll('.panel-day-card').length===7 && ${saveCount}===0`,
    'editing the preview still requires explicit confirmation and never saves',
  ),
  click('Confirm schedule and generate'),
  text('The Calendar Week changed.'),
  assert(`${fixture}.generationRequests[1].weekStart===${fixture}.targetWeekStart && ${preview}!==null && ${saveCount}===0`, 'stale regeneration requests the original absolute week and retains its saveable preview'),
  waitPreviewAcceptable(),
  click('Accept and save menu'),
  text('Weekly Menu saved.'),
])

await scenario('provider completion after Monday returns stale-week instead of preview success', [
  open('provider-rollover'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  click('Regenerate menu'),
  text("Review next week’s schedule"),
  evaluate(`${fixture}.holdGeneration=true`),
  click('Confirm schedule and generate'),
  wait(`${fixture}.pendingGeneration && ${fixture}.providerStarted`),
  assert(
    `${fixture}.generationRequests.length===1 && ${fixture}.generationRequests[0].weekStart===${fixture}.targetWeekStart`,
    'the generation request starts against the Sunday-derived next week',
  ),
  evaluate(`(() => { ${fixture}.holdGeneration=false; ${fixture}.releaseGeneration(); return true })()`),
  text('The Calendar Week changed.'),
  assert(
    `${fixture}.mockProviderCompleted && new Date().getDay()===1 && ${preview}===null && ${saveCount}===0`,
    'mock provider work completes on Monday and the post-provider stale check blocks a preview',
  ),
])

await scenario('a week rollover returns an explicit reconfirmation target', [
  open('stale'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  click('Regenerate menu'),
  click('Confirm schedule and generate'),
  text('The Calendar Week changed.'),
  assert(`${preview}===null && ${saveCount}===0 && ${generationCount}===1`, 'stale target is rejected without preview or save'),
  wait(`document.querySelector('[role="alert"] .planner-secondary-btn') && !document.querySelector('[role="alert"] .planner-secondary-btn').disabled`),
  click('Review schedule and retry'),
  text("Review next week’s schedule"),
  assert(
    `${fixture}.reads.some(read=>read.kind==='load' && read.weekStart===${fixture}.expectedAfterRollover)`,
    'reconfirmation reloads the server-derived next Calendar Week schedule',
  ),
  click('Confirm schedule and generate'),
  wait(`${preview} !== null && ${generationCount}===2`),
  assert(
    `JSON.stringify(${fixture}.generationRequests[1].payload).includes(${fixture}.expectedAfterRollover) && ${saveCount}===0`,
    'freshly confirmed rollover target generates a preview only',
  ),
])

await scenario('failed acceptance keeps the preview and saved target menu retryable', [
  open('target-saved'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  click('Regenerate menu'),
  click('Confirm schedule and generate'),
  wait(`${preview} !== null`),
  waitPreviewAcceptable(),
  evaluate(`${fixture}.failSave=true`),
  click('Accept and save menu'),
  text('Could not confirm the preview was saved.'),
  assert(`${preview} !== null && ${saveCount}===1`, 'failed acceptance leaves the replacement preview in place'),
  assert(
    `${preview}.innerText.includes('The save result is unconfirmed, so your saved menu may have changed. Reload to check before retrying.') && !${preview}.innerText.includes('Your saved menu has not changed.')`,
    'preview communicates that the save may have changed the saved menu and requires reload before retrying',
  ),
  click('Discard preview'),
  text('The save result is unconfirmed. Your saved menu may have changed. Reload to check before discarding this preview.'),
  click('Keep preview'),
  evaluate(`${fixture}.failSave=false`),
  click('Retry saving menu'),
  text('Weekly Menu saved.'),
  assert(`${preview}===null && ${saveCount}===2`, 'acceptance retry persists only after success'),
])

await scenario('empty catalog shows the recipes-needed notice and never generates', [
  open('empty-catalog'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  evaluate(`window.__noticeOpener = [...document.querySelectorAll('button')].find(button => button.textContent.trim()==='Regenerate menu')`),
  click('Regenerate menu'),
  text('Add recipes first'),
  assert(
    `${noticeDialog} && !${dialog} && ${generationCount}===0 && ${saveCount}===0`,
    'zero recipes show the notice instead of the schedule dialog and record no generation request',
  ),
  click('Close'),
  assert(`!${noticeDialog} && document.activeElement===window.__noticeOpener`, 'closing the notice returns focus to the opener'),
  click('Regenerate menu'),
  text('Add recipes first'),
  click('Add recipes'),
  wait(`document.querySelector('#preferences-recipes-tab[aria-selected="true"]') !== null`),
  assert(`!${noticeDialog} && !${dialog} && ${generationCount}===0`, 'Add recipes opens Preferences on the recipes section'),
])

await scenario('partial catalog blocks only the missing type, per confirmed schedule', [
  open('partial-catalog'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  click('Regenerate menu'),
  text("Review next week’s schedule"),
  click('Confirm schedule and generate'),
  wait(`${dialog}.querySelector('[role="alert"]') !== null`),
  assert(
    `${dialog}.querySelector('[role="alert"]').innerText.includes('dinner recipes') && !${dialog}.querySelector('[role="alert"]').innerText.includes('lunch recipes') && ${generationCount}===0 && ${skeleton}===null`,
    'all-home schedule keeps the dialog open with an alert naming only dinner and records no generation request',
  ),
  ...[1, 2, 3, 4, 5, 6, 7].flatMap((n) => [
    ['click', `${dialogSelector} .panel-day-card:nth-child(${n}) .panel-context-pill:nth-child(2)`],
    ['click', `${dialogSelector} .panel-day-card:nth-child(${n}) .panel-scope-pill:nth-child(1)`],
  ]),
  assert(`!${dialog}.querySelector('[role="alert"]')`, 'editing the schedule clears the alert'),
  click('Confirm schedule and generate'),
  wait(`${preview} !== null`),
  assert(
    `${generationCount}===1 && Object.values(${fixture}.generationRequests[0].schedule).every(day => day.scope==='lunch') && ${saveCount}===0`,
    'with every dinner eaten out the same catalog generates one request',
  ),
])

await scenario('partial catalog alert offers Add recipes', [
  open('partial-catalog'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  click('Regenerate menu'),
  click('Confirm schedule and generate'),
  wait(`${dialog}.querySelector('[role="alert"]') !== null`),
  click('Add recipes'),
  wait(`document.querySelector('#preferences-recipes-tab[aria-selected="true"]') !== null`),
  assert(`!${dialog} && ${generationCount}===0`, 'inline Add recipes closes the dialog and opens the recipes section'),
])

await scenario('confirming closes the dialog and shows a target-week skeleton until the preview replaces it', [
  open('ready'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  click('Regenerate menu'),
  text("Review next week’s schedule"),
  evaluate(`${fixture}.holdGeneration=true`),
  click('Confirm schedule and generate'),
  wait(`${fixture}.pendingGeneration`),
  assert(`!${dialog} && ${skeleton} !== null`, 'dialog is closed and the skeleton is visible while generation is held'),
  assert(
    `${skeleton}.getAttribute('role')==='status' && ${skeleton}.getAttribute('aria-live')==='polite' && ${skeleton}.getAttribute('aria-busy')==='true' && ${skeleton}.innerText.includes('Building next week’s menu…') && ${skeleton}.querySelectorAll('.day-card').length===7 && document.querySelectorAll('.planner-ai-skeleton').length===1`,
    'skeleton is one polite busy status region with the label and seven day cards',
  ),
  assert(
    `![...${shell}.querySelectorAll('button')].some(button => /Accept|Discard|Edit target/.test(button.textContent)) && ${preview}===null && !${shell}.querySelector('.planner-current-week-label') && ${shell}.querySelector('button[aria-label="Next week"]').disabled`,
    'no preview actions are reachable and the planner shows the target (next) week',
  ),
  evaluate(`${fixture}.holdGeneration=false; ${fixture}.releaseGeneration()`),
  wait(`${shell}.querySelector('.planner-ai-preview-actions') !== null`),
  assert(`${skeleton}===null && ${preview}.querySelectorAll('.day-card').length===7 && ${generationCount}===1 && ${saveCount}===0`, 'the skeleton is replaced by the editable preview'),
])

await scenario('skeleton is replaced by the existing error and Retry on failure', [
  open('ready'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  click('Regenerate menu'),
  text("Review next week’s schedule"),
  evaluate(`${fixture}.holdGeneration=true; ${fixture}.failGeneration=true`),
  click('Confirm schedule and generate'),
  wait(`${fixture}.pendingGeneration && ${skeleton} !== null`),
  evaluate(`${fixture}.holdGeneration=false; ${fixture}.releaseGeneration()`),
  text('Could not generate next week’s menu'),
  assert(
    `${skeleton}===null && ${preview}===null && !${dialog} && [...document.querySelectorAll('button')].some(button => button.textContent.trim()==='Retry generation') && ${saveCount}===0`,
    'failure removes the skeleton and leaves error feedback with Retry',
  ),
])

await scenario('regenerating from an edited preview shows the skeleton, not the stale preview', [
  open('ready'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  click('Regenerate menu'),
  click('Confirm schedule and generate'),
  wait(`${preview} !== null`),
  click('Edit target schedule'),
  text("Review next week’s schedule"),
  evaluate(`[...${dialog}.querySelector('.panel-day-card').querySelectorAll('.panel-context-pill')].find(pill => pill.textContent.includes('Office')).click(); ${fixture}.holdGeneration=true`),
  click('Confirm schedule and generate'),
  wait(`${fixture}.pendingGeneration`),
  assert(
    `!${dialog} && ${skeleton} !== null && !${shell}.querySelector('.planner-ai-preview-menu') && ![...${shell}.querySelectorAll('button')].some(button => /Accept|Discard|Edit target/.test(button.textContent))`,
    'edited-schedule regeneration hides the stale preview behind the skeleton',
  ),
  evaluate(`${fixture}.holdGeneration=false; ${fixture}.releaseGeneration()`),
  wait(`${shell}.querySelector('.planner-ai-preview-menu') !== null`),
  assert(`${skeleton}===null && ${generationCount}===2`, 'the regenerated preview replaces the skeleton'),
])

await scenario('schedule load failure and Cancel never show a skeleton', [
  open('ready'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  click('Regenerate menu'),
  text("Review next week’s schedule"),
  assert(`${skeleton}===null`, 'no skeleton while the schedule dialog is open'),
  click('Cancel'),
  assert(`${skeleton}===null && !${dialog} && ${generationCount}===0`, 'Cancel leaves no skeleton and no request'),
])

await scenario('AI schedule and preview feedback are localized in Spanish', [
  open('ready', '/es'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  click('Regenerar menú'),
  text('Revisa la agenda de la próxima semana'),
  click('Confirmar agenda y generar'),
  wait(`${preview} !== null`),
  assert(
    `${preview}.innerText.includes('Vista previa del Menú Semanal con IA') && ${saveCount}===0`,
    'Spanish schedule confirmation produces an unsaved localized preview',
  ),
  assert(`${generateAnotherButton} !== null && ${generateAnotherButton}.textContent.includes('Generar otra')`, 'the Generar otra button is localized'),
  click('Descartar vista previa'),
  text('¿Descartar esta vista previa generada?'),
  click('Descartar la vista previa generada'),
  assert(`${preview}===null && ${saveCount}===0`, 'Spanish discard confirmation keeps saved data untouched'),
])

await scenario('URL mock error is serialized on generation and retry', [
  open('ready', '', 'error'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  click('Regenerate menu'),
  click('Confirm schedule and generate'),
  text('Could not generate next week’s menu'),
  assert(`${generationCount}===1 && ${fixture}.generationRequests[0].mockScenario==='error' && ${saveCount}===0`, 'decoded generation request carries URL-selected error scenario'),
  wait(`document.querySelector('[role="alert"] .planner-secondary-btn') && !document.querySelector('[role="alert"] .planner-secondary-btn').disabled`),
  click('Retry generation'),
  click('Confirm schedule and generate'),
  text('Could not generate next week’s menu'),
  assert(`${generationCount}===2 && ${fixture}.generationRequests[1].mockScenario==='error' && ${saveCount}===0`, 'retry serializes the same URL-selected error scenario'),
])

await scenario('invalid URL mock value is omitted from generation', [
  open('ready', '', 'nope'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  click('Regenerate menu'),
  click('Confirm schedule and generate'),
  wait(`${preview} !== null`),
  assert(`${generationCount}===1 && !JSON.stringify(${fixture}.generationRequests[0].payload).includes('mockScenario') && ${saveCount}===0`, 'invalid mock URL does not crash or send mockScenario'),
])

await scenario('guest URL mock never calls generation', [
  open('guest', '', 'error'),
  wait(`${fixture}.userId===null`),
  click('Generate menu'),
  wait(`document.querySelector('.planner-day-grid') !== null`),
  assert(`${generationCount}===0 && ${saveCount}===0`, 'guest ignores URL mock and keeps generation local'),
])

await scenario('guest generation remains local and never calls the AI server function', [
  open('guest'),
  wait(`${fixture}.userId===null`),
  click('Generate menu'),
  wait(`document.querySelector('.planner-day-grid') !== null`),
  assert(`${generationCount}===0 && ${saveCount}===0`, 'guest planner retains its local flow and makes no AI request'),
])

const shot = (name) => ['screenshot', `${typeof process === 'undefined' ? '.' : process.cwd()}/e2e/artifacts/${name}`]
const generateAnotherDialog = `document.querySelector('dialog[aria-labelledby="ai-generate-another-title"]')`
const lastRequest = `${fixture}.generationRequests[${fixture}.generationRequests.length-1]`
const generateFromReady = [
  wait(`${shell}.innerText.includes('Saved dinner')`),
  click('Regenerate menu'),
  click('Confirm schedule and generate'),
  wait(`${preview} !== null`),
  waitPreviewAcceptable(),
]

await scenario('replace note is absent when the target week is empty (dialog and banner)', [
  open('ready'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  click('Regenerate menu'),
  text("Review next week’s schedule"),
  assert(`!${dialog}.innerText.includes('already has a menu')`, 'no replace note in the dialog for an empty week'),
  click('Confirm schedule and generate'),
  wait(`${preview} !== null`),
  assert(`!${preview}.innerText.includes('replaces the menu already saved')`, 'no replace note in the banner for an empty week'),
])

await scenario('replace note shows in dialog and banner for a saved target week and survives Edit schedule', [
  open('target-saved'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  click('Regenerate menu'),
  text("Review next week’s schedule"),
  assert(
    `${dialog}.innerText.includes('Next week already has a menu. Accepting the new proposal will replace all of it.') && ${dialog}.querySelector('.planner-ai-replace-note') && !${dialog}.querySelector('.planner-ai-replace-note').closest('[role="alert"]') && ${dialog}.querySelector('.planner-ai-replace-note').compareDocumentPosition(${dialog}.querySelector('footer')) & Node.DOCUMENT_POSITION_FOLLOWING`,
    'dialog shows a non-alert replace note above the footer',
  ),
  click('Confirm schedule and generate'),
  wait(`${preview} !== null`),
  waitPreviewAcceptable(),
  assert(`${preview}.querySelector('.planner-ai-preview-banner').innerText.includes('Accepting replaces the menu already saved for this week.')`, 'banner shows the replace note'),
  shot('ai-preview-actions-banner.png'),
  click('Edit target schedule'),
  text("Review next week’s schedule"),
  assert(`${dialog}.innerText.includes('Next week already has a menu')`, 'note still shows after the Edit schedule round trip'),
  click('Cancel'),
  wait(`${preview} !== null`),
  assert(`${preview}.innerText.includes('replaces the menu already saved')`, 'note survives Cancel (restored preview)'),
  assert(`${generateAnotherButton} !== null && !${generateAnotherButton}.disabled`, 'Generate another works after a restored preview'),
])

await scenario('Generate another without edits sends one request with previousMenu and shows the skeleton', [
  open('ready'),
  ...generateFromReady,
  assert(`${generationCount}===1 && ${fixture}.generationRequests[0].previousMenu===undefined`, 'the confirm path sends no previousMenu'),
  evaluate(`${fixture}.holdGeneration=true; ${generateAnotherButton}.click()`),
  wait(`${fixture}.pendingGeneration`),
  assert(`!${generateAnotherDialog} && ${skeleton} !== null && ${preview}===null && ${generationCount}===2`, 'no confirmation without manual edits; skeleton replaces the preview while held'),
  assert(
    `${lastRequest}.previousMenu.weekStart===${fixture}.targetWeekStart && ${lastRequest}.previousMenu.days.Monday.dinnerRecipeId==='saved-dinner' && ${lastRequest}.previousMenu.days.Monday.lunchRecipeId==='saved-lunch' && ${lastRequest}.weekStart===${fixture}.targetWeekStart`,
    'the request carries the shown proposal as previousMenu for the same week',
  ),
  evaluate(`${fixture}.holdGeneration=false; ${fixture}.releaseGeneration()`),
  wait(`${preview} !== null`),
  waitPreviewAcceptable(),
  assert(
    `${skeleton}===null && ${generationCount}===2 && ${saveCount}===0 && ${preview}.querySelector(${JSON.stringify(firstDayDinnerSelector)}).value==='saved-dinner-alternative'`,
    'the new proposal replaces the skeleton and differs; nothing saved',
  ),
])

await scenario('Generate another with a manual edit confirms first; Cancel sends nothing, Confirm sends one request', [
  open('ready'),
  ...generateFromReady,
  ['select', firstDayDinnerSelector, 'saved-dinner-alternative'],
  evaluate(`${generateAnotherButton}.click()`),
  wait(`${generateAnotherDialog} !== null`),
  assert(`${generateAnotherDialog}.innerText.includes('Generate another?') && ${generateAnotherDialog}.innerText.includes('Your manual changes to this proposal will be lost.') && ${generateAnotherDialog}.open && ${generateAnotherDialog}.contains(document.activeElement)`, 'a confirmation dialog warns that manual changes will be lost'),
  shot('ai-preview-actions-confirm.png'),
  ['press', 'Escape'],
  assert(`!${generateAnotherDialog} && ${generationCount}===1 && ${preview}.querySelector(${JSON.stringify(firstDayDinnerSelector)}).value==='saved-dinner-alternative' && document.activeElement===${generateAnotherButton}`, 'Escape/Cancel sends nothing, keeps the edit and returns focus to the button'),
  evaluate(`${generateAnotherButton}.click()`),
  wait(`${generateAnotherDialog} !== null`),
  evaluate(`[...${generateAnotherDialog}.querySelectorAll('button')].find(button => button.textContent.trim()==='Cancel').click()`),
  assert(`!${generateAnotherDialog} && ${generationCount}===1`, 'the Cancel button sends nothing'),
  evaluate(`${generateAnotherButton}.click()`),
  wait(`${generateAnotherDialog} !== null`),
  evaluate(`[...${generateAnotherDialog}.querySelectorAll('button')].find(button => button.textContent.trim()==='Generate another').click()`),
  wait(`${generationCount}===2 && ${preview} !== null`),
  assert(`${lastRequest}.previousMenu.days.Monday.dinnerRecipeId==='saved-dinner-alternative' && ${saveCount}===0`, 'Confirm sends exactly one request carrying the edited proposal as previousMenu'),
])

await scenario('reverting a manual edit means no confirmation; double click sends one request', [
  open('ready'),
  ...generateFromReady,
  ['select', firstDayDinnerSelector, 'saved-dinner-alternative'],
  ['select', firstDayDinnerSelector, 'saved-dinner'],
  evaluate(`${fixture}.holdGeneration=true; const button=${generateAnotherButton}; button.click(); button.click()`),
  wait(`${fixture}.pendingGeneration`),
  assert(`!${generateAnotherDialog} && ${generationCount}===2`, 'a reverted edit regenerates directly and a double click sends one request'),
  evaluate(`${fixture}.holdGeneration=false; ${fixture}.releaseGeneration()`),
  wait(`${preview} !== null`),
  assert(`${generationCount}===2`, 'still exactly one extra request after completion'),
])

await scenario('failed Generate another keeps the previous edited proposal and Accept still saves it', [
  open('ready'),
  ...generateFromReady,
  ['select', firstDayDinnerSelector, 'saved-dinner-alternative'],
  evaluate(`${fixture}.failGeneration=true; ${generateAnotherButton}.click()`),
  wait(`${generateAnotherDialog} !== null`),
  evaluate(`[...${generateAnotherDialog}.querySelectorAll('button')].find(button => button.textContent.trim()==='Generate another').click()`),
  text('Could not generate next week’s menu'),
  assert(
    `${skeleton}===null && ${preview} !== null && ${preview}.querySelector(${JSON.stringify(firstDayDinnerSelector)}).value==='saved-dinner-alternative' && ${saveCount}===0 && ${generationCount}===2`,
    'the previous proposal with its manual edit stays visible with the error; nothing saved',
  ),
  evaluate(`${fixture}.failGeneration=false`),
  waitPreviewAcceptable(),
  click('Accept and save menu'),
  text('Weekly Menu saved.'),
  assert(`${saveCount}===1 && JSON.stringify(${fixture}.saveRequests[0].payload).includes('saved-dinner-alternative')`, 'Accept saves the previous proposal'),
])

for (const reason of ['generate', 'in-progress']) {
  await scenario(`Retry after ${reason} preserves the edited proposal and confirmed schedule`, [
    open('target-saved'),
    ...generateFromReady,
    wait(`${preview}.contains(document.activeElement)`),
    assert(`document.activeElement.getAttribute('role')==='heading'`, 'confirmation settles focus on the preview heading'),
    ['select', firstDayDinnerSelector, 'saved-dinner-alternative'],
    evaluate(`${fixture}.failGeneration=${reason === 'generate'}; ${fixture}.generationRejection=${JSON.stringify(reason === 'in-progress' ? reason : null)}; ${generateAnotherButton}.click()`),
    wait(`${generateAnotherDialog} !== null`),
    evaluate(`[...${generateAnotherDialog}.querySelectorAll('button')].find(button => button.textContent.trim()==='Generate another').click()`),
    wait(`${shell}.querySelector('[role="alert"]') !== null && ${preview} !== null`),
    waitPreviewAcceptable(),
    assert(`!${generateAnotherButton}.disabled`, 'Generate another is available after a retryable failure'),
    click('Retry generation'),
    wait(`${generationCount}===3 && ${preview} !== null && ${shell}.querySelector('[role="alert"]') !== null`),
    assert(`!${dialog} && ${preview}.querySelector(${JSON.stringify(firstDayDinnerSelector)}).value==='saved-dinner-alternative'`, 'Retry never opens a fresh schedule flow and another failure keeps the manual edit'),
    ['press', 'Escape'],
    assert(`${preview} !== null && ${saveCount}===0 && ${preview}.querySelector(${JSON.stringify(firstDayDinnerSelector)}).value==='saved-dinner-alternative'`, 'Escape cannot silently discard the retained proposal'),
    evaluate(`${fixture}.failGeneration=false; ${fixture}.generationRejection=null`),
    click('Retry generation'),
    wait(`${generationCount}===4 && ${preview} !== null && !${shell}.querySelector('[role="alert"]')`),
    wait(`${preview}.contains(document.activeElement)`),
    assert(`document.activeElement.getAttribute('role')==='heading' && ${lastRequest}.previousMenu.days.Monday.dinnerRecipeId==='saved-dinner-alternative' && JSON.stringify(${lastRequest}.schedule)===JSON.stringify(${fixture}.generationRequests[0].schedule) && ${lastRequest}.schedule.Monday.context==='office' && ${lastRequest}.schedule.Monday.scope==='dinner' && ${lastRequest}.schedule.Tuesday.context==='eatOut' && ${lastRequest}.schedule.Tuesday.scope==='lunch' && ${saveCount}===0`, 'retry sends the edited proposal with all original day contexts/scopes and focuses the settled preview'),
  ])
}

await scenario('rate-limited Generate another keeps the proposal; retry after a failed first generation has no previousMenu', [
  open('ready'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  evaluate(`${fixture}.failGeneration=true`),
  click('Regenerate menu'),
  click('Confirm schedule and generate'),
  text('Could not generate next week’s menu'),
  evaluate(`${fixture}.failGeneration=false`),
  wait(`document.querySelector('[role="alert"] .planner-secondary-btn') && !document.querySelector('[role="alert"] .planner-secondary-btn').disabled`),
  click('Retry generation'),
  click('Confirm schedule and generate'),
  wait(`${preview} !== null`),
  waitPreviewAcceptable(),
  assert(`${generationCount}===2 && ${fixture}.generationRequests.every(request => request.previousMenu===undefined)`, 'confirm and retry paths never send previousMenu'),
  evaluate(`${fixture}.generationRejection='rate-limited'; ${generateAnotherButton}.click()`),
  wait(`${shell}.querySelector('[role="alert"]') !== null`),
  assert(`${preview} !== null && ${saveCount}===0 && ${generationCount}===3 && ${generateAnotherButton}.disabled`, 'rate-limited regenerate keeps the proposal; the action is disabled until a settled preview'),
])

await scenario('Generate another after Monday targets the preview week and a stale answer keeps the proposal', [
  open('preview-rollover'),
  ...generateFromReady,
  evaluate(`${fixture}.advanceClock(2 * 60 * 1000)`),
  assert(`new Date().getDay()===1`, 'the browser crossed into Monday with the preview open'),
  evaluate(`${generateAnotherButton}.click()`),
  text('The Calendar Week changed.'),
  assert(
    `${lastRequest}.weekStart===${fixture}.targetWeekStart && ${lastRequest}.previousMenu.weekStart===${fixture}.targetWeekStart && ${preview} !== null && ${saveCount}===0`,
    'regenerate targets the pinned preview week; the stale answer keeps the saveable proposal',
  ),
])

await scenario('Generate another is disabled while the preview is being saved', [
  open('ready'),
  ...generateFromReady,
  evaluate(`${fixture}.holdSave=true`),
  click('Accept and save menu'),
  wait(`${fixture}.pendingSave`),
  assert(`${generateAnotherButton}.disabled && ${generationCount}===1`, 'the button is disabled during acceptance'),
  evaluate(`${generateAnotherButton}.click(); ${fixture}.holdSave=false; ${fixture}.releaseSave()`),
  text('Weekly Menu saved.'),
  assert(`${generationCount}===1`, 'no generation was sent while saving'),
])

const dinnerOptions = `[...${preview}.querySelector(${JSON.stringify(firstDayDinnerSelector)}).options].map(option => option.textContent)`

await scenario('preview alternatives are alphabetical per locale, with No recipe first and the selection kept', [
  open('sorted-catalog'),
  ...generateFromReady,
  assert(
    `JSON.stringify(${dinnerOptions})===JSON.stringify(['No recipe','Apple stew 2','Apple stew 10','Épinards crème','Mushroom barley bowl','Roasted vegetable bowl','Zucchini bake'])`,
    'dinner alternatives are alphabetical (accent-insensitive, numeric) with No recipe first',
  ),
  ['screenshot', `${process.cwd()}/e2e/artifacts/ai-sorted-alternatives.png`],
  assert(
    `${preview}.querySelector(${JSON.stringify(firstDayDinnerSelector)}).value==='saved-dinner' && ${preview}.querySelector(${JSON.stringify(firstDayDinnerSelector)}).selectedOptions[0].textContent==='Roasted vegetable bowl'`,
    'the generated recipe stays selected after sorting',
  ),
  assert(
    `JSON.stringify([...${preview}.querySelector('.delay-1 .meal-recipe-editor select[aria-label="Choose a saved lunch recipe"]').options].map(option => option.textContent))===JSON.stringify(['No recipe','Crispy lentil salad','Lemon chickpea pasta'])`,
    'lunch alternatives are alphabetical too',
  ),
])

await scenario('Spanish selectors use the Spanish collation', [
  open('sorted-catalog', '/es'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  click('Regenerar menú'),
  text('Revisa la agenda de la próxima semana'),
  click('Confirmar agenda y generar'),
  wait(`${preview} !== null`),
  assert(
    `(() => { const selects=[...${preview}.querySelectorAll('.delay-1 .meal-recipe-editor select')]; const names=[...selects[selects.length-1].options].slice(1).map(option => option.textContent); const expected=[...names].sort(new Intl.Collator('es',{sensitivity:'base',numeric:true}).compare); return JSON.stringify(names)===JSON.stringify(expected) && names.indexOf('Épinards crème') < names.indexOf('Mushroom barley bowl') })()`,
    'Spanish dinner options follow the es collator',
  ),
])

emit({
  suite: 'AI Weekly Menu browser checks',
  verdict: 'PASS',
  evidence: await browser({
    args: ['eval', `({ targetWeekStart: ${fixture}.targetWeekStart, generationRequests: ${generationCount}, saveRequests: ${saveCount}, fixture: ${fixture}.scenario })`],
  }),
})
