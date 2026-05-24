import './pills.css'

import { useI18n } from '#/i18n'

interface FocusPillProps {
  focus: 'lunch' | 'dinner' | 'both'
  selected: boolean
  onClick: () => void
}

export function FocusPill({ focus, selected, onClick }: FocusPillProps) {
  const { t } = useI18n()

  return (
    <button
      className={`focus-pill ${selected ? 'selected' : ''}`}
      type="button"
      onClick={onClick}
    >
      {focus === 'both' ? t('scopes.both') : t(`slots.${focus}`)}
    </button>
  )
}
