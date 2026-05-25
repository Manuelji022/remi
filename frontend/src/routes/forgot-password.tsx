import './auth.css'

import { Link, createFileRoute } from '@tanstack/react-router'
import type { ComponentProps } from 'react'
import { useState } from 'react'
import { getLocalizedPath, useI18n } from '#/i18n'
import { authClient } from '#/lib/auth-client'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<'form'>['onSubmit']>
>[0]

export function ForgotPasswordPage() {
  const { locale, t } = useI18n()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: FormSubmitEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : (process.env.BETTER_AUTH_URL ?? '')
    const redirectTo = `${origin}${getLocalizedPath('/reset-password', locale)}`

    const result = await authClient.requestPasswordReset({
      email,
      redirectTo,
    })

    if (result.error) {
      setIsSubmitting(false)
      setError(result.error.message ?? t('auth.resetPasswordError'))
      return
    }

    setIsSubmitting(false)
    setSent(true)
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="forgot-title">
        <h1 id="forgot-title">{t('auth.forgotPasswordTitle')}</h1>
        <p className="auth-copy">{t('auth.forgotPasswordCopy')}</p>

        {sent ? (
          <p className="auth-success">{t('auth.resetPasswordSent')}</p>
        ) : (
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

            {error ? <p className="auth-error">{error}</p> : null}

            <button
              className="auth-button"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? t('auth.sending') : t('auth.sendResetLink')}
            </button>
          </form>
        )}

        <p className="auth-switch">
          <Link to={getLocalizedPath('/login', locale)}>
            {t('auth.backToLogin')}
          </Link>
        </p>
      </section>
    </main>
  )
}
