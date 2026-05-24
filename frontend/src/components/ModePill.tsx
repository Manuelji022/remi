import './pills.css'

import { useI18n } from '#/i18n'

interface ModePillProps {
  mode: 'office' | 'eatOut'
  selected: boolean
  onClick: () => void
}

export function ModePill({ mode, selected, onClick }: ModePillProps) {
  const { t } = useI18n()

  return (
    <button
      className={`mode-pill ${selected ? 'selected' : ''}`}
      type="button"
      onClick={onClick}
    >
      {t(`contexts.${mode}`)}
    </button>
  )
}
