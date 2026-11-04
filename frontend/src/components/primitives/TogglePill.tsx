import { CheckIcon } from './icons'

interface TogglePillProps {
  isDisabled: boolean
  isSelected: boolean
  label: string
  onClick: () => void
}

export function TogglePill({
  isDisabled,
  isSelected,
  label,
  onClick,
}: TogglePillProps) {
  return (
    <button
      aria-pressed={isSelected}
      className={`panel-scope-pill ${isSelected ? 'selected' : ''}`}
      disabled={isDisabled}
      type="button"
      onClick={onClick}
    >
      {isSelected ? (
        <CheckIcon aria-hidden="true" className="panel-pill-check" />
      ) : null}
      {label}
    </button>
  )
}
