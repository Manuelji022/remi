import { useNavigate } from '@tanstack/react-router'
import '../auth.css'
import type { ComponentProps } from 'react'
import { useState } from 'react'
import { Field, Input, TextLink } from '#/components/primitives'
import { getLocalizedPath, useI18n } from '#/shared/i18n'
import { authClient } from '#/features/auth/auth-client'

type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<'form'>['onSubmit']>
>[0]
type SignInData = { twoFactorRedirect?: boolean } | null

export function SignupPage() {
  const navigate = useNavigate()
  const { locale, t } = useI18n()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormSubmitEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const result = await authClient.signUp.email({
        name,
        email,
        password,
      })

      if (result.error) {
        setError(result.error.message ?? t('auth.signupError'))
        return
      }

      await authClient.signOut()

      let loginResult
      try {
        loginResult = await authClient.signIn.email({ email, password })
      } catch {
        setError(t('auth.signupOtpStartError'))
        return
      }

      if (loginResult.error) {
        setError(loginResult.error.message ?? t('auth.signupOtpStartError'))
        return
      }

      const data = loginResult.data as SignInData

      if (data?.twoFactorRedirect) {
        window.sessionStorage.setItem('remi:signupOtpPending', 'true')
        await navigate({ to: getLocalizedPath('/two-factor', locale) })
        return
      }

      await authClient.signOut()
      setError(t('auth.twoFactorRequiredError'))
    } catch {
      setError(t('auth.signupError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page" id="main">
      <section className="auth-card" aria-labelledby="signup-title">
        <h1 id="signup-title">{t('auth.signupTitle')}</h1>
        <p className="auth-copy">{t('auth.signupCopy')}</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <Field label={t('auth.name')}>
            <Input
              autoComplete="name"
              name="name"
              onChange={(event) => setName(event.target.value)}
              required
              type="text"
              value={name}
            />
          </Field>

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

          <Field label={t('auth.password')}>
            <Input
              autoComplete="new-password"
              minLength={8}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </Field>

          {error ? <p className="auth-error">{error}</p> : null}

          <button
            className="btn btn-primary"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? t('auth.creatingAccount') : t('auth.createAccount')}
          </button>
        </form>

        <p className="auth-switch">
          {t('auth.alreadyHaveAccount')}{' '}
          <TextLink variant="inline" to="/login">
            {t('auth.login')}
          </TextLink>
        </p>
      </section>
    </main>
  )
}
