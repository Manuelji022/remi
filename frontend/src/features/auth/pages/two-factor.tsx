import { Link, useNavigate } from '@tanstack/react-router'
import type { FormSubmitEvent } from '#/features/auth/useAuthForm'
import '../auth.css'
import { useEffect, useRef, useState } from 'react'
import { getLocalizedPath, useI18n } from '#/shared/i18n'
import { AUTH_STORAGE_KEYS } from '#/features/auth/storage-keys'
import { useAuthForm } from '#/features/auth/useAuthForm'
import { authClient } from '#/features/auth/auth-client'

const ERROR_MAPPING = {
  INVALID_CODE: 'auth.errors.invalidOtpCode',
  RATE_LIMIT: 'auth.errors.rateLimited',
  EXPIRED: 'auth.errors.otpExpired',
}

export function TwoFactorPage() {
  const navigate = useNavigate()
  const { locale, t } = useI18n()
  const [code, setCode] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showSignupMessage, setShowSignupMessage] = useState(false)
  const hasSentInitialOtp = useRef(false)
  const {
    error,
    isSubmitting: isVerifying,
    setError,
    setIsSubmitting: setIsVerifying,
    handleApiError,
  } = useAuthForm()

  async function sendOtp() {
    setError(null)
    setIsSending(true)

    const result = await authClient.twoFactor.sendOtp({
      trustDevice: false,
    })

    setIsSending(false)

    if (result.error) {
      handleApiError(result.error, ERROR_MAPPING, 'auth.otpSendError', t)
    }
  }

  useEffect(() => {
    setShowSignupMessage(
      window.sessionStorage.getItem(AUTH_STORAGE_KEYS.signup.otpPending) ===
        'true',
    )
    window.sessionStorage.removeItem(AUTH_STORAGE_KEYS.signup.otpPending)

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

    if (result.error) {
      setIsVerifying(false)
      handleApiError(result.error, ERROR_MAPPING, 'auth.otpVerifyError', t)
      return
    }

    await navigate({ to: getLocalizedPath('/', locale) })
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
