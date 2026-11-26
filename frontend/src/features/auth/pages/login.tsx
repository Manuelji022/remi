import { useNavigate } from '@tanstack/react-router'
import type { ComponentProps } from 'react'
import { useState } from 'react'
import {
  Banner,
  Button,
  Field,
  Icon,
  Input,
  TextLink,
} from '#/components/primitives'
import { getLocalizedPath, useI18n } from '#/shared/i18n'
import { OTP_EMAIL_STORAGE_KEY, authClient } from '#/features/auth/auth-client'
import { AuthLayout } from '#/features/auth/components/AuthLayout'
import { PasswordInput } from '#/features/auth/components/PasswordInput'

type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<'form'>['onSubmit']>
>[0]
type SignInData = { twoFactorRedirect?: boolean } | null

export function LoginPage() {
  const navigate = useNavigate()
  const { locale, t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<{
    title?: string
    message: string
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormSubmitEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      })

      if (result.error) {
        setError(
          result.error.code === 'INVALID_EMAIL_OR_PASSWORD'
            ? {
                title: t('auth.loginMismatchTitle'),
                message: t('auth.loginMismatchCopy'),
              }
            : { message: result.error.message ?? t('auth.loginError') },
        )
        return
      }

      const data = result.data as SignInData

      if (data?.twoFactorRedirect) {
        window.sessionStorage.setItem(OTP_EMAIL_STORAGE_KEY, email)
        await navigate({ to: getLocalizedPath('/two-factor', locale) })
        return
      }

      await authClient.signOut()
      setError({ message: t('auth.twoFactorRequiredError') })
    } catch {
      setError({ message: t('auth.loginError') })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      description={t('auth.loginCopy')}
      headerSwitch={{
        prompt: t('auth.noAccount'),
        label: t('auth.signup'),
        to: '/signup',
      }}
      pitchCopy={t('auth.loginPitchCopy')}
      pitchTitle={t('auth.loginPitchTitle')}
      title={t('auth.loginTitle')}
    >
      <form className="auth-panel-form" onSubmit={handleSubmit}>
        {error ? (
          <Banner
            announce
            className="auth-banner"
            title={error.title}
            tone="error"
          >
            {error.message}
          </Banner>
        ) : null}

        <div className="auth-fields">
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

          <div className="auth-password-field">
            <Field label={t('auth.password')}>
              <PasswordInput
                autoComplete="current-password"
                minLength={8}
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                required
                value={password}
              />
            </Field>
            <TextLink
              className="auth-link"
              to="/forgot-password"
              variant="inline"
            >
              {t('auth.forgotPasswordLink')}
            </TextLink>
          </div>
        </div>

        <div className="auth-actions">
          <Button
            block
            disabled={isSubmitting}
            size="lg"
            type="submit"
            variant="brand"
          >
            {isSubmitting ? t('auth.loggingIn') : t('auth.login')}
          </Button>
          <p className="auth-note-line">
            <Icon name="lock" size="sm" />
            {t('auth.loginCodeNote')}
          </p>
        </div>
      </form>
    </AuthLayout>
  )
}
