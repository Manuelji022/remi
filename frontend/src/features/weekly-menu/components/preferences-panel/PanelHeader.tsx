import { Link, useLocation } from '@tanstack/react-router'
import { Globe2 } from 'lucide-react'
import { CloseIcon, SettingsIcon } from '#/components/primitives'
import { getLocalizedPath, useI18n } from '#/shared/i18n'

interface PanelHeaderProps {
  closeDisabled: boolean
  onClose: () => void
}

export function PanelHeader({ closeDisabled, onClose }: PanelHeaderProps) {
  const { locale, t } = useI18n()
  const location = useLocation()
  const alternateLocale = locale === 'en' ? 'es' : 'en'

  return (
    <div className="panel-header">
      <div>
        <p className="panel-kicker">
          <SettingsIcon aria-hidden="true" />
          {t('preferences.kicker')}
        </p>
        <h2 id="preferences-panel-title">{t('preferences.title')}</h2>
      </div>
      <div className="panel-header-actions">
        <Link
          aria-label={`${t('header.languageLabel')}: ${
            alternateLocale === 'en'
              ? t('header.languageEn')
              : t('header.languageEs')
          }`}
          className="btn btn-secondary"
          to={getLocalizedPath(location.pathname, alternateLocale)}
        >
          <Globe2 aria-hidden="true" />
          <span>{locale === 'en' ? 'ES' : 'EN'}</span>
        </Link>
        <button
          className="icon-btn icon-btn-filled"
          disabled={closeDisabled}
          type="button"
          aria-label={t('preferences.close')}
          onClick={onClose}
        >
          <CloseIcon aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
