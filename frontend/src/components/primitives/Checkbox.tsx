import { useCallback, useId } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import { Icon } from './Icon'
import './Checkbox.css'

export interface CheckboxProps extends Omit<
  ComponentProps<'input'>,
  'type' | 'children'
> {
  children: ReactNode
  variant?: 'form' | 'shopping'
  description?: ReactNode
  /** A lane after the label, end-aligned (a shopping quantity). */
  trailing?: ReactNode
  error?: ReactNode
  indeterminate?: boolean
}

export function Checkbox({
  children,
  variant = 'form',
  description,
  trailing,
  error,
  indeterminate = false,
  className,
  ref,
  ...inputProps
}: CheckboxProps) {
  const id = useId()
  const setRef = useCallback(
    (node: HTMLInputElement | null) => {
      if (node) node.indeterminate = indeterminate
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [indeterminate, ref],
  )
  const describedBy =
    [
      inputProps['aria-describedby'],
      description && `${id}-description`,
      error && `${id}-error`,
    ]
      .filter(Boolean)
      .join(' ') || undefined
  return (
    <label
      className={['checkbox', `checkbox-${variant}`, className]
        .filter(Boolean)
        .join(' ')}
    >
      <input
        {...inputProps}
        ref={setRef}
        type="checkbox"
        aria-invalid={error ? true : inputProps['aria-invalid']}
        aria-describedby={describedBy}
      />
      <span className="checkbox-box" aria-hidden="true">
        {variant === 'shopping' && !indeterminate ? (
          <svg
            className="checkbox-shopping-tick"
            viewBox="0 0 30 28"
            fill="none"
          >
            <path
              d="M4 15.5C6 16.5 8.5 19 10.5 22.5C14 14 19.5 7 27 2.5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <Icon name={indeterminate ? 'partly-done' : 'done'} size="sm" />
        )}
      </span>
      <span className="checkbox-content">
        <span className="checkbox-label">
          {children}
          {variant === 'shopping' && (
            <svg
              className="checkbox-strike"
              viewBox="0 0 100 12"
              preserveAspectRatio="none"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M1 8C14 6.5 27 7.5 41 5.8C57 4 73 6.6 99 4.2"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
          )}
        </span>
        {description && (
          <span id={`${id}-description`} className="checkbox-description">
            {description}
          </span>
        )}
        {error && (
          <span id={`${id}-error`} className="checkbox-error">
            <Icon name="error" size="sm" />
            {error}
          </span>
        )}
      </span>
      {trailing && <span className="checkbox-trailing">{trailing}</span>}
    </label>
  )
}
