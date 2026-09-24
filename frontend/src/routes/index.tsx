import { createFileRoute, Link } from '@tanstack/react-router'
import { getLocalizedPath, useI18n } from '#/i18n'

export const Route = createFileRoute('/')({ component: IndexPage })

export function IndexPage() {
  const { locale, t } = useI18n()

  return (
    <main className="home-page">
      <p>{t('home.copy')}</p>
      <Link
        className="planner-entry-link"
        to={getLocalizedPath('/weekly-menu-planner', locale)}
      >
        {t('nav.weeklyMenu')}
      </Link>
    </main>
  )
}
