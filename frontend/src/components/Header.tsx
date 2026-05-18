import './header.css'

import { Link, useLocation } from '@tanstack/react-router'
import { Globe2 } from 'lucide-react'
import { getLocalizedPath, useI18n } from '#/i18n'

export default function Header() {
  const { locale, t } = useI18n()
  const location = useLocation()
  const alternateLocale = locale === 'en' ? 'es' : 'en'

  return (
    <header>
      <div className="header-wrapper">
        <h1>REMI</h1>
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
      </div>
    </header>
  )
}
