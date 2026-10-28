/* global browser, emit */
// Run through agent_browser_code with ai-weekly-menu.init.js loaded.
const base = 'http://127.0.0.1:3101'
const fixture = 'window.aiWeeklyMenuFixture'
const dialogSelector = 'dialog[aria-labelledby="ai-generation-title"]'
const dialog = `document.querySelector(${JSON.stringify(dialogSelector)})`
const previewSelector = '.planner-ai-preview'
const preview = `document.querySelector(${JSON.stringify(previewSelector)})`
const firstDayDinnerSelector = `${previewSelector} .delay-1 .meal-recipe-editor select[aria-label="Choose a saved dinner recipe"]`
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
const open = (fixtureScenario, locale = '') => [
  'open',
  `${base}${locale}/weekly-menu-planner?scenario=${fixtureScenario}`,
]
const assert = (condition, message) =>
  evaluate(`(() => {
    if (!(${condition})) throw new Error(${JSON.stringify(message)});
    return { verdict: 'PASS', check: ${JSON.stringify(message)} };
  })()`)

async function scenario(name, steps) {
  const commands = steps.flatMap((step) => {
    if (step[0] === 'find' && step.includes('Confirm schedule and generate')) {
      return [['wait', '--text', 'Review next week’s schedule'], step]
    }
    if (['click', 'select'].includes(step[0])) {
      return [['scrollintoview', step[1]], step]
    }
    return ['eval', 'open'].includes(step[0])
      ? [step, ['get', 'url']]
      : [step]
  })
  const result = await browser({
    args: ['batch', '--bail'],
    stdin: JSON.stringify(commands),
    timeoutMs: 60000,
  })
  if (!result.success) {
    emit({ scenario: name, verdict: 'FAIL', error: result.error, data: result.data })
    throw new Error(name)
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
  click('Edit target schedule'),
  text("Review next week’s schedule"),
  ['click', `${dialogSelector} .panel-day-card:first-child .panel-context-pill:first-child`],
  assert(`${preview}===null && ${generationCount}===1 && ${saveCount}===0`, 'schedule edit invalidates stale preview without saving'),
  click('Confirm schedule and generate'),
  wait(`${preview} !== null && ${generationCount}===2`),
  click('Discard preview'),
  click('Discard generated preview'),
  assert(`${preview}===null && ${saveCount}===0`, 'confirmed discard removes preview without persistence'),
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

await scenario('empty catalog leaves required meal types empty with a clear warning', [
  open('empty-catalog'),
  wait(`${shell}.innerText.includes('Saved dinner')`),
  click('Regenerate menu'),
  click('Confirm schedule and generate'),
  wait(`${preview} !== null`),
  assert(
    `${preview}.innerText.includes('No saved lunch recipes') && ${preview}.innerText.includes('No saved dinner recipes') && ${preview}.innerText.includes('No home-planned meal') && ${saveCount}===0`,
    'zero lunch/dinner candidates yield empty eligible slots and explicit shortage warnings',
  ),
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
  click('Descartar vista previa'),
  text('¿Descartar esta vista previa generada?'),
  click('Descartar la vista previa generada'),
  assert(`${preview}===null && ${saveCount}===0`, 'Spanish discard confirmation keeps saved data untouched'),
])

await scenario('guest generation remains local and never calls the AI server function', [
  open('guest'),
  wait(`${fixture}.userId===null`),
  click('Generate menu'),
  wait(`document.querySelector('.planner-day-grid') !== null`),
  assert(`${generationCount}===0 && ${saveCount}===0`, 'guest planner retains its local flow and makes no AI request'),
])

emit({
  suite: 'AI Weekly Menu browser checks',
  verdict: 'PASS',
  evidence: await browser({
    args: ['eval', `({ targetWeekStart: ${fixture}.targetWeekStart, generationRequests: ${generationCount}, saveRequests: ${saveCount}, fixture: ${fixture}.scenario })`],
  }),
})
