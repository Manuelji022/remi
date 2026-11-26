import { useNavigate } from '@tanstack/react-router'
import type { ComponentProps } from 'react'
import { useState } from 'react'
import { Banner, Button, Field, Input } from '#/components/primitives'
import { getLocalizedPath, useI18n } from '#/shared/i18n'
import { authClient } from '#/features/auth/auth-client'
import { AuthLayout } from '#/features/auth/components/AuthLayout'
import { PasswordInput } from '#/features/auth/components/PasswordInput'

type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<'form'>['onSubmit']>
>[0]
type SignInData = { twoFactorRedirect?: boolean } | null
const MIN_PASSWORD_LENGTH = 8

export function SignupPage() {
  const navigate = useNavigate()
  const { locale, t } = useI18n()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isPasswordChecked, setIsPasswordChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // The count of missing characters shows once the box is left or submitted.
  const missing = MIN_PASSWORD_LENGTH - password.length
  const passwordError =
    isPasswordChecked && password && missing > 0
      ? t('auth.passwordTooShort', { count: missing })
      : undefined

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
    <AuthLayout
      description={t('auth.signupCopy')}
      headerSwitch={{
        prompt: t('auth.alreadyHaveAccount'),
        label: t('auth.login'),
        to: '/login',
      }}
      pitchCopy={t('auth.signupPitchCopy')}
      pitchTitle={t('auth.signupPitchTitle')}
      title={t('auth.signupTitle')}
    >
      <form className="auth-panel-form" onSubmit={handleSubmit}>
        {error ? (
          <Banner announce className="auth-banner" tone="error">
            {error}
          </Banner>
        ) : null}

        <div className="auth-fields">
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

          <Field error={passwordError} label={t('auth.password')}>
            <PasswordInput
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              name="password"
              onBlur={() => setIsPasswordChecked(true)}
              onChange={(event) => setPassword(event.target.value)}
              onInvalid={() => setIsPasswordChecked(true)}
              required
              value={password}
            />
          </Field>
        </div>

        <div className="auth-actions">
          <Button
            block
            disabled={isSubmitting}
            size="lg"
            type="submit"
            variant="brand"
          >
            {isSubmitting ? t('auth.creatingAccount') : t('auth.createAccount')}
          </Button>
        </div>
      </form>
    </AuthLayout>
  )
}
