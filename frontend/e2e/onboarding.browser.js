/* global browser, emit */
// Run with e2e/harness.runner.js in a session launched with onboarding.init.js.
const base = 'http://127.0.0.1:3103'

const run = async (...args) => {
  const result = await browser({ args })
  if (!result.success) throw new Error(`${args.join(' ')}: ${result.error}`)
  return result
}
const wait = (condition) => run('wait', '--fn', condition)
const check = (condition, message) =>
  browser({
    args: ['eval', '--stdin'],
    stdin: `if (!(${condition})) throw new Error(${JSON.stringify(message)}); true`,
  }).then((result) => {
    if (!result.success) throw new Error(`${message}: ${result.error}`)
  })

const scenario = async (name, step) => {
  try {
    await step()
    emit({ scenario: name, verdict: 'PASS' })
  } catch (error) {
    emit({ scenario: name, verdict: 'FAIL', error: String(error) })
  }
}

const continueButton = `[...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Continue')`
const nameField = `document.querySelector('input[name=recipeName]')`
const posts = 'window.onboardingFixture.posts'
const noOverflow = `document.documentElement.scrollWidth <= window.innerWidth`

await run('set', 'viewport', '1440', '900')
await run('open', `${base}/onboarding`)
await run('wait', '--text', 'What do you cook at home?')

await scenario('Continue waits for the first recipe', async () => {
  await check(`${continueButton}.disabled`, 'Continue starts disabled')
  await check(`document.activeElement === ${nameField}`, 'the name field starts focused')
  await check(
    `[...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Save recipe').disabled`,
    'Save waits for a name',
  )
})

await scenario('Enter saves a recipe and refocuses the empty name field', async () => {
  await run('keyboard', 'type', 'Lentil stew')
  await run('find', 'role', 'radio', 'click', '--name', 'Lunch')
  await run('focus', 'input[name=recipeName]')
  await run('press', 'Enter')
  await wait(`${posts}.length === 1 && document.activeElement === ${nameField} && ${nameField}.value === ''`)
  await check(`${posts}[0].name === 'Lentil stew' && ${posts}[0].slot === 'lunch' && ${posts}[0].ingredients.length === 0`, 'the typed recipe is sent')
  await check(`!${continueButton}.disabled`, 'one recipe enables Continue')
  await check(`document.querySelector('aside').innerText.includes('1 recipe · 1 lunch · 0 dinners') && document.querySelector('aside').innerText.includes('Just added')`, 'the list counts and marks it')
})

await scenario('an empty name does not save on Enter', async () => {
  await run('press', 'Enter')
  await check(`${posts}.length === 1`, 'nothing is sent')
})

await scenario('the tip leaves with five recipes of both meals', async () => {
  await run('find', 'role', 'radio', 'click', '--name', 'Dinner')
  for (const [index, name] of ['Pumpkin soup', 'Baked salmon', 'Omelette', 'Rice bowl'].entries()) {
    await check(`document.querySelector('aside').innerText.includes('With 5 or more')`, 'the tip nudges below five')
    await run('fill', 'input[name=recipeName]', name)
    await run('press', 'Enter')
    await wait(`${posts}.length === ${index + 2} && ${nameField}.value === ''`)
  }
  await check(`!document.querySelector('aside').innerText.includes('With 5 or more')`, 'the tip is gone')
})

await scenario('phone: ingredients start collapsed and the list opens from the bar', async () => {
  await run('set', 'viewport', '390', '844')
  await check(`!document.querySelector('.recipe-ingredient-name').checkVisibility()`, 'ingredients are collapsed')
  await run('find', 'role', 'button', 'click', '--name', 'Add ingredients (optional) For your shopping list. Now or later.')
  await wait(`document.activeElement.getAttribute('aria-label') === 'Ingredient 1'`)
  // Keyboard, because the tool reads the small button's own 44px tap area as an overlay.
  await run('eval', `[...document.querySelectorAll('aside button')].find(button => button.textContent.trim() === 'View').focus()`)
  await run('press', 'Enter')
  await wait(`document.querySelector('dialog[open]')?.innerText.includes('Pumpkin soup')`)
  await run('find', 'role', 'button', 'click', '--name', 'Close', '--exact')
  await check(noOverflow, 'no sideways scroll at 390')
})

await scenario('Spanish copy and counts', async () => {
  await run('open', `${base}/es/onboarding`)
  await run('wait', '--text', '¿Qué cocinas en casa?')
  await wait(`document.body.innerText.includes('5 recetas · 1 comida · 4 cenas')`)
  await check(`document.querySelector('header a:last-child').getAttribute('href') === '/es/weekly-menu-planner'`, 'the way out keeps the locale')
})

await scenario('guests are sent to the planner', async () => {
  await run('eval', `window.onboardingFixture.set('signedOut', true)`)
  await run('open', `${base}/es/onboarding`)
  await wait(`location.pathname === '/es/weekly-menu-planner'`)
})
