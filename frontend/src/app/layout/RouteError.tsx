import type { ErrorComponentProps } from '@tanstack/react-router'
import { useI18n } from '#/shared/i18n'

export function RouteError({ reset }: ErrorComponentProps) {
  const { t } = useI18n()

  return (
    <main id="main">
      <section className="empty-state">
        <h1>{t('error.title')}</h1>
        <p>{t('error.body')}</p>
        <button className="btn btn-secondary" onClick={reset} type="button">
          {t('error.retry')}
        </button>
      </section>
    </main>
  )
}
