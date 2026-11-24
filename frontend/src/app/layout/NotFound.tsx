import { Button, EmptyState } from '#/components/primitives'
import { useI18n } from '#/shared/i18n'

export function NotFound() {
  const { t } = useI18n()

  return (
    <main id="main">
      <EmptyState
        variant="page"
        headingLevel={1}
        title={t('notFound.title')}
        action={
          <Button to="/" variant="brand" size="lg">
            {t('notFound.home')}
          </Button>
        }
      >
        <p>{t('notFound.body')}</p>
      </EmptyState>
    </main>
  )
}
