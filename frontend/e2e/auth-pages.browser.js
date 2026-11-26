/* global browser, emit */
const base = 'http://127.0.0.1:3102'
const input = `document.querySelector('.otp-input')`
const wait = condition => ['wait', '--fn', `Boolean(${condition})`]
const hydrated = selector => wait(`Object.keys(document.querySelector('${selector}') ?? {}).some(key => key.startsWith('__react'))`)
const check = (condition, message) => ['eval', `(() => { if (!(${condition})) throw new Error(${JSON.stringify(message)}); return true })()`]
const button = name => ['find', 'role', 'button', 'click', '--name', name, '--exact']
const fill = (label, value) => ['find', 'label', label, 'fill', value, '--exact']
const type = text => ['keyboard', 'type', text]
// Headless Chrome has no clipboard to paste from, so this fires the same `paste`
// event, with its data, and requires the component to take it over.
const paste = text => ['eval', `(() => {
  const clipboardData = new DataTransfer()
  clipboardData.setData('text', ${JSON.stringify(text)})
  const handled = !${input}.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }))
  if (!handled) throw new Error('the full code paste was not handled')
  return true
})()`]
const requests = path => `window.authFixture.requests.filter(request => request.path === '${path}')`
const code = value => wait(`${input}.value === '${value}' && [...document.querySelectorAll('.otp-box')].map(box => box.textContent).join('') === '${value}'`)
const overflow = check('document.documentElement.scrollWidth <= innerWidth', 'no horizontal scroll')

const logIn = (prefix, labels) => [
  ['open', `${base}${prefix}/login`], hydrated('form'),
  fill(labels.email, 'ana@remi.app'), fill(labels.password, 'basil-and-butter-26'), button(labels.submit),
  wait(`location.pathname === '${prefix}/two-factor' && ${input}`),
  wait(`${requests('two-factor/send-otp')}.length >= 1`),
]
const en = { email: 'Email', password: 'Password', submit: 'Log in' }
const es = { email: 'Email', password: 'Contraseña', submit: 'Iniciar sesión' }

let failed = 0
async function scenario(name, steps) {
  try {
    for (const step of steps) {
      const result = await browser(Array.isArray(step) ? { args: step } : step)
      if (!result.success) throw new Error(JSON.stringify(result.error ?? result.data))
    }
    emit({ scenario: name, verdict: 'PASS' })
  } catch (error) {
    failed++
    emit({ scenario: name, verdict: 'FAIL', error: String(error) })
  }
}

await browser({ args: ['set', 'viewport', '1440', '900'] })

await scenario('wrong password shows the mismatch banner; the eye shows and hides the password', [
  ['open', `${base}/login`], hydrated('form'),
  fill('Email', 'ana@remi.app'), fill('Password', 'wrong-password'),
  button('Show password'), check(`document.querySelector('input[name=password]').type === 'text'`, 'password is shown'),
  button('Hide password'), check(`document.querySelector('input[name=password]').type === 'password'`, 'password is hidden'),
  button('Log in'),
  wait(`document.querySelector('[role=alert]')?.textContent.includes("That email and password don't match.")`),
  check(`location.pathname === '/login'`, 'stays on log in'),
])

await scenario('log in reaches two-factor, which names the email and has one labelled input', [
  ...logIn('', en),
  check(`document.querySelector('main').textContent.includes('Enter the 6-digit code we sent to ana@remi.app.')`, 'email is named'),
  check(`document.querySelectorAll('main input').length === 1 && ${input}.labels[0].textContent === 'Verification code'`, 'one input with one label'),
  check(`${input}.autocomplete === 'one-time-code' && ${input}.inputMode === 'numeric' && document.querySelector('.otp-boxes').getAttribute('aria-hidden') === 'true'`, 'autofill, numeric keyboard, hidden boxes'),
  overflow, ['screenshot', 'e2e/artifacts/auth-pages/two-factor-en.png'],
])

await scenario('typing fills boxes left to right, drops non-digits, and backspace removes the last one', [
  ['find', 'label', 'Verification code', 'click', '--exact'],
  type('4a 81'), code('481'),
  ['press', 'Backspace'], code('48'),
  ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['press', 'Home'], type('1'), code('481'),
])

await scenario('a short code is not sent', [
  button('Verify code'), ['wait', '300'],
  check(`${requests('two-factor/verify-otp')}.length === 0 && !${input}.validity.valid`, 'blocked by the browser'),
])

await scenario('pasting a code with spaces replaces a partly typed one', [
  ['focus', '.otp-input'], paste('481 913'), code('481913'),
])

await scenario('inserted text with a space, as autofill sends it, is not cut short', [
  ['focus', '.otp-input'], ['eval', `${input}.select(); true`], ['press', 'Backspace'], code(''),
  ['keyboard', 'inserttext', '481 913'], code('481913'),
])

await scenario('a seventh digit is ignored; select all then typing replaces the code', [
  ['focus', '.otp-input'], type('7'), code('481913'),
  ['eval', `${input}.select(); true`], type('5'), code('5'),
])

await scenario('a wrong code keeps the digits and shows an error', [
  ['focus', '.otp-input'], paste('000-000'), code('000000'), button('Verify code'),
  wait(`document.querySelector('[role=alert]')?.textContent.includes('Invalid code')`),
  code('000000'),
])

await scenario('resend asks for a new code', [
  ['eval', `window.authFixture.before = ${requests('two-factor/send-otp')}.length; true`],
  button('Resend code'),
  wait(`${requests('two-factor/send-otp')}.length === window.authFixture.before + 1`),
])

await scenario('pasting the right code verifies it and opens the weekly planner', [
  ['focus', '.otp-input'], paste('482913'), code('482913'), button('Verify code'),
  wait(`location.pathname === '/weekly-menu-planner'`),
  check(`${requests('two-factor/verify-otp')}.at(-1).body.code === '482913' && sessionStorage.getItem('remi:otpEmail') === null`, 'code sent, stored email cleared'),
])

await scenario('Spanish keeps its locale through to the planner, at 390 wide', [
  ['set', 'viewport', '390', '844'], ...logIn('/es', es),
  check(`${input}.labels[0].textContent === 'Código de verificación'`, 'Spanish label'),
  overflow, ['focus', '.otp-input'], paste('482913'), code('482913'), button('Verificar código'),
  wait(`location.pathname === '/es/weekly-menu-planner'`),
])

await scenario('a direct visit without a stored email still reads as a sentence', [
  ['eval', `sessionStorage.clear(); true`],
  ['open', `${base}/two-factor`], hydrated('form'),
  check(`document.querySelector('main').textContent.includes('Enter the 6-digit code we sent to your email address.')`, 'generic copy'),
  overflow,
])

if (failed) emit({ summary: `${failed} scenario(s) failed`, verdict: 'FAIL' })
