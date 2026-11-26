import { useSearch } from '@tanstack/react-router'
import type { ComponentProps } from 'react'
import { useState } from 'react'
import { Banner, Button, Field, Icon } from '#/components/primitives'
import { useI18n } from '#/shared/i18n'
import { authClient } from '#/features/auth/auth-client'
import { AuthLayout } from '#/features/auth/components/AuthLayout'
import { PasswordInput } from '#/features/auth/components/PasswordInput'

type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<'form'>['onSubmit']>
>[0]
const MIN_PASSWORD_LENGTH = 8

export function ResetPasswordPage() {
  const { t } = useI18n()
  const search = useSearch({
    from: '/{-$locale}/reset-password',
  })
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const token = search.token

  async function handleSubmit(event: FormSubmitEvent) {
    event.preventDefault()
    setError(null)

    if (!token) {
      setError(t('auth.resetPasswordInvalidToken'))
      return
    }

    setIsSubmitting(true)

    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      })

      if (result.error) {
        setError(result.error.message ?? t('auth.resetPasswordError'))
        return
      }

      setDone(true)
    } catch {
      setError(t('auth.resetPasswordError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (done) {
    return (
      <AuthLayout
        badge="done"
        description={t('auth.resetPasswordDoneCopy')}
        pitchCopy={t('auth.resetDonePitchCopy')}
        pitchTitle={t('auth.resetDonePitchTitle')}
        title={t('auth.resetPasswordDoneTitle')}
      >
        <div className="auth-actions">
          <Button
            block
            size="lg"
            to="/login"
            trailingIcon="forward"
            variant="brand"
          >
            {t('auth.login')}
          </Button>
        </div>
      </AuthLayout>
    )
  }

  const isLongEnough = password.length >= MIN_PASSWORD_LENGTH

  return (
    <AuthLayout
      description={t('auth.resetPasswordCopy')}
      headerSwitch={{
        prompt: t('auth.rememberedPassword'),
        label: t('auth.login'),
        to: '/login',
      }}
      pitchCopy={t('auth.resetPitchCopy')}
      pitchTitle={t('auth.resetPitchTitle')}
      title={t('auth.resetPasswordTitle')}
    >
      <form className="auth-panel-form" onSubmit={handleSubmit}>
        {error ? (
          <Banner announce className="auth-banner" tone="error">
            {error}
          </Banner>
        ) : null}

        <Field
          hint={
            <span className={isLongEnough ? 'auth-rule-met' : undefined}>
              {isLongEnough ? <Icon name="done" size="sm" /> : null}
              {t('auth.passwordRule')}
            </span>
          }
          label={t('auth.newPassword')}
        >
          <PasswordInput
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            value={password}
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
            {isSubmitting
              ? t('auth.resettingPassword')
              : t('auth.resetPassword')}
          </Button>
        </div>
      </form>
    </AuthLayout>
  )
}
