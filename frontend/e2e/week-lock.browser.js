/* global browser, emit */
const base = 'http://127.0.0.1:3102'
const lock = `document.querySelector('.week-lock-button')`
const f = 'window.weekLockFixture'
const wait = condition => ['wait', '--fn', `Boolean(${condition})`]
const click = name => ['find', 'role', 'button', 'click', '--name', name, '--exact']
const saveButton = `Array.from(document.querySelector('dialog[aria-labelledby=preferences-panel-title]').querySelectorAll('button')).find(button => button.textContent.includes('Save preferences'))`
const acceptButton = `Array.from(document.querySelector('.planner-ai-preview-actions').querySelectorAll('button')).find(button => button.textContent.includes('Accept and save menu'))`
const ev = code => ['eval', `(async () => { ${code}; return true })()`]
const check = (condition, message) => ev(`if (!(${condition})) throw new Error(${JSON.stringify(message)})`)
const open = (fixtureScenario = 'ready', locale = '') => [
  ['open', `${base}${locale}/weekly-menu-planner?scenario=${fixtureScenario}`],
  wait(`${f} && document.querySelector('.planner-shell') && !document.querySelector('[role="status"]')?.textContent.trim()`),
]
const locked = () => wait(`${lock} !== null`)
const unlocked = () => wait(`${lock} === null`)
const sleep = ms => `await new Promise(resolve => setTimeout(resolve, ${ms}))`
const fillScale = () => `new DOMMatrix(getComputedStyle(document.querySelector('.week-lock-fill')).transform).a`
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

