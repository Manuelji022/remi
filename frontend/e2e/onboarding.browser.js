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
await run('wait', '--text', 'Your week starts with your recipes.')

await scenario('welcome greets by first name and starts the recipes step', async () => {
  await check(`document.body.innerText.includes('Hi, Ana') && !document.body.innerText.includes('Hi, Ana García')`, 'first name only')
  await check(`!document.querySelector('.site-header, .site-footer')`, 'no site header or footer')
  await run('find', 'role', 'button', 'click', '--name', 'Get started')
  await wait(`location.search === '?step=recipes' && document.activeElement === ${nameField}`)
})

await scenario('done cannot be reached with nothing saved', async () => {
  await run('open', `${base}/onboarding?step=done`)
  await run('wait', '--text', 'What do you cook at home?')
  await wait(`location.search === '?step=recipes'`)
})

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

const doneTitle = 'Your recipe book is ready!'
const finish = async () => {
  await run('find', 'role', 'button', 'click', '--name', 'Continue')
  await wait(`location.search === '?step=done' && document.activeElement?.textContent === '${doneTitle}'`)
}

await scenario('Continue shows the counted recipes, and Add more goes back', async () => {
  await finish()
  await check(`document.body.innerText.includes('5 recipes: 1 lunch and 4 dinners') && document.body.innerText.includes('Well done, Ana!')`, 'the summary counts')
  await check(`document.querySelectorAll('ul[aria-label="Your recipes"] li').length === 5`, 'one chip per recipe')
  await check(`!document.querySelector('header a[href$="weekly-menu-planner"]')`, 'nothing left to put off')
  await run('find', 'role', 'button', 'click', '--name', 'Add more recipes')
  await wait(`location.search === '?step=recipes' && ${nameField} !== null`)
})

await scenario('Generate my first menu opens the planner and its schedule dialog once', async () => {
  await finish()
  await run('find', 'role', 'button', 'click', '--name', 'Generate my first menu')
  await wait(`location.pathname === '/weekly-menu-planner' && location.search === '' && document.querySelector('dialog[open][aria-labelledby="ai-generation-title"]') !== null`)
  await run('reload')
  await run('wait', '--text', 'Preferences')
  await wait(`[...document.querySelectorAll('button')].some(button => button.textContent.includes('Generate') && !button.disabled)`)
  await run('wait', '1000')
  await check(`!document.querySelector('dialog[open]')`, 'a reload does not ask again')
})

await run('open', `${base}/onboarding?step=recipes`)
await run('wait', '--text', 'What do you cook at home?')

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

await scenario('phone: Back returns to welcome without sideways scroll', async () => {
  await run('find', 'role', 'button', 'click', '--name', 'Back', '--exact')
  await run('wait', '--text', 'Your week starts with your recipes.')
  await check(noOverflow, 'welcome fits 390')
  await run('open', `${base}/onboarding?step=done`)
  await run('wait', '--text', doneTitle)
  await check(noOverflow, 'done fits 390')
})

await scenario('Spanish copy and counts', async () => {
  await run('open', `${base}/es/onboarding?step=recipes`)
  await run('wait', '--text', '¿Qué cocinas en casa?')
  await wait(`document.body.innerText.includes('5 recetas · 1 comida · 4 cenas')`)
  await check(`document.querySelector('header a:last-child').getAttribute('href') === '/es/weekly-menu-planner'`, 'the way out keeps the locale')
})

await scenario('guests are sent to the planner', async () => {
  await run('eval', `window.onboardingFixture.set('signedOut', true)`)
  await run('open', `${base}/es/onboarding`)
  await wait(`location.pathname === '/es/weekly-menu-planner'`)
})
