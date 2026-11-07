import { useNavigate } from '@tanstack/react-router'
import '../auth.css'
import type { ComponentProps } from 'react'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { LocalizedLink, getLocalizedPath, useI18n } from '#/shared/i18n'
import { authClient } from '#/features/auth/auth-client'

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

      await navigate({ to: getLocalizedPath('/', locale) })
    } catch {
      setError(t('auth.otpVerifyError'))
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <main className="auth-page" id="main">
      <section className="auth-card" aria-labelledby="two-factor-title">
        <h1 id="two-factor-title">{t('auth.otpTitle')}</h1>
        <p className="auth-copy">{t('auth.otpCopy')}</p>
        {showSignupMessage ? (
          <p className="auth-copy">{t('auth.signupOtpCopy')}</p>
        ) : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            {t('auth.otpCode')}
            <input
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              name="code"
              onChange={(event) => setCode(event.target.value)}
              pattern="[0-9]*"
              required
              type="text"
              value={code}
            />
          </label>

          {error ? <p className="auth-error">{error}</p> : null}

          <button
            className="btn btn-primary"
            disabled={isVerifying}
            type="submit"
          >
            {isVerifying ? t('auth.otpVerifying') : t('auth.otpVerify')}
          </button>
        </form>

        <button
          className="btn btn-secondary"
          disabled={isSending}
          onClick={sendOtp}
          type="button"
        >
          {isSending ? t('auth.otpSending') : t('auth.otpResend')}
        </button>

        <p className="auth-switch">
          <LocalizedLink className="text-link" to="/login">
            {t('auth.backToLogin')}
          </LocalizedLink>
        </p>
      </section>
    </main>
  )
}
