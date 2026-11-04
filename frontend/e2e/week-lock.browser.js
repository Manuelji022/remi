/* global browser, emit */
const base = 'http://127.0.0.1:3102'
const lock = `document.querySelector('.week-lock-button')`
const f = 'window.weekLockFixture'
const wait = condition => ['wait', '--fn', `Boolean(${condition})`]
const click = name => ['find', 'role', 'button', 'click', '--name', name, '--exact']
const ev = code => ['eval', `(async () => { ${code}; return true })()`]
const check = (condition, message) => ev(`if (!(${condition})) throw new Error(${JSON.stringify(message)})`)
const open = (fixtureScenario = 'ready', locale = '') => [
  ['open', `${base}${locale}/weekly-menu-planner?scenario=${fixtureScenario}`],
  wait(`${f} && document.querySelector('.planner-shell') && !document.querySelector('.planner-empty-state[role="status"]')`),
]
const locked = () => wait(`${lock} !== null`)
const unlocked = () => wait(`${lock} === null`)
const sleep = ms => `await new Promise(resolve => setTimeout(resolve, ${ms}))`
const pointer = type => `b.dispatchEvent(new PointerEvent('${type}', { bubbles: true, button: 0, isPrimary: true, pointerId: 1 }))`
const key = (type, value, repeat = false) => `b.dispatchEvent(new KeyboardEvent('${type}', { bubbles: true, key: ${JSON.stringify(value)}, repeat: ${repeat}, cancelable: true }))`
const hold = (ms = 1100) => ev(`const b=${lock}; ${pointer('pointerdown')}; ${sleep(ms)}; ${pointer('pointerup')}`)
let passed = 0, failed = 0
async function scenario(name, steps) {
  try {
    for (const step of steps) {
      const result = await browser(Array.isArray(step) ? { args: step } : step)
      if (!result.success) throw new Error(JSON.stringify(result.error ?? result.data))
    }
    passed++
    emit({ scenario: name, verdict: 'PASS' })
  } catch (error) {
    failed++
    emit({ scenario: name, verdict: 'FAIL', error: String(error) })
  }
}

