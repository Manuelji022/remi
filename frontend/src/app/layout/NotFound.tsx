import { TextLink } from '#/components/primitives'
import { useI18n } from '#/shared/i18n'

export function NotFound() {
  const { t } = useI18n()

  return (
    <main id="main">
      <section className="empty-state">
        <h1>{t('notFound.title')}</h1>
        <p>{t('notFound.body')}</p>
        <TextLink to="/">{t('notFound.home')}</TextLink>
      </section>
    </main>
  )
}
