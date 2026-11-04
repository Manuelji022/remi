import { Link, useNavigate } from '@tanstack/react-router'
import '../auth.css'
import { useState } from 'react'
import { getLocalizedPath, useI18n } from '#/shared/i18n'
import { useAuthForm } from '#/features/auth/useAuthForm'
import type { FormSubmitEvent } from '#/features/auth/useAuthForm'
import { authClient } from '#/features/auth/auth-client'

type SignInData = { twoFactorRedirect?: boolean } | null

const ERROR_MAPPING = {
  INVALID_EMAIL: 'auth.errors.invalidEmail',
  INVALID_PASSWORD: 'auth.errors.invalidPassword',
  INVALID_CREDENTIALS: 'auth.errors.invalidCredentials',
  RATE_LIMIT: 'auth.errors.rateLimited',
}

export function LoginPage() {
  const navigate = useNavigate()
  const { locale, t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { error, isSubmitting, setError, setIsSubmitting, handleApiError } =
    useAuthForm()

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
      handleApiError(result.error, ERROR_MAPPING, 'auth.loginError', t)
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
    <main className="auth-page" id="main">
      <section className="auth-card" aria-labelledby="login-title">
        <h1 id="login-title">{t('auth.loginTitle')}</h1>
        <p className="auth-copy">{t('auth.loginCopy')}</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            {t('auth.email')}
            <input
              autoComplete="email"
              name="email"
              spellCheck={false}
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

        <p className="auth-forgot">
          <Link to={getLocalizedPath('/forgot-password', locale)}>
            {t('auth.forgotPasswordLink')}
          </Link>
        </p>

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
