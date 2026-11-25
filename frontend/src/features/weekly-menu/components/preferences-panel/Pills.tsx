import { Chip } from '#/components/primitives'
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
    <Chip
      pressed={isSelected}
      variant="context"
      icon={context === 'office' ? 'office' : 'eating-out'}
      onClick={onClick}
    >
      {label}
    </Chip>
  )
}
