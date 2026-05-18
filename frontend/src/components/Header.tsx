import './header.css'

import { Link, useLocation } from '@tanstack/react-router'
import { Globe2 } from 'lucide-react'
import { getWeekNumber } from '#/data/constants'
import { getLocalizedPath, useI18n } from '#/i18n'

export default function Header() {
  const { locale, t, formatWeekRange } = useI18n()
  const location = useLocation()
  const alternateLocale = locale === 'en' ? 'es' : 'en'
  const weekRange = formatWeekRange()
  const homePath = locale === 'es' ? '/es' : '/'

  return (
    <header className="site-header">
      <nav className="header-wrapper" aria-label="Primary">
        <Link className="header-logo" to={homePath} aria-label="Remi home">
          REMI
        </Link>
        <p className="header-week">
          {t('planner.weekKicker', {
            week: getWeekNumber(),
            start: weekRange.start,
            end: weekRange.end,
          })}
        </p>
        <Link
          aria-label={`${t('header.languageLabel')}: ${
            alternateLocale === 'en'
              ? t('header.languageEn')
              : t('header.languageEs')
          }`}
          className="language-switcher"
          to={getLocalizedPath(location.pathname, alternateLocale)}
        >
          <Globe2 aria-hidden="true" />
          <span>{locale === 'en' ? 'ES' : 'EN'}</span>
        </Link>
      </nav>
    </header>
  )
}
