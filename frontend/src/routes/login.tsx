import './auth.css'

import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ComponentProps } from 'react'
import { useState } from 'react'
import { OtpInput } from '#/components/OtpInput'
import { getLocalizedPath, useI18n } from '#/i18n'
import { authClient } from '#/lib/auth-client'

export const Route = createFileRoute('/login')({ component: LoginPage })

type FormSubmitEvent = Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0]

export function LoginPage() {
  const navigate = useNavigate()
  const { locale, t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mode, setMode] = useState<'password' | 'otp'>('password')
  const [otpStep, setOtpStep] = useState<'email' | 'code'>('email')

  async function handlePasswordSubmit(event: FormSubmitEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const result = await authClient.signIn.email({
      email,
      password,
    })

    setIsSubmitting(false)

    if (result.error) {
      setError(result.error.message ?? t('auth.loginError'))
      return
    }

    await navigate({ to: locale === 'es' ? '/es' : '/' })
  }

  async function handleSendOtp() {
    if (!email) return
    setError(null)
    setInfo(null)
    setIsSubmitting(true)

    const result = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: 'sign-in',
    })

    setIsSubmitting(false)

    if (result.error) {
      setError(result.error.message ?? t('auth.loginError'))
      return
    }

    setInfo(t('auth.otpSent'))
    setOtpStep('code')
  }

  async function handleVerifyOtp(event: FormSubmitEvent) {
    event.preventDefault()
    if (otp.length !== 6) return

    setError(null)
    setIsSubmitting(true)

    const result = await authClient.signIn.emailOtp({
      email,
      otp,
    })

    setIsSubmitting(false)

    if (result.error) {
      setError(result.error.message ?? t('auth.otpError'))
      return
    }

    await navigate({ to: locale === 'es' ? '/es' : '/' })
  }

  function switchMode(newMode: 'password' | 'otp') {
    setMode(newMode)
    setError(null)
    setInfo(null)
    setOtp('')
    setOtpStep('email')
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <h1 id="login-title">{t('auth.loginTitle')}</h1>
        <p className="auth-copy">{t('auth.loginCopy')}</p>

        <div className="auth-mode-toggle" role="tablist" aria-label={t('auth.login')}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'password'}
            className={mode === 'password' ? 'auth-mode--active' : ''}
            onClick={() => switchMode('password')}
          >
            {t('auth.passwordLogin')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'otp'}
            className={mode === 'otp' ? 'auth-mode--active' : ''}
            onClick={() => switchMode('otp')}
          >
            {t('auth.otpLogin')}
          </button>
        </div>

        {mode === 'password' ? (
          <form className="auth-form" onSubmit={handlePasswordSubmit}>
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

            <label className="auth-field">
              {t('auth.password')}
              <input
                autoComplete="current-password"
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
              {isSubmitting ? t('auth.loggingIn') : t('auth.login')}
            </button>
          </form>
        ) : (
          <form
            className="auth-form"
            onSubmit={otpStep === 'email' ? (e) => { e.preventDefault(); handleSendOtp() } : handleVerifyOtp}
          >
            <label className="auth-field">
              {t('auth.email')}
              <input
                autoComplete="email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
                disabled={otpStep === 'code'}
              />
            </label>

            {otpStep === 'code' && (
              <div className="auth-field">
                <span className="auth-field-label">{t('auth.otpLabel')}</span>
                <OtpInput
                  id="login-otp"
                  value={otp}
                  onChange={setOtp}
                  disabled={isSubmitting}
                />
              </div>
            )}

            {info ? <p className="auth-info">{info}</p> : null}
            {error ? <p className="auth-error">{error}</p> : null}

            {otpStep === 'email' ? (
              <button
                className="auth-button"
                disabled={isSubmitting || !email}
                type="submit"
              >
                {isSubmitting ? t('auth.sendingCode') : t('auth.sendCode')}
              </button>
            ) : (
              <button
                className="auth-button"
                disabled={isSubmitting || otp.length !== 6}
                type="submit"
              >
                {isSubmitting ? t('auth.verifyingCode') : t('auth.verifyCode')}
              </button>
            )}

            {otpStep === 'code' && (
              <button
                type="button"
                className="auth-text-button"
                onClick={() => setOtpStep('email')}
                disabled={isSubmitting}
              >
                {t('auth.sendCode')}
              </button>
            )}
          </form>
        )}

        <p className="auth-switch">
          {t('auth.noAccount')}{' '}
          <Link to={getLocalizedPath('/signup', locale)}>{t('auth.createOne')}</Link>
        </p>
      </section>
    </main>
  )
}
