import type { ErrorComponentProps } from '@tanstack/react-router'
import { Button } from '#/components/primitives'
import { useI18n } from '#/shared/i18n'

export function RouteError({ reset }: ErrorComponentProps) {
  const { t } = useI18n()

  return (
    <main id="main">
      <section className="empty-state">
        <h1>{t('error.title')}</h1>
        <p>{t('error.body')}</p>
        <Button onClick={reset}>{t('error.retry')}</Button>
      </section>
    </main>
  )
}
