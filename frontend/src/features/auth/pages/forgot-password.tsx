import type { ComponentProps } from 'react'
import { useState } from 'react'
import {
  Banner,
  Button,
  Field,
  Icon,
  Input,
  TextLink,
  useToast,
} from '#/components/primitives'
import { getLocalizedPath, useI18n } from '#/shared/i18n'
import { authClient } from '#/features/auth/auth-client'
import { AuthLayout } from '#/features/auth/components/AuthLayout'

type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<'form'>['onSubmit']>
>[0]

export function ForgotPasswordPage() {
  const { locale, t } = useI18n()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function requestLink() {
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
        return false
      }

      return true
    } catch {
      setError(t('auth.resetPasswordError'))
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSubmit(event: FormSubmitEvent) {
    event.preventDefault()
    if (await requestLink()) setSent(true)
  }

  async function handleResend() {
    if (await requestLink()) {
      toast({ message: t('auth.resetLinkResent'), tone: 'success' })
    }
  }

  const [beforeEmail, afterEmail] = t('auth.resetPasswordSent').split('{email}')
  const errorBanner = error ? (
    <Banner announce className="auth-banner" tone="error">
      {error}
    </Banner>
  ) : null
  const backToLogin = (
    <TextLink className="auth-back" icon={<Icon name="back" />} to="/login">
      {t('auth.backToLogin')}
    </TextLink>
  )

  return (
    <AuthLayout
      badge={sent ? 'email' : undefined}
      description={
        sent ? (
          <>
            {beforeEmail}
            <strong>{email}</strong>
            {afterEmail}
          </>
        ) : (
          t('auth.forgotPasswordCopy')
        )
      }
      headerSwitch={{
        prompt: t('auth.rememberedPassword'),
        label: t('auth.login'),
        to: '/login',
      }}
      pitchCopy={t('auth.forgotPitchCopy')}
      pitchTitle={t('auth.forgotPitchTitle')}
      title={t(sent ? 'auth.resetSentTitle' : 'auth.forgotPasswordTitle')}
    >
      {sent ? (
        <div className="auth-actions">
          {errorBanner}
          <Button block onClick={handleResend} pending={isSubmitting} size="lg">
            {t('auth.resendLink')}
          </Button>
          {backToLogin}
        </div>
      ) : (
        <form className="auth-panel-form" onSubmit={handleSubmit}>
          {errorBanner}
          <Field label={t('auth.email')}>
            <Input
              autoComplete="email"
              name="email"
              spellCheck={false}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              required
              type="email"
              value={email}
            />
          </Field>

          <div className="auth-actions">
            <Button
              block
              disabled={isSubmitting}
              size="lg"
              type="submit"
              variant="brand"
            >
              {isSubmitting ? t('auth.sending') : t('auth.sendResetLink')}
            </Button>
            {backToLogin}
          </div>
        </form>
      )}
    </AuthLayout>
  )
}
