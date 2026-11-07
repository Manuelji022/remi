export default async function scenario({
  assert,
  browser,
  evaluate,
  wait,
  click,
  open,
  emit,
  artifact,
}) {
  const auth = "document.querySelector('.header-auth')"

  await open('ok', 'Generate menu')
  const base = await evaluate('location.origin')
  await wait(
    `${auth}?.innerText.includes('Synthetic E2E') && ${auth}?.innerText.includes('Log out')`,
  )
  const signedIn = await evaluate(`${auth}.innerText`)
  assert.match(signedIn, /Synthetic E2E/)
  assert.match(signedIn, /Log out/)
  await browser(['screenshot', artifact.replace(/\.json$/, '-signed-in.png')])
  emit('signed-in header shows the current user and Log out', signedIn)

  await click('Log out')
  await wait(
    `location.pathname === '/' && ${auth}?.innerText.includes('Log in') && ${auth}?.innerText.includes('Sign up')`,
  )
  const signedOut = await evaluate(`${auth}.innerText`)
  assert.match(signedOut, /Log in/)
  assert.match(signedOut, /Sign up/)
  await browser(['screenshot', artifact.replace(/\.json$/, '-signed-out.png')])
  emit('sign-out navigates home and shows the signed-out header', signedOut)

  await browser([
    'network',
    'route',
    '*',
    '--abort',
    '--resource-type',
    'script',
  ])
  try {
    await browser(['open', `${base}/`])
    await wait(`${auth}?.getAttribute('aria-busy') === 'true'`)
    const loading = await evaluate(
      `(() => { const element = ${auth}; const box = element.getBoundingClientRect(); return { busy: element.getAttribute('aria-busy'), children: element.childElementCount, width: box.width, height: box.height } })()`,
    )
    assert.equal(loading.busy, 'true')
    assert.equal(loading.children, 0)
    assert(loading.width > 0)
    assert(loading.height > 0)
    await browser(['screenshot', artifact.replace(/\.json$/, '-loading.png')])
    emit('server-rendered pending header is empty and reserves space', loading)
  } finally {
    await browser(['network', 'unroute', '*'])
  }

  await browser(['open', `${base}/es`])
  await wait(
    `${auth}?.getAttribute('aria-busy') === 'false' && ${auth}?.innerText.includes('Iniciar sesión') && ${auth}?.innerText.includes('Registrarse')`,
  )
  const logo = await evaluate(
    `(() => { const link = document.querySelector('.header-logo'); return { label: link.getAttribute('aria-label'), dotHidden: link.querySelector('.header-logo-span')?.getAttribute('aria-hidden') } })()`,
  )
  assert.equal(logo.label, 'Inicio de Remi')
  assert.equal(logo.dotHidden, 'true')
  await browser([
    'find',
    'role',
    'link',
    'click',
    '--name',
    logo.label,
    '--exact',
  ])
  assert.equal(await evaluate('location.pathname'), '/es')
  emit('Spanish logo link exposes its localized accessible name', logo)
}