await scenario('current week is locked, accessible, beside the week switcher, above the menu', [
  ...open(), locked(),
  check(`${lock}.textContent.includes('Hold to unlock') && ${lock}.getAttribute('aria-label').includes('Menu locked') && ${lock}.getAttribute('aria-label').includes('1 second')`, 'lock and instructions are named'),
  check(`(() => { const b=${lock}.getBoundingClientRect(), nav=document.querySelector('.planner-week-nav').getBoundingClientRect(), gen=document.querySelector('.planner-generate').getBoundingClientRect(), grid=document.querySelector('.planner-day-grid').getBoundingClientRect(); return b.bottom <= grid.top && b.left >= nav.right && b.right <= gen.left && Math.abs((b.top+b.height/2)-(nav.top+nav.height/2))<2 })()`, 'lock sits on the controls row between the week switcher and the hero action'),
  check(`${lock}.querySelector('.week-lock-icon').getBoundingClientRect().width>=44 && ${lock}.getBoundingClientRect().height>=60`, 'lock pill has readable dimensions'),
  ['screenshot', 'e2e/artifacts/week-lock.png'],
])
await scenario('quick native pointer tap and keyboard taps never unlock', [
  ...open(), locked(), ['click', '.week-lock-button'], ['focus', '.week-lock-button'], ['press', 'Enter'], ['press', 'Space'],
  ev(sleep(1100)), locked(),
])
for (const event of ['pointerup', 'pointercancel']) {
  await scenario(`${event} at 500ms cancels and drains the fill`, [
    ...open(), locked(),
    ev(`const b=${lock}; ${pointer('pointerdown')}; ${sleep(500)}; if (!${lock}) throw new Error('unlocked too early'); ${pointer(event)}; ${sleep(650)}`),
    locked(), check(`${lock}.dataset.holding==='false' && ${fillScale()}===0`, 'cancel drains progress back to empty'),
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
  check(`document.querySelector('.week-lock [role="status"]').textContent==='Menu unlocked'`, 'persistent polite status announces result'),
])
for (const value of ['Enter', ' ']) {
  await scenario(`${JSON.stringify(value)} hold ignores repeats and confirms at 1000ms`, [
    ...open(), locked(), ['focus', '.week-lock-button'],
    ev(`const b=${lock}; const started=performance.now(); window.holdElapsed=null; const observer=new MutationObserver(() => { if (!${lock} && window.holdElapsed===null) { window.holdElapsed=performance.now()-started; observer.disconnect() } }); observer.observe(b.parentElement, { childList:true }); ${key('keydown', value)}; ${sleep(500)}; ${key('keydown', value, true)}; if (!${lock} || !(${fillScale()} > 0.3)) throw new Error('unlocked before 500ms or fill not progressing'); ${sleep(600)}; if (${lock}) { observer.disconnect(); throw new Error('repeat delayed confirmation') } ${key('keydown', value, true)}; ${key('keyup', value)}`),
    unlocked(), check(`window.holdElapsed>=990 && window.holdElapsed<1500`, 'actual lock removal occurs near 1000ms, never at 600ms'),
    check(`document.activeElement?.textContent.includes('Preferences') || document.activeElement?.textContent.includes('Preferencias')`, 'keyboard unlock focuses Preferences'),
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
  check(`document.querySelector('.panel-content').disabled && ${saveButton}.disabled && document.querySelector('[role="note"]').textContent.includes('locked')`, 'schedule fieldset and save are disabled with note'),
  ev(`document.querySelector('.panel-day-card button').click()`),
  // agent-browser refuses to click a disabled control, so dispatch the click natively: a disabled Save must stay inert.
  ev(`${saveButton}.click()`),
  check(`${f}.saveRequests.length===0`, 'disabled save makes no transport request'),
  ['find', 'role', 'tab', 'click', '--name', 'My Recipes', '--exact'], wait(`document.querySelector('#preferences-recipes-tab[aria-selected="true"]')`),
  check(`!document.querySelector('.panel-content').disabled`, 'recipes fieldset stays enabled'),
  // Recipe creation lives in a Sheet opened by "Add recipe"; it must stay usable on a locked week.
  check(`[...document.querySelectorAll('.panel-content button')].every(button => !button.disabled)`, 'recipe actions are enabled'),
  click('Add recipe'), ['wait', '--text', 'New recipe'],
  check(`(() => { const label = [...document.querySelectorAll('label')].find(l => l.textContent.trim() === "What\\'s the dish called?"); return label && label.control && !label.control.disabled })()`, 'new recipe name field is enabled'),
])
await scenario('unlocked schedule can edit and save', [
  ...open(), locked(), hold(), unlocked(), click('Preferences'),
  wait(`document.querySelector('.panel-day-card button') !== null`),
  ['click', '.panel-day-card:first-child button[aria-pressed]:first-child'], click('Save preferences'),
  wait(`${f}.saveRequests.length===1`), check(`JSON.stringify(${f}.saveRequests[0]).includes('office')`, 'unlocked edit is persisted'),
])
await scenario('already-open Sunday schedule cannot save its now-current target on Monday', [
  ...open('rollover'), locked(), click('Next week'), unlocked(), click('Preferences'),
  wait(`document.querySelector('.panel-day-card button') !== null`),
  ['click', '.panel-day-card:first-child button[aria-pressed]:first-child'],
  check(`!${saveButton}.disabled`, 'future schedule starts editable'),
  ev(`${f}.advanceClock(120000); ${sleep(300)}`), click('Save preferences'),
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
  wait(`${acceptButton} && !${acceptButton}.disabled`),
  check(`document.querySelector('.planner-ai-preview-menu .meal-swap:not(:disabled)') && !${lock}`, 'preview recipes editable despite current target week'),
  click('Accept and save menu'), wait(`${f}.saveRequests.length===1 && !document.querySelector('.planner-ai-preview')`), locked(),
])
await scenario('empty weeks do not show a lock', [
  ...open('empty'), wait(`document.querySelector('.planner-shell')?.innerText.includes('Nothing planned this week.')`), unlocked(),
])
await scenario('guests use the same current, past, future and navigation locks', [
  ...open('guest'), click('Generate menu'), locked(), click('Preferences'),
  check(`document.querySelector('.panel-content').disabled && ${saveButton}.disabled`, 'guest schedule is also read-only'),
  click('Close preferences panel'), hold(), unlocked(), click('Previous week'), locked(),
  click('Next week'), locked(), click('Next week'), unlocked(),
  check(`${f}.generationRequests.length===0 && ${f}.saveRequests.length===0`, 'guest lock remains entirely local'),
])
await scenario('touch context menu and selection suppressed', [
  ...open(), locked(),
  ev(`const b=${lock}; const e=new MouseEvent('contextmenu',{ bubbles:true, cancelable:true }); b.dispatchEvent(e); if(!e.defaultPrevented || getComputedStyle(b).userSelect!=='none' || getComputedStyle(b).touchAction!=='none') throw new Error('touch safeguards missing')`),
])
await scenario('reduced-motion hold still unlocks without animation', [
  ...open(), locked(), ['set', 'media', 'light', 'reduced-motion'],
  ev(`const b=${lock}; ${pointer('pointerdown')}; ${sleep(100)}; const fill=document.querySelector('.week-lock-fill'); if(!matchMedia('(prefers-reduced-motion: reduce)').matches || getComputedStyle(fill).transitionDuration!=='0s') throw new Error('fill animated'); ${sleep(1000)}; ${pointer('pointerup')}`), unlocked(),
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
  check(`${lock}.textContent.includes('Mantén pulsado para desbloquear') && ${lock}.getAttribute('aria-label').includes('Menú bloqueado')`, 'localized lock instructions'),
  hold(), unlocked(), check(`document.querySelector('.week-lock [role="status"]').textContent==='Menú desbloqueado'`, 'localized result'),
])
// The fixture's today is a Wednesday, so Monday and Tuesday are past.
const pastToggle = `[...document.querySelectorAll('button')].find(b => /past days?$|días? pasados?$/.test(b.textContent.trim()))`
const shownDays = `[...document.querySelectorAll('article h3')].filter(h => h.checkVisibility()).map(h => h.getAttribute('aria-label').split(' ')[0]).join()`
const wholeWeek = 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday'
const stacked = () => check(`${pastToggle}?.getAttribute('aria-expanded')==='false' && ${shownDays}===${JSON.stringify(wholeWeek.slice(15))}`, 'past days are stacked away; today leads the board')
// Not exact: on the board the button's name also carries the range and count.
const showPast = ['find', 'role', 'button', 'click', '--name', 'Show 2 past days']
// Waits, because another week's menu may still be loading.
const allShown = () => wait(`${shownDays}===${JSON.stringify(wholeWeek)}`)
await scenario('current week stacks its past days behind a named disclosure', [
  ...open(), locked(), stacked(),
  check(`${pastToggle}.textContent.includes('Mon–Tue') && ${pastToggle}.textContent.includes('2 done') && ${pastToggle}.textContent.includes('Show 2 past days')`, 'stack names its range, count and action'),
  check(`(() => { const ids=${pastToggle}.getAttribute('aria-controls').split(' '); return ids.length===2 && ids.every(id => document.getElementById(id)?.hidden) })()`, 'it controls the two hidden days'),
  check(`document.querySelector('article[aria-current="date"] h3').getAttribute('aria-label')==='Wednesday 4'`, 'today stays on the board'),
])
await scenario('keyboard opens and closes the past days and keeps focus', [
  ...open(), locked(), ev(`${pastToggle}.focus()`), ['press', 'Enter'], allShown(),
  check(`document.activeElement===${pastToggle} && ${pastToggle}.getAttribute('aria-expanded')==='true' && ${pastToggle}.textContent.includes('Hide past days')`, 'same button now hides them'),
  ['press', 'Space'], stacked(), check(`document.activeElement===${pastToggle}`, 'focus stays on the button'),
])
await scenario('past and next weeks are never stacked, and a reload stacks again', [
  ...open(), locked(), showPast, allShown(),
  click('Previous week'), locked(), allShown(), check(`!${pastToggle}`, 'a week that is all past has no stack'),
  click('Next week'), locked(), click('Next week'), unlocked(), allShown(), check(`!${pastToggle}`, 'a future week has no stack'),
  ['reload'], locked(), wait(pastToggle), stacked(),
])
await scenario('an AI preview keeps every day on screen once some are past', [
  ...open(), locked(), click('Regenerate menu'),
  wait(`[...document.querySelectorAll('dialog[open] button')].some(b => b.textContent === 'Confirm schedule and generate' && !b.disabled)`),
  click('Confirm schedule and generate'), wait(`document.querySelector('[aria-label="Swap Monday dinner"]:not(:disabled)')`),
  // Tuesday of the previewed week, then any edit to render again.
  ev(`${f}.advanceClock(6*24*60*60*1000); document.querySelector('[aria-label="Swap Monday dinner"]').click(); ${sleep(300)}; document.querySelector('[role="menu"]:popover-open [role="menuitemradio"]:last-of-type').click(); ${sleep(300)}`),
  check(`document.querySelector('article[aria-current="date"] h3').getAttribute('aria-label').startsWith('Tuesday')`, 'the preview now has a past Monday'),
  allShown(), check(`!${pastToggle}`, 'previews have no stack'),
])
await scenario('phone shows a Show past days line with a 44px target', [
  ['set', 'viewport', '390', '844'], ...open(), locked(), stacked(),
  check(`${pastToggle}.innerText.trim()==='Show 2 past days' && ${pastToggle}.getBoundingClientRect().height>=44 && document.documentElement.scrollWidth<=390`, 'phone line is text only, tappable, without sideways scroll'),
  showPast, allShown(), click('Hide past days'), stacked(),
  ['set', 'viewport', '1440', '1200'],
])
await scenario('past days copy is singular on Tuesday and localized in Spanish', [
  ...open('ready', '/es'), locked(),
  check(`${pastToggle}.textContent.includes('2 hechos') && ${pastToggle}.textContent.includes('Mostrar 2 días pasados')`, 'Spanish plural'),
  ...open(), locked(), ev(`${f}.advanceClock(-24*60*60*1000)`), click('Previous week'), locked(), click('Next week'), locked(),
  check(`${pastToggle}.textContent.includes('1 done') && ${pastToggle}.textContent.trim().endsWith('Show 1 past day')`, 'English singular'),
])
const restHeading = `[...document.querySelectorAll('h2')].find(h => ['Rest of the week', 'Resto de la semana'].includes(h.textContent))`
await scenario('phone heads the days after today with Rest of the week', [
  ['set', 'viewport', '390', '844'], ...open(), locked(), wait(restHeading),
  check(`(() => { const top = el => el.getBoundingClientRect().top, day = name => document.querySelector('article h3[aria-label^="' + name + '"]'); return ${restHeading}.checkVisibility() && top(day('Wednesday')) < top(${restHeading}) && top(${restHeading}) < top(day('Thursday')) })()`, 'heading sits between today and tomorrow'),
  click('Next week'), unlocked(), allShown(), check(`!${restHeading}`, 'a week without today has no heading'),
  ...open('ready', '/es'), locked(), wait(restHeading), check(`${restHeading}.textContent==='Resto de la semana' && document.documentElement.scrollWidth<=390`, 'Spanish heading, no sideways scroll'),
  ['set', 'viewport', '1440', '1200'], check(`!${restHeading}.checkVisibility()`, 'the desktop board has no heading'),
])
await scenario('phone preview rows keep 44px swap buttons apart', [
  ['set', 'viewport', '390', '844'], ...open(), locked(), click('Regenerate menu'),
  wait(`[...document.querySelectorAll('dialog[open] button')].some(b => b.textContent === 'Confirm schedule and generate' && !b.disabled)`),
  click('Confirm schedule and generate'), wait(`document.querySelector('[aria-label="Swap Monday dinner"]:not(:disabled)')`),
  check(`(() => { const r=[...document.querySelectorAll('button[aria-label^="Swap "]')].map(b => b.getBoundingClientRect()); return r.length===14 && r.every(a => a.height>=44) && r.every((a,i) => r.slice(i+1).every(b => a.bottom<=b.top+1 || b.bottom<=a.top+1)) })()`, 'no two swap targets overlap'),
  ['set', 'viewport', '1440', '1200'],
])
const headings = `[...document.querySelectorAll('h2')].map(h => h.textContent).join('|')`
await scenario('empty week shows a hidden outline and opens the schedule', [
  ...open('empty'), wait(`${headings}.includes('Nothing planned this week.')`),
  check(`[...document.querySelectorAll('button')].filter(b => b.textContent.trim()==='Generate menu').length===1`, 'one Generate menu button'),
  check(`(() => { const outline=[...document.querySelectorAll('[aria-hidden="true"]')].find(el => el.textContent.includes('Mon 2')); return outline?.checkVisibility() && outline.textContent.includes('Sun 8') && !document.querySelector('article') })()`, 'the outline carries the viewed week and no day articles'),
  click('Set when you eat at home'), wait(`document.querySelector('[role="tab"][aria-selected="true"]')?.textContent.includes('Weekly Schedule')`),
  check(`${f}.saveRequests.length===0 && ${f}.generationRequests.length===0`, 'opening the schedule writes nothing'),
  ['set', 'viewport', '390', '844'], ...open('empty', '/es'), wait(`${headings}.includes('No hay nada planificado esta semana.')`),
  check(`[...document.querySelectorAll('button')].some(b => b.textContent.trim()==='Elige cuándo comes en casa') && document.documentElement.scrollWidth<=390`, 'Spanish phone empty week, no sideways scroll'),
  ['set', 'viewport', '1440', '1200'],
])
await scenario('generating shows the seven dates of the week being planned', [
  ...open(), locked(), click('Regenerate menu'), ev(`${f}.holdGeneration=true`),
  wait(`[...document.querySelectorAll('dialog[open] button')].some(b => b.textContent === 'Confirm schedule and generate' && !b.disabled)`),
  click('Confirm schedule and generate'), wait(`document.querySelector('[role="status"][aria-busy="true"] article') && ${f}.releaseGeneration`),
  check(`(() => { const busy=document.querySelector('[role="status"][aria-busy="true"]'), days=[...busy.querySelectorAll('article')]; return days.length===7 && days[0].textContent.includes('Mon 9') && days[6].textContent.includes('Sun 15') && busy.textContent.includes('Building next week’s menu…') })()`, 'seven target-week notes under the status line'),
  ev(`${f}.holdGeneration=false; ${f}.releaseGeneration()`),
  wait(`document.querySelector('[aria-label="Swap Monday dinner"]')`),
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
