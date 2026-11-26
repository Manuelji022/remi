import { useState } from 'react'
import { Button, Input } from '#/components/primitives'
import { useI18n } from '#/shared/i18n'
import type { ComponentProps } from 'react'

/** Password box with a show / hide button. Goes inside a `Field`. */
export function PasswordInput(props: Omit<ComponentProps<'input'>, 'type'>) {
  const { t } = useI18n()
  const [visible, setVisible] = useState(false)

  return (
    <div className="auth-password-input">
      <Input
        autoCapitalize="none"
        spellCheck={false}
        {...props}
        type={visible ? 'text' : 'password'}
      />
      <Button
        aria-controls={props.id}
        aria-label={t(visible ? 'auth.hidePassword' : 'auth.showPassword')}
        className="auth-password-toggle"
        icon={visible ? 'hide' : 'show'}
        iconOnly
        onClick={() => setVisible((value) => !value)}
        variant="ghost"
      />
    </div>
  )
}
