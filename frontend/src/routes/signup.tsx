import './auth.css'

import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ComponentProps } from 'react'
import { useState } from 'react'
import { getLocalizedPath, useI18n } from '#/i18n'
import { authClient } from '#/lib/auth-client'

export const Route = createFileRoute('/signup')({ component: SignupPage })

type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<'form'>['onSubmit']>
>[0]
type SignInData = { twoFactorRedirect?: boolean } | null

export function SignupPage() {
  const navigate = useNavigate()
  const { locale, t } = useI18n()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormSubmitEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const result = await authClient.signUp.email({
      name,
      email,
      password,
    })

    if (result.error) {
      setIsSubmitting(false)
      setError(result.error.message ?? t('auth.signupError'))
      return
    }

    await authClient.signOut()

    const loginResult = await authClient.signIn.email({ email, password })

    if (loginResult.error) {
      setIsSubmitting(false)
      setError(loginResult.error.message ?? t('auth.signupOtpStartError'))
      return
    }

    const data = loginResult.data as SignInData

    if (data?.twoFactorRedirect) {
      window.sessionStorage.setItem('remi:signupOtpPending', 'true')
      setIsSubmitting(false)
      await navigate({ to: getLocalizedPath('/two-factor', locale) })
      return
    }

    await authClient.signOut()
    setIsSubmitting(false)
    setError(t('auth.twoFactorRequiredError'))
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="signup-title">
        <h1 id="signup-title">{t('auth.signupTitle')}</h1>
        <p className="auth-copy">{t('auth.signupCopy')}</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            {t('auth.name')}
            <input
              autoComplete="name"
              name="name"
              onChange={(event) => setName(event.target.value)}
              required
              type="text"
              value={name}
            />
          </label>

          <label className="auth-field">
            {t('auth.email')}
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <label className="auth-field">
            {t('auth.password')}
            <input
              autoComplete="new-password"
              minLength={8}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {error ? <p className="auth-error">{error}</p> : null}

          <button className="auth-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? t('auth.creatingAccount') : t('auth.createAccount')}
          </button>
        </form>

        <p className="auth-switch">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link to={getLocalizedPath('/login', locale)}>{t('auth.login')}</Link>
        </p>
      </section>
    </main>
  )
}
