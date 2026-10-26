/* global browser, emit */
// Execute this file's contents with the native agent_browser_code tool in a
// session launched with planner-reliability.init.js. No host APIs are required.
const base = 'http://127.0.0.1:3101'
const fixture = 'window.plannerReliability'
const shell = 'document.querySelector(".planner-shell")'
const primary = 'document.querySelector(".planner-actions .planner-primary-btn")'
const grid = 'document.querySelector(".planner-day-grid")'
const dialog = 'document.querySelector("[role=dialog]")'
const currentDinner = `${grid}?.innerText.includes('Saved dinner ' + ${fixture}.reads.find(r=>r.kind==='load').weekStart)`
const click = (name) => ['find', 'role', 'button', 'click', '--name', name, '--exact']
const evaluate = (source) => ['eval', source]
const wait = (condition) => ['wait', '--fn', condition]
const text = (value) => ['wait', '--text', value]
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
  // Eval and navigation are explicit context boundaries in the native wrapper.
  const commands = steps.flatMap((step) =>
    ['eval', 'open'].includes(step[0]) ? [step, ['get', 'url']] : [step],
  )
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

await scenario('failed read is not an empty week; retry restores existing data', [
  open('load-error'),
  ['snapshot', '-i'],
  text('Could not load this week'),
  assert(
    `${primary}.disabled && !${shell}.innerText.includes('No Weekly Menu yet') && ${fixture}.writes.length===0`,
    'failed read blocks writes and does not render the empty state',
  ),
  evaluate(`${fixture}.failLoad=false`),
  click('Retry loading'),
  wait(currentDinner),
  assert(`!${primary}.disabled && ${fixture}.writes.length===0`, 'safe load recovery'),
])

for (const kind of ['auth', 'load']) {
  await scenario(`${kind} pending blocks writes until resolved`, [
    open(`${kind}-pending`),
    wait(`Boolean(${fixture}.release.${kind})`),
    assert(
      `${primary}.disabled && ${fixture}.writes.length===0 && ${shell}.innerText.includes('Loading this week')`,
      'pending read blocks actions',
    ),
    evaluate(`${fixture}.hold.${kind}=false;${fixture}.release.${kind}()`),
    wait(currentDinner),
    assert(`!${primary}.disabled && ${fixture}.writes.length===0`, 'read completion restores actions'),
  ])
}

for (const flag of ['failRecipes', 'failLoad']) {
  await scenario(`generation ${flag} fails before any POST`, [
    open('ready'),
    wait(currentDinner),
    evaluate(`${fixture}.${flag}=true`),
    click('Regenerate menu'),
    text('Could not finish generating and saving your menu.'),
    assert(`${currentDinner} && ${fixture}.writes.length===0`, 'dependency failure retains menu without writing'),
  ])
}

await scenario('failed generation POST retains menu and retry succeeds', [
  open('ready'),
  wait(currentDinner),
  evaluate(`${fixture}.failSave=true`),
  click('Regenerate menu'),
  text('Could not finish generating and saving your menu.'),
  assert(`${currentDinner} && ${fixture}.writes.length===1`, 'generation failure retains loaded data'),
  evaluate(`${fixture}.failSave=false`),
  click('Retry generation'),
  text('Weekly Menu saved.'),
  assert(`${currentDinner} && ${fixture}.writes.length===2`, 'generation retry confirms success'),
])

await scenario('schedule failure retains draft; pending retry is guarded and succeeds', [
  open('ready'),
  wait(currentDinner),
  click('Preferences'),
  ['click', '#preferences-schedule-panel .panel-day-card:first-child .panel-context-pill:first-child'],
  evaluate(`${fixture}.failSave=true`),
  click('Save preferences'),
  text('Could not confirm your preferences were saved.'),
  assert(
    `${dialog}.querySelector('.panel-day-card:first-child .panel-context-pill:first-child').getAttribute('aria-pressed')==='true' && !document.querySelector('.day-context-badge') && ${fixture}.writes.at(-1).payload.includes('saved-dinner')`,
    'failed save preserves draft, assigned dinner, and last loaded menu',
  ),
  evaluate(`${fixture}.failSave=false;${fixture}.hold.save=true`),
  click('Save preferences'),
  wait(`Boolean(${fixture}.release.save)`),
  assert(
    `${dialog}.querySelector('.panel-primary-btn').disabled && ${dialog}.querySelector('fieldset').disabled && ${dialog}.innerText.includes('Saving preferences...') && ${fixture}.writes.length===2`,
    'pending schedule save is visible and guarded',
  ),
  evaluate(`${fixture}.hold.save=false;${fixture}.release.save()`),
  text('Preferences saved.'),
  assert(`!${dialog} && ${currentDinner} && document.querySelector('.day-context-badge')?.textContent==='Office'`, 'retry confirms saved schedule'),
])

