import { CalendarIcon, UtensilsIcon } from '#/components/icons'
import { useI18n } from '#/i18n'
import type { PreferencesPanelTab } from './types'

interface PanelTabButtonProps {
  id: PreferencesPanelTab
  isActive: boolean
  label: string
  onClick: () => void
}

export function PanelTabButton({
  id,
  isActive,
  label,
  onClick,
}: PanelTabButtonProps) {
  return (
    <button
      aria-controls={`preferences-${id}-panel`}
      aria-selected={isActive}
      className={`panel-tab-btn ${isActive ? 'active' : ''}`}
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
  const Icon = context === 'office' ? CalendarIcon : UtensilsIcon

  return (
    <button
      className={`panel-context-pill ${isSelected ? 'selected' : ''}`}
      type="button"
      onClick={onClick}
    >
      <Icon aria-hidden="true" />
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
      className={`panel-scope-pill ${isSelected ? 'selected' : ''}`}
      disabled={isDisabled}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  )
}
