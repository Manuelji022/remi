import { Icon } from './Icon'
import './Field.css'
import type { ComponentProps } from 'react'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      {...props}
      className={['field-control', className].filter(Boolean).join(' ')}
    />
  )
}

/** Native select, so the phone keeps its own picker. Chevron is Paper's. */
export function Select({
  className,
  children,
  ...props
}: ComponentProps<'select'>) {
  return (
    <span className="field-select">
      <select
        {...props}
        className={['field-control', className].filter(Boolean).join(' ')}
      >
        {children}
      </select>
      <Icon name="expand" />
    </span>
  )
}
