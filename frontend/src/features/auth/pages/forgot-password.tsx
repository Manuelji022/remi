import '../auth.css'
import type { ComponentProps } from 'react'
import { useState } from 'react'
import { LocalizedLink, getLocalizedPath, useI18n } from '#/shared/i18n'
import { authClient } from '#/features/auth/auth-client'

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

    try {
      const origin = window.location.origin
      const redirectTo = `${origin}${getLocalizedPath('/reset-password', locale)}`

      const result = await authClient.requestPasswordReset({
        email,
        redirectTo,
      })

      if (result.error) {
        setError(result.error.message ?? t('auth.resetPasswordError'))
        return
      }

      setSent(true)
    } catch {
      setError(t('auth.resetPasswordError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page" id="main">
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
                spellCheck={false}
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>

            {error ? <p className="auth-error">{error}</p> : null}

            <button
              className="btn btn-primary"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? t('auth.sending') : t('auth.sendResetLink')}
            </button>
          </form>
        )}

        <p className="auth-switch">
          <LocalizedLink className="text-link" to="/login">
            {t('auth.backToLogin')}
          </LocalizedLink>
        </p>
      </section>
    </main>
  )
}
