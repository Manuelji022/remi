import './loading-dots.css'

import { useI18n } from '#/i18n'

export function LoadingDots() {
  const { t } = useI18n()

  return (
    <span className="loading-dots" aria-label={t('common.loading')}>
      <span />
      <span />
      <span />
    </span>
  )
}
