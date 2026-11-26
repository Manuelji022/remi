import { useNavigate } from '@tanstack/react-router'
import type { ComponentProps } from 'react'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Banner, Button, Field, TextLink } from '#/components/primitives'
import { getLocalizedPath, useI18n } from '#/shared/i18n'
import { OTP_EMAIL_STORAGE_KEY, authClient } from '#/features/auth/auth-client'
import { AuthLayout } from '#/features/auth/components/AuthLayout'
import { OtpInput } from '#/features/auth/components/OtpInput'
import { pathAfterSignIn } from '#/features/onboarding/path-after-sign-in'

type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<'form'>['onSubmit']>
>[0]

export function TwoFactorPage() {
  const navigate = useNavigate()
  const { locale, t } = useI18n()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [showSignupMessage, setShowSignupMessage] = useState(false)
  const hasSentInitialOtp = useRef(false)

  async function sendOtp() {
    setError(null)
    setIsSending(true)

    try {
      const result = await authClient.twoFactor.sendOtp({
        trustDevice: false,
      })

      if (result.error) {
        setError(result.error.message ?? t('auth.otpSendError'))
      }
    } catch {
      setError(t('auth.otpSendError'))
    } finally {
      setIsSending(false)
    }
  }

  const sendInitialOtp = useEffectEvent(sendOtp)

  useEffect(() => {
    setShowSignupMessage(
      window.sessionStorage.getItem('remi:signupOtpPending') === 'true',
    )
    window.sessionStorage.removeItem('remi:signupOtpPending')
    setEmail(window.sessionStorage.getItem(OTP_EMAIL_STORAGE_KEY))

    if (hasSentInitialOtp.current) return
    hasSentInitialOtp.current = true
    void sendInitialOtp()
  }, [])

  async function handleSubmit(event: FormSubmitEvent) {
    event.preventDefault()
    setError(null)
    setIsVerifying(true)

    try {
      const result = await authClient.twoFactor.verifyOtp({
        code,
        trustDevice: false,
      })

      if (result.error) {
        setError(result.error.message ?? t('auth.otpVerifyError'))
        return
      }

      window.sessionStorage.removeItem(OTP_EMAIL_STORAGE_KEY)
      await navigate({ to: getLocalizedPath(await pathAfterSignIn(), locale) })
    } catch {
      setError(t('auth.otpVerifyError'))
    } finally {
      setIsVerifying(false)
    }
  }

  const [beforeEmail, afterEmail] = t('auth.otpCopyEmail').split('{email}')

  return (
    <AuthLayout
      description={
        email ? (
          <>
            {beforeEmail}
            <strong>{email}</strong>
            {afterEmail}
          </>
        ) : (
          t('auth.otpCopy')
        )
      }
      headerSwitch={{
        prompt: t('auth.wrongAccount'),
        label: t('auth.backToLogin'),
        to: '/login',
      }}
      pitchCopy={t('auth.otpPitchCopy')}
      pitchTitle={t('auth.otpPitchTitle')}
      title={t('auth.otpTitle')}
    >
      <form className="auth-panel-form" onSubmit={handleSubmit}>
        {showSignupMessage ? (
          <Banner className="auth-banner" tone="info">
            {t('auth.signupOtpCopy')}
          </Banner>
        ) : null}
        {error ? (
          <Banner announce className="auth-banner" tone="error">
            {error}
          </Banner>
        ) : null}

        <Field hint={t('auth.otpHint')} label={t('auth.otpCode')}>
          <OtpInput name="code" onValueChange={setCode} required value={code} />
        </Field>

        <div className="auth-actions">
          <Button
            block
            disabled={isVerifying}
            size="lg"
            type="submit"
            variant="brand"
          >
            {isVerifying ? t('auth.otpVerifying') : t('auth.otpVerify')}
          </Button>
          <p className="auth-resend">
            {t('auth.otpNotReceived')}
            <TextLink
              className="auth-link"
              disabled={isSending}
              onClick={sendOtp}
              variant="inline"
            >
              {isSending ? t('auth.otpSending') : t('auth.otpResend')}
            </TextLink>
          </p>
        </div>
      </form>
    </AuthLayout>
  )
}
