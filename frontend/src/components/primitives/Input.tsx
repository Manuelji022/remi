import type { ComponentProps } from 'react'
import './Field.css'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      {...props}
      className={['field-control', className].filter(Boolean).join(' ')}
    />
  )
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      {...props}
      className={['field-control', 'field-textarea', className]
        .filter(Boolean)
        .join(' ')}
    />
  )
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      {...props}
      className={['field-control', className].filter(Boolean).join(' ')}
    />
  )
}
