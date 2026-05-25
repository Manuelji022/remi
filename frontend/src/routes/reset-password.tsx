import './auth.css'

import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import type { ComponentProps } from 'react'
import { useState } from 'react'
import { getLocalizedPath, useI18n } from '#/i18n'
import { authClient } from '#/lib/auth-client'

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
})

type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<'form'>['onSubmit']>
>[0]

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { locale, t } = useI18n()
  const search = useSearch({ from: '/reset-password' })
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const token =
    typeof search.token === 'string' ? search.token : undefined

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
      setError(result.error.message ?? t('auth.resetPasswordError'))
      return
    }

    setIsSubmitting(false)
    setDone(true)
  }

  if (done) {
    return (
      <main className="auth-page">
        <section className="auth-card" aria-labelledby="reset-done-title">
          <h1 id="reset-done-title">{t('auth.resetPasswordDoneTitle')}</h1>
          <p className="auth-copy">{t('auth.resetPasswordDoneCopy')}</p>
          <button
            className="auth-button"
            onClick={() =>
              navigate({ to: getLocalizedPath('/login', locale) })
            }
            type="button"
          >
            {t('auth.login')}
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="auth-page">
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

          <button
            className="auth-button"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting
              ? t('auth.resettingPassword')
              : t('auth.resetPassword')}
          </button>
        </form>
      </section>
    </main>
  )
}
