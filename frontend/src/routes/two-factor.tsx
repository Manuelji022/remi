import './auth.css'

import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ComponentProps } from 'react'
import { useEffect, useRef, useState } from 'react'
import { getLocalizedPath, useI18n } from '#/i18n'
import { authClient } from '#/lib/auth-client'

export const Route = createFileRoute('/two-factor')({
  component: TwoFactorPage,
})

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

    const result = await authClient.twoFactor.sendOtp({ trustDevice: false })

    setIsSending(false)

    if (result.error) {
      setError(result.error.message ?? t('auth.otpSendError'))
    }
  }

  useEffect(() => {
    setShowSignupMessage(
      window.sessionStorage.getItem('remi:signupOtpPending') === 'true',
    )
    window.sessionStorage.removeItem('remi:signupOtpPending')

    if (hasSentInitialOtp.current) return
    hasSentInitialOtp.current = true
    void sendOtp()
  }, [])

  async function handleSubmit(event: FormSubmitEvent) {
    event.preventDefault()
    setError(null)
    setIsVerifying(true)

    const result = await authClient.twoFactor.verifyOtp({
      code,
      trustDevice: false,
    })

    setIsVerifying(false)

    if (result.error) {
      setError(result.error.message ?? t('auth.otpVerifyError'))
      return
    }

    await navigate({ to: locale === 'es' ? '/es' : '/' })
  }

  return (
    <main className="auth-page">
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

          <button className="auth-button" disabled={isVerifying} type="submit">
            {isVerifying ? t('auth.otpVerifying') : t('auth.otpVerify')}
          </button>
        </form>

        <button
          className="auth-secondary-button"
          disabled={isSending}
          onClick={sendOtp}
          type="button"
        >
          {isSending ? t('auth.otpSending') : t('auth.otpResend')}
        </button>

        <p className="auth-switch">
          <Link to={getLocalizedPath('/login', locale)}>
            {t('auth.backToLogin')}
          </Link>
        </p>
      </section>
    </main>
  )
}
