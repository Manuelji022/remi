import { Icon } from '#/components/primitives'
import { useI18n } from '#/shared/i18n'
import type { PreferencesPanelTab } from './types'

interface PanelTabButtonProps {
  id: PreferencesPanelTab
  isActive: boolean
  isDisabled: boolean
  label: string
  onClick: () => void
}

export function PanelTabButton({
  id,
  isActive,
  isDisabled,
  label,
  onClick,
}: PanelTabButtonProps) {
  return (
    <button
      aria-controls={`preferences-${id}-panel`}
      aria-selected={isActive}
      className={`panel-tab-btn ${isActive ? 'active' : ''}`}
      disabled={isDisabled}
      id={`preferences-${id}-tab`}
      role="tab"
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  )
}

interface DayContextPillProps {
  context: 'office' | 'eatOut'
  isSelected: boolean
  onClick: () => void
}

export function DayContextPill({
  context,
  isSelected,
  onClick,
}: DayContextPillProps) {
  const { t } = useI18n()
  const label = t(`contexts.${context}`)

  return (
    <button
      aria-pressed={isSelected}
      className={`panel-context-pill ${isSelected ? 'selected' : ''}`}
      type="button"
      onClick={onClick}
    >
      {isSelected ? <Icon name="done" size="sm" /> : null}
      <Icon name={context === 'office' ? 'office' : 'eating-out'} size="sm" />
      {label}
    </button>
  )
}

interface PlanningScopePillProps {
  isDisabled: boolean
  isSelected: boolean
  label: string
  onClick: () => void
}

export function PlanningScopePill({
  isDisabled,
  isSelected,
  label,
  onClick,
}: PlanningScopePillProps) {
  return (
    <button
      aria-pressed={isSelected}
      className={`panel-scope-pill ${isSelected ? 'selected' : ''}`}
      disabled={isDisabled}
      type="button"
      onClick={onClick}
    >
      {isSelected ? <Icon name="done" size="sm" /> : null}
      {label}
    </button>
  )
}
