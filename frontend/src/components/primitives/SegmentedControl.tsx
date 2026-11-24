import { useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import './SegmentedControl.css'

type Option<T extends string> = {
  value: T
  label: ReactNode
  disabled?: boolean
  id?: string
  controls?: string
}
type Props<T extends string> = {
  label: string
  options: ReadonlyArray<Option<T>>
  value: T
  onChange: (value: T) => void
  mode?: 'radio' | 'tabs'
}
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  mode = 'radio',
}: Props<T>) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const enabled = options
      .map((option, i) => (option.disabled ? -1 : i))
      .filter((i) => i >= 0)
    const position = enabled.indexOf(index)
    let next: number | undefined
    if (event.key === 'Home') next = enabled[0]
    else if (event.key === 'End') next = enabled[enabled.length - 1]
    else if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
      next = enabled[(position + 1) % enabled.length]
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
      next = enabled[(position - 1 + enabled.length) % enabled.length]
    if (next === undefined) return
    event.preventDefault()
    onChange(options[next].value)
    buttons.current[next]?.focus()
  }
  return (
    <div
      className="segmented-control"
      role={mode === 'tabs' ? 'tablist' : 'radiogroup'}
      aria-label={label}
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          ref={(element) => {
            buttons.current[index] = element
          }}
          type="button"
          role={mode === 'tabs' ? 'tab' : 'radio'}
          id={option.id}
          aria-controls={option.controls}
          aria-selected={mode === 'tabs' ? value === option.value : undefined}
          aria-checked={mode === 'radio' ? value === option.value : undefined}
          tabIndex={value === option.value ? 0 : -1}
          disabled={option.disabled}
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
