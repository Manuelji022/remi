import { useNavigate, useSearch } from '@tanstack/react-router'
import type { FormSubmitEvent } from '#/features/auth/useAuthForm'
import '../auth.css'
import { useState } from 'react'
import { getLocalizedPath, useI18n } from '#/shared/i18n'
import { useAuthForm } from '#/features/auth/useAuthForm'
import { authClient } from '#/features/auth/auth-client'

const ERROR_MAPPING = {
  INVALID_TOKEN: 'auth.errors.resetPasswordInvalidToken',
  EXPIRED_TOKEN: 'auth.errors.resetPasswordExpiredToken',
  INVALID_PASSWORD: 'auth.errors.invalidPassword',
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { locale, t } = useI18n()
  const search = useSearch({
    from: '/{-$locale}/reset-password',
  })
  const [password, setPassword] = useState('')
  const { error, isSubmitting, setError, setIsSubmitting, handleApiError } =
    useAuthForm()
  const [done, setDone] = useState(false)

  const token = search.token

  async function handleSubmit(event: FormSubmitEvent) {
    event.preventDefault()
    setError(null)

    if (!token) {
      setError(t('auth.resetPasswordInvalidToken'))
      return
    }

    setIsSubmitting(true)

    const result = await authClient.resetPassword({
      newPassword: password,
      token,
    })

    if (result.error) {
      setIsSubmitting(false)
      handleApiError(result.error, ERROR_MAPPING, 'auth.resetPasswordError', t)
      return
    }

    setIsSubmitting(false)
    setDone(true)
  }

  if (done) {
    return (
      <main className="auth-page" id="main">
        <section className="auth-card" aria-labelledby="reset-done-title">
          <h1 id="reset-done-title">{t('auth.resetPasswordDoneTitle')}</h1>
          <p className="auth-copy">{t('auth.resetPasswordDoneCopy')}</p>
          <button
            className="auth-button"
            onClick={() => navigate({ to: getLocalizedPath('/login', locale) })}
            type="button"
          >
            {t('auth.login')}
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="auth-page" id="main">
      <section className="auth-card" aria-labelledby="reset-title">
        <h1 id="reset-title">{t('auth.resetPasswordTitle')}</h1>
        <p className="auth-copy">{t('auth.resetPasswordCopy')}</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            {t('auth.newPassword')}
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
            {isSubmitting
              ? t('auth.resettingPassword')
              : t('auth.resetPassword')}
          </button>
        </form>
      </section>
    </main>
  )
}