for (const failed of [false, true]) {
  await scenario(`late ${failed ? 'failed' : 'successful'} read cannot replace another week`, [
    open('ready'),
    wait(currentDinner),
    evaluate(`${fixture}.hold.load=true;${fixture}.failLoad=${failed}`),
    click('Next week'),
    wait(`Boolean(${fixture}.release.load)`),
    evaluate(`${fixture}.hold.load=false;${fixture}.failLoad=false`),
    click('Previous week'),
    wait(currentDinner),
    evaluate(`${fixture}.release.load()`),
    wait(`${fixture}.completed.filter(r=>r.kind==='load').length===3`),
    assert(`${currentDinner} && !${shell}.querySelector('[role=alert]') && !${primary}.disabled`, 'late result does not change selected week'),
  ])
}

for (const kind of ['save', 'load']) {
  await scenario(`sign-out invalidates pending generation ${kind}`, [
    open('ready'),
    wait(currentDinner),
    evaluate(`${fixture}.hold.${kind}=true`),
    click('Regenerate menu'),
    wait(`Boolean(${fixture}.release.${kind})`),
    assert(`${primary}.disabled && ${shell}.innerText.includes('Generating')`, 'generation pending state is visible'),
    click('Log out'),
    text('Log in'),
    evaluate(`${fixture}.hold.${kind}=false;${fixture}.release.${kind}()`),
    wait(`${fixture}.completed.filter(r=>r.kind==='${kind}').length===${kind === 'load' ? 2 : 1}`),
    assert(
      `!${shell}.innerText.includes('Saved dinner') && !${shell}.innerText.includes('Weekly Menu saved.') && !${shell}.querySelector('[role=alert]') && ${fixture}.writes.length===${kind === 'save' ? 1 : 0}`,
      'stale operation neither leaks into guest UI nor starts a post-signout write',
    ),
  ])
}

await scenario('catalog failure is actionable and retry restores shopping', [
  open('recipes-error'),
  text('Could not load this week'),
  assert(`${primary}.disabled && ${fixture}.writes.length===0`, 'catalog failure blocks writes'),
  evaluate(`${fixture}.failRecipes=false`),
  click('Retry loading'),
  wait(currentDinner),
  click('Shopping List 1'),
  text('100 g Rice'),
  assert(`document.querySelector('.planner-shopping-tab').innerText.includes('100 g Rice') && ${fixture}.writes.length===0`, 'catalog retry restores derived shopping list'),
])

await scenario('successful empty read permits first generation', [
  open('empty'),
  wait(`!${primary}.disabled`),
  assert(`${shell}.innerText.includes('No Weekly Menu yet') && ${fixture}.writes.length===0`, 'successful absence is distinct from read failure'),
  ['click', '.planner-actions .planner-primary-btn'],
  text('Weekly Menu saved.'),
  assert(`Boolean(${grid}) && ${fixture}.writes.length===1`, 'first generation succeeds'),
])

await scenario('Spanish load/save failures and recovery are localized', [
  open('load-error', '/es'),
  text('No se pudo cargar esta semana'),
  evaluate(`${fixture}.failLoad=false`),
  click('Volver a cargar'),
  wait(currentDinner),
  click('Preferencias'),
  ['click', '#preferences-schedule-panel .panel-day-card:first-child .panel-context-pill:first-child'],
  evaluate(`${fixture}.failSave=true`),
  click('Guardar preferencias'),
  text('No se pudo confirmar el guardado de tus preferencias.'),
  assert(`${dialog}.querySelector('.panel-day-card:first-child .panel-context-pill:first-child').getAttribute('aria-pressed')==='true'`, 'Spanish failure retains draft'),
  evaluate(`${fixture}.failSave=false`),
  click('Guardar preferencias'),
  text('Preferencias guardadas.'),
  assert(`!${dialog} && document.querySelector('.day-context-badge')?.textContent==='Oficina'`, 'Spanish retry succeeds'),
])
