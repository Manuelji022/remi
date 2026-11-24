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
