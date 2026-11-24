import { Icon } from './Icon'
import type { IconName } from './Icon'
import type { ComponentProps } from 'react'
import './Chip.css'

export interface ChipProps extends Omit<
  ComponentProps<'button'>,
  'aria-pressed'
> {
  pressed: boolean
  variant?: 'filter' | 'context'
  icon?: IconName
}

/** An independent on/off choice. Context chips require an identifying icon. */
export function Chip({
  pressed,
  variant = 'filter',
  icon,
  children,
  className,
  ...rest
}: ChipProps) {
  const leadingIcon = variant === 'filter' && pressed ? 'done' : icon
  return (
    <button
      {...rest}
      type="button"
      aria-pressed={pressed}
      className={['chip', `chip-${variant}`, className]
        .filter(Boolean)
        .join(' ')}
    >
      <span
        className={`chip-surface${leadingIcon ? ' chip-surface-icon' : ''}`}
      >
        {leadingIcon ? <Icon name={leadingIcon} size="sm" /> : null}
        {children}
      </span>
    </button>
  )
}
