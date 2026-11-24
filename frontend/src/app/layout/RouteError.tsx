import type { ErrorComponentProps } from '@tanstack/react-router'
import { Button, EmptyState } from '#/components/primitives'
import { useI18n } from '#/shared/i18n'

export function RouteError({ reset }: ErrorComponentProps) {
  const { t } = useI18n()

  return (
    <main id="main">
      <EmptyState
        variant="page"
        headingLevel={1}
        title={t('error.title')}
        action={
          <Button variant="brand" size="lg" onClick={reset}>
            {t('error.retry')}
          </Button>
        }
      >
        <p>{t('error.body')}</p>
      </EmptyState>
    </main>
  )
}
