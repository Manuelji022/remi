import { useNavigate } from '@tanstack/react-router'
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
type SignInData = { twoFactorRedirect?: boolean } | null

export function LoginPage() {
  const navigate = useNavigate()
  const { locale, t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
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
        setError(result.error.message ?? t('auth.loginError'))
        return
      }

      const data = result.data as SignInData

      if (data?.twoFactorRedirect) {
        await navigate({ to: getLocalizedPath('/two-factor', locale) })
        return
      }

      await authClient.signOut()
      setError(t('auth.twoFactorRequiredError'))
    } catch {
      setError(t('auth.loginError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page" id="main">
      <Card as="section" className="auth-card" aria-labelledby="login-title">
        <h1 id="login-title">{t('auth.loginTitle')}</h1>
        <p className="auth-copy">{t('auth.loginCopy')}</p>

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

          <Field label={t('auth.password')}>
            <Input
              autoComplete="current-password"
              minLength={8}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </Field>

          {error ? (
            <Banner tone="error" announce>
              {error}
            </Banner>
          ) : null}

          <Button block variant="brand" disabled={isSubmitting} type="submit">
            {isSubmitting ? t('auth.loggingIn') : t('auth.login')}
          </Button>
        </form>

        <p className="auth-forgot">
          <TextLink to="/forgot-password">
            {t('auth.forgotPasswordLink')}
          </TextLink>
        </p>

        <p className="auth-switch">
          {t('auth.noAccount')}{' '}
          <TextLink variant="inline" to="/signup">
            {t('auth.createOne')}
          </TextLink>
        </p>
      </Card>
    </main>
  )
}
