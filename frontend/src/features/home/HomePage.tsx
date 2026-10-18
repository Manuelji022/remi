import { Link } from '@tanstack/react-router'
import './home.css'
import { getLocalizedPath, useI18n } from '#/shared/i18n'

export function HomePage() {
  const { locale, t } = useI18n()

  return (
    <main className="home-page" id="main">
      <section className="home-card">
        <p className="home-title">{t('home.copy')}</p>
        <Link
          className="planner-entry-link"
          to={getLocalizedPath('/weekly-menu-planner', locale)}
        >
          {t('nav.weeklyMenu')}
        </Link>
      </section>
    </main>
  )
}
