import '../auth.css'
import type { ComponentProps } from 'react'
import { useState } from 'react'
import {
  Banner,
  Button,
  Card,
  Field,
  Input,
  TextLink,
} from '#/components/primitives'
import { getLocalizedPath, useI18n } from '#/shared/i18n'
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
      <Card as="section" className="auth-card" aria-labelledby="forgot-title">
        <h1 id="forgot-title">{t('auth.forgotPasswordTitle')}</h1>
        <p className="auth-copy">{t('auth.forgotPasswordCopy')}</p>

        {sent ? (
          <Banner tone="success" announce>
            {t('auth.resetPasswordSent')}
          </Banner>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <Field label={t('auth.email')}>
              <Input
                autoComplete="email"
                name="email"
                spellCheck={false}
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </Field>

            {error ? (
              <Banner tone="error" announce>
                {error}
              </Banner>
            ) : null}

            <Button block variant="brand" disabled={isSubmitting} type="submit">
              {isSubmitting ? t('auth.sending') : t('auth.sendResetLink')}
            </Button>
          </form>
        )}

        <p className="auth-switch">
          <TextLink to="/login">{t('auth.backToLogin')}</TextLink>
        </p>
      </Card>
    </main>
  )
}