await scenario('current week is locked, accessible, centered above the menu', [
  ...open(), locked(),
  check(`${lock}.textContent.includes('Hold to unlock') && ${lock}.getAttribute('aria-label').includes('Week locked') && ${lock}.getAttribute('aria-label').includes('1 second')`, 'lock and instructions are named'),
  check(`(() => { const b=${lock}.getBoundingClientRect(), grid=document.querySelector('.planner-day-grid').getBoundingClientRect(); return b.bottom <= grid.top && Math.abs((b.left+b.width/2)-(grid.left+grid.width/2))<2 })()`, 'button is centered above menu'),
  check(`${lock}.querySelector('svg').getBoundingClientRect().width>=40`, 'ring has readable dimensions'),
  ['screenshot', 'e2e/artifacts/week-lock.png'],
])
await scenario('quick native pointer tap and keyboard taps never unlock', [
  ...open(), locked(), ['click', '.week-lock-button'], ['focus', '.week-lock-button'], ['press', 'Enter'], ['press', 'Space'],
  ev(sleep(1100)), locked(),
])
for (const event of ['pointerup', 'pointercancel']) {
  await scenario(`${event} at 500ms cancels and resets ring`, [
    ...open(), locked(),
    ev(`const b=${lock}; ${pointer('pointerdown')}; ${sleep(500)}; if (!${lock}) throw new Error('unlocked too early'); ${pointer(event)}; ${sleep(650)}`),
    locked(), check(`${lock}.dataset.holding==='false' && !document.querySelector('.week-lock-progress')`, 'cancel removes progress'),
  ])
}
await scenario('native pointer leave at 500ms cancels even with implicit capture', [
  ...open(), locked(),
  ev(`const b=${lock}; b.addEventListener('pointerdown', event => b.setPointerCapture(event.pointerId), { capture: true, once: true })`),
  { args: ['batch', '--bail'], stdin: JSON.stringify([
    ['hover', '.week-lock-button'], ['mouse', 'down', 'left'], ['wait', '500'],
    ['mouse', 'move', '0', '0'], ['wait', '650'], ['mouse', 'up', 'left'],
  ]) }, locked(),
  check(`${lock}.dataset.holding==='false'`, 'leaving cancels progress'),
])
await scenario('native pointer hold confirms after about 1 second and announces once', [
  ...open(), locked(), ['hover', '.week-lock-button'], ['mouse', 'down', 'left'],
  ev(sleep(1100)), ['mouse', 'up', 'left'], unlocked(),
  check(`document.querySelector('.week-lock [role="status"]').textContent==='Week unlocked'`, 'persistent polite status announces result'),
])
for (const value of ['Enter', ' ']) {
  await scenario(`${JSON.stringify(value)} hold ignores repeats and confirms at 1000ms`, [
    ...open(), locked(), ['focus', '.week-lock-button'],
    ev(`const b=${lock}; const started=performance.now(); window.holdElapsed=null; const observer=new MutationObserver(() => { if (!${lock} && window.holdElapsed===null) { window.holdElapsed=performance.now()-started; observer.disconnect() } }); observer.observe(b.parentElement, { childList:true }); ${key('keydown', value)}; ${sleep(500)}; ${key('keydown', value, true)}; if (!${lock} || !document.querySelector('.week-lock-progress')) throw new Error('unlocked before 500ms or no ring'); ${sleep(600)}; if (${lock}) { observer.disconnect(); throw new Error('repeat delayed confirmation') } ${key('keydown', value, true)}; ${key('keyup', value)}`),
    unlocked(), check(`window.holdElapsed>=990 && window.holdElapsed<1500`, 'actual lock removal occurs near 1000ms, never at 600ms'),
    check(`document.activeElement===document.querySelector('.planner-actions .planner-secondary-btn')`, 'keyboard unlock focuses Preferences'),
  ])
  await scenario(`${JSON.stringify(value)} keyup and blur cancel`, [
    ...open(), locked(), ['focus', '.week-lock-button'],
    ev(`const b=${lock}; ${key('keydown', value)}; ${sleep(500)}; ${key('keyup', value)}; ${sleep(650)}`), locked(),
    ev(`const b=${lock}; b.focus(); ${key('keydown', value)}; ${sleep(500)}; b.blur(); ${sleep(650)}`), locked(),
  ])
}
await scenario('navigation relocks current and past weeks; next week has no lock', [
  ...open(), locked(), hold(), unlocked(), click('Previous week'), locked(), hold(), unlocked(),
  click('Next week'), locked(), click('Next week'), unlocked(),
  check(`document.querySelector('.planner-day-grid') && document.querySelector('button[aria-label="Next week"]').disabled`, 'next week has a saved menu and no lock'),
  click('Previous week'), locked(),
])
await scenario('reload discards unlock', [
  ...open(), locked(), hold(), unlocked(), ['reload'], locked(),
])
await scenario('locked schedule cannot edit or save; recipe controls remain usable', [
  ...open(), locked(), click('Preferences'), wait(`document.querySelector('#preferences-schedule-panel')`),
  check(`document.querySelector('.panel-content').disabled && document.querySelector('.panel-primary-btn').disabled && document.querySelector('[role="note"]').textContent.includes('locked')`, 'schedule fieldset and save are disabled with note'),
  ev(`document.querySelector('.panel-day-card button').click(); document.querySelector('.panel-primary-btn').click()`),
  check(`${f}.saveRequests.length===0`, 'disabled save makes no transport request'),
  ['click', '#preferences-recipes-tab'], wait(`document.querySelector('#preferences-recipes-tab[aria-selected="true"]')`),
  check(`!document.querySelector('.panel-content').disabled`, 'recipes fieldset stays enabled'),
  wait(`document.querySelector('.panel-content input') !== null`),
  check(`[...document.querySelectorAll('.panel-content input')].some(input => !input.disabled) && [...document.querySelectorAll('.panel-content button')].some(button => !button.disabled)`, 'recipe form and actions are enabled'),
])
await scenario('unlocked schedule can edit and save', [
  ...open(), locked(), hold(), unlocked(), click('Preferences'),
  wait(`document.querySelector('.panel-day-card button') !== null`),
  ['click', '.panel-day-card:first-child .panel-context-pill:first-child'], ['click', '.panel-primary-btn'],
  wait(`${f}.saveRequests.length===1`), check(`JSON.stringify(${f}.saveRequests[0]).includes('office')`, 'unlocked edit is persisted'),
])
await scenario('already-open Sunday schedule cannot save its now-current target on Monday', [
  ...open('rollover'), locked(), click('Next week'), unlocked(), click('Preferences'),
  wait(`document.querySelector('.panel-day-card button') !== null`),
  ['click', '.panel-day-card:first-child .panel-context-pill:first-child'],
  check(`!document.querySelector('.panel-primary-btn').disabled`, 'future schedule starts editable'),
  ev(`${f}.advanceClock(120000); document.querySelector('.panel-primary-btn').click(); ${sleep(300)}`),
  check(`new Date().getDay()===1 && ${f}.saveRequests.length===0`, 'fresh save-boundary date rejects the stale enabled Save action'),
])
await scenario('AI Generate from a locked week still opens next-week schedule', [
  ...open(), locked(), click('Regenerate menu'), wait(`document.querySelector('dialog[aria-labelledby="ai-generation-title"]')`),
  check(`${f}.generationRequests.length===0 && ${f}.saveRequests.length===0`, 'dialog opening does not generate or save'),
])
await scenario('no lock overlays the AI generation skeleton or preview', [
  ...open(), locked(), click('Regenerate menu'),
  ev(`${f}.holdGeneration=true`), click('Confirm schedule and generate'),
  wait(`document.querySelector('.planner-ai-skeleton') !== null`), unlocked(),
  ev(`${f}.holdGeneration=false; ${f}.releaseGeneration()`),
  wait(`document.querySelector('.planner-ai-preview-menu') !== null`), unlocked(),
])
await scenario('Sunday pinned preview stays editable and acceptable on Monday with no lock', [
  ...open('rollover'), locked(), click('Regenerate menu'), click('Confirm schedule and generate'),
  wait(`document.querySelector('.planner-ai-preview-menu') !== null`), unlocked(),
  ev(`${f}.advanceClock(120000)`),
  check(`new Date().getDay()===1`, 'controlled local Sunday to Monday'),
  wait(`document.querySelector('.planner-ai-preview-actions .planner-primary-btn:not(:disabled)')`),
  check(`document.querySelector('.planner-ai-preview-menu select:not(:disabled)') && !${lock}`, 'preview recipes editable despite current target week'),
  click('Accept and save menu'), wait(`${f}.saveRequests.length===1 && !document.querySelector('.planner-ai-preview')`), locked(),
])
await scenario('empty weeks do not show a lock', [
  ...open('empty'), wait(`document.querySelector('.planner-empty-state')`), unlocked(),
])
await scenario('guests use the same current, past, future and navigation locks', [
  ...open('guest'), click('Generate menu'), locked(), click('Preferences'),
  check(`document.querySelector('.panel-content').disabled && document.querySelector('.panel-primary-btn').disabled`, 'guest schedule is also read-only'),
  ['click', '.panel-close-btn'], hold(), unlocked(), click('Previous week'), locked(),
  click('Next week'), locked(), click('Next week'), unlocked(),
  check(`${f}.generationRequests.length===0 && ${f}.saveRequests.length===0`, 'guest lock remains entirely local'),
])
await scenario('touch context menu and selection suppressed', [
  ...open(), locked(),
  ev(`const b=${lock}; const e=new MouseEvent('contextmenu',{ bubbles:true, cancelable:true }); b.dispatchEvent(e); if(!e.defaultPrevented || getComputedStyle(b).userSelect!=='none' || getComputedStyle(b).touchAction!=='none') throw new Error('touch safeguards missing')`),
])
await scenario('reduced-motion hold still unlocks without animation', [
  ...open(), locked(), ['set', 'media', 'light', 'reduced-motion'],
  ev(`const b=${lock}; ${pointer('pointerdown')}; ${sleep(100)}; const ring=document.querySelector('.week-lock-progress'); if(!matchMedia('(prefers-reduced-motion: reduce)').matches || getComputedStyle(ring).animationName!=='none') throw new Error('ring animated'); ${sleep(1000)}; ${pointer('pointerup')}`), unlocked(),
  ['set', 'media', 'light'],
])
await scenario('unmount cancels pending confirmation instead of unlocking another week', [
  ...open(), locked(), ev(`const b=${lock}; ${pointer('pointerdown')}`), click('Previous week'),
  ev(sleep(1100)), locked(), click('Next week'), locked(),
])
await scenario('DST Sunday uses local civil Monday; subsequent Monday relocks next week', [
  ...open('dst'), locked(), click('Next week'), unlocked(),
  check(`Intl.DateTimeFormat().resolvedOptions().timeZone==='Europe/Madrid' && ${f}.currentWeekStart==='2026-03-23' && ${f}.targetWeekStart==='2026-03-30'`, 'DST calendar boundaries are Mondays'),
  ev(`${f}.advanceClock(13*60*60*1000)`),
  click('Previous week'), locked(), click('Preferences'), wait(`document.querySelector('.panel-content') !== null`),
  check(`new Date().getDay()===1 && document.querySelector('.panel-content').disabled`, 'Monday rerender locks previously future week'),
])
await scenario('Spanish label, instructions, and unlocked announcement', [
  ...open('ready', '/es'), locked(),
  check(`${lock}.textContent.includes('Mantén pulsado para desbloquear') && ${lock}.getAttribute('aria-label').includes('Semana bloqueada')`, 'localized lock instructions'),
  hold(), unlocked(), check(`document.querySelector('.week-lock [role="status"]').textContent==='Semana desbloqueada'`, 'localized result'),
])
emit({ suite: 'week-lock', passed, failed, verdict: failed ? 'FAIL' : 'PASS', limitations: [
  'HTTP fixture: no real account, DB or provider calls.',
  'Detailed key repeat and cancellation use DOM events; native pointer hold and keyboard taps also exercised.',
  'Touch checks cover DOM contextmenu prevention and CSS, not a physical device.',
  'Live-region semantics checked; no screen-reader audio verification.',
  'Unmount regression checks no stale unlock; not a heap/timer profiler.',
  'Calendar transition reevaluates on rerender; no midnight relock timer is introduced.',
] })
if (failed) throw new Error(`${failed} week-lock scenarios failed`)
