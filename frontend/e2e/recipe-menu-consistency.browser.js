/* global browser, emit */
// Run this file's contents with agent_browser_code in the session launched
// with recipe-menu-consistency.init.js. It uses only synthetic auth/data.
const run = async (args, stdin) => {
  const result = await browser({ args, stdin, timeoutMs: 60000 })
  if (!result.success) {
    emit({ verdict: 'FAIL', args, error: result.error, data: result.data })
    throw new Error(`Browser step failed: ${args.join(' ')}`)
  }
  return result
}

const check = async (condition, message) =>
  run(
    ['eval', '--stdin'],
    `(() => {
      if (!(${condition})) throw new Error(${JSON.stringify(message)});
      return { verdict: 'PASS', check: ${JSON.stringify(message)} };
    })()`,
  )

await run(['wait', '--text', 'Assigned dinner'])
await run(['find', 'role', 'button', 'click', '--name', 'Preferences', '--exact'])
await run(['find', 'role', 'tab', 'click', '--name', 'My Recipes', '--exact'])
await check(
  `document.querySelector('#preferences-recipes-panel')?.innerText.includes('Cancel only discards schedule changes')`,
  'recipe persistence and cancel behavior are explained',
)

await run([
  'find',
  'role',
  'button',
  'click',
  '--name',
  'Delete Assigned dinner',
  '--exact',
])
await run(
  [
    'wait',
    '--fn',
    `window.recipeConsistency.requests.filter(r=>r.kind==='menu-read').length >= 2 && Object.values(window.recipeConsistency.menus)[0].days.Monday.dinnerRecipeId === null && document.querySelector('[role=dialog]')?.getAttribute('aria-busy') === 'false' && document.querySelector('[role=tab][aria-selected=true]')?.innerText === 'My Recipes' && !document.querySelector('[role=dialog]')?.querySelector('.panel-primary-btn').disabled`,
  ],
)

await run(['find', 'role', 'tab', 'click', '--name', 'Weekly Schedule', '--exact'])
await run([
  'click',
  '#preferences-schedule-panel .panel-day-card:first-child .panel-context-pill:first-child',
])
await run(['find', 'role', 'button', 'click', '--name', 'Save preferences', '--exact'])
await run([
  'wait',
  '--fn',
  `document.body.innerText.includes('Preferences saved.') && window.recipeConsistency.posts.filter(post=>post.kind==='menu-save').at(-1)?.data.days.Monday.dinnerRecipeId === null`,
])

await run(['find', 'role', 'button', 'click', '--name', 'Preferences'])
await run(['find', 'role', 'tab', 'click', '--name', 'My Recipes', '--exact'])
await run(['fill', 'input[name=recipeName]', 'Persistent recipe'])
await run(['eval', '--stdin'], 'window.recipeConsistency.holds.create = true')
await run(['find', 'role', 'button', 'click', '--name', 'Add recipe', '--exact'])
await run([
  'wait',
  '--fn',
  `Boolean(window.recipeConsistency.release.create) && window.recipeConsistency.posts.filter(post=>post.kind==='recipe-create').length === 1 && document.querySelector('[role=dialog]')?.getAttribute('aria-busy') === 'true' && document.querySelector('[role=dialog] .panel-add-btn')?.disabled && document.querySelector('[role=dialog] .panel-secondary-btn')?.disabled && document.querySelector('[role=dialog] .panel-primary-btn')?.disabled`,
])
await run(
  ['eval', '--stdin'],
  'window.recipeConsistency.holds.create = false; window.recipeConsistency.release.create()',
)
await run([
  'wait',
  '--fn',
  `document.body.innerText.includes('Persistent recipe') && document.querySelector('[role=dialog]')?.getAttribute('aria-busy') === 'false' && window.recipeConsistency.requests.filter(r=>r.kind==='menu-read').length >= 3`,
])
await run(['find', 'role', 'button', 'click', '--name', 'Cancel', '--exact'])
await run(['find', 'role', 'button', 'click', '--name', 'Preferences'])
await run(['find', 'role', 'tab', 'click', '--name', 'My Recipes', '--exact'])
await run([
  'wait',
  '--fn',
  `window.recipeConsistency.posts.filter(post=>post.kind==='recipe-create').length === 1 && [...document.querySelectorAll('.panel-recipe-card h4')].some(node=>node.textContent==='Persistent recipe')`,
])

emit({
  verdict: 'PASS',
  scenarios: [
    'immediate recipe persistence note',
    'assigned recipe deletion refreshes menu and names before writes',
    'schedule save omits deleted recipe ID',
    'pending create is single-submit and blocks conflicting actions',
    'cancel retains created recipe',
  ],
  posts: await run(
    ['eval', '--stdin'],
    `window.recipeConsistency.posts.map(post=>({kind:post.kind,name:post.data.name,deletedId:post.data.id,scheduledDinnerId:post.data.days?.Monday?.dinnerRecipeId}))`,
  ),
})
