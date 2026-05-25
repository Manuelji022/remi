import './auth.css'

import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ComponentProps } from 'react'
import { useState } from 'react'
import { getLocalizedPath, useI18n } from '#/i18n'
import { authClient } from '#/lib/auth-client'

export const Route = createFileRoute('/login')({ component: LoginPage })

type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<'form'>['onSubmit']>
>[0]
type SignInData = { twoFactorRedirect?: boolean } | null

export function LoginPage() {
  const navigate = useNavigate()
  const { locale, t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormSubmitEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const result = await authClient.signIn.email({
      email,
      password,
    })

    if (result.error) {
      setIsSubmitting(false)
      setError(result.error.message ?? t('auth.loginError'))
      return
    }

    const data = result.data as SignInData

    if (data?.twoFactorRedirect) {
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
      <section className="auth-card" aria-labelledby="login-title">
        <h1 id="login-title">{t('auth.loginTitle')}</h1>
        <p className="auth-copy">{t('auth.loginCopy')}</p>

        <form className="auth-form" onSubmit={handleSubmit}>
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
              autoComplete="current-password"
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
            {isSubmitting ? t('auth.loggingIn') : t('auth.login')}
          </button>
        </form>

        <p className="auth-switch">
          {t('auth.noAccount')}{' '}
          <Link to={getLocalizedPath('/signup', locale)}>
            {t('auth.createOne')}
          </Link>
        </p>
      </section>
    </main>
  )
}
