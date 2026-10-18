import { useI18n } from '#/shared/i18n'
import './loading-dots.css'

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
