import { cloneElement, useId } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { Icon } from './Icon'
import './Field.css'

type ControlProps = {
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean | 'true' | 'false'
}

export function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  className?: string
  children: ReactElement<ControlProps>
}) {
  const generatedId = useId()
  const id = children.props.id ?? generatedId
  const messageId = `${id}-message`
  const message = error || hint
  const describedBy =
    [children.props['aria-describedby'], message && messageId]
      .filter(Boolean)
      .join(' ') || undefined
  return (
    <div className={className ? `field ${className}` : 'field'}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {cloneElement(children, {
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : children.props['aria-invalid'],
      })}
      {message && (
        <div
          className={error ? 'field-message field-error' : 'field-message'}
          id={messageId}
          aria-live={error ? 'polite' : undefined}
        >
          {error && <Icon name="error" size="sm" />}
          {message}
        </div>
      )}
    </div>
  )
}
