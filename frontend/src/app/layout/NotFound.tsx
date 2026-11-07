import { Link } from '@tanstack/react-router'
import { getLocalizedPath, useI18n } from '#/shared/i18n'

export function NotFound() {
  const { locale, t } = useI18n()

  return (
    <main id="main">
      <section className="empty-state">
        <h1>{t('notFound.title')}</h1>
        <p>{t('notFound.body')}</p>
        <Link className="text-link" to={getLocalizedPath('/', locale)}>
          {t('notFound.home')}
        </Link>
      </section>
    </main>
  )
}
