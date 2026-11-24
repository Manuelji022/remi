import { useLocation } from '@tanstack/react-router'
import { Button, Icon } from '#/components/primitives'
import { useI18n } from '#/shared/i18n'

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
          <Icon name="settings" size="sm" />
          {t('preferences.kicker')}
        </p>
        <h2 id="preferences-panel-title">{t('preferences.title')}</h2>
      </div>
      <div className="panel-header-actions">
        <Button
          aria-label={`${t('header.languageLabel')}: ${
            alternateLocale === 'en'
              ? t('header.languageEn')
              : t('header.languageEs')
          }`}
          leadingIcon="language"
          locale={alternateLocale}
          to={location.pathname}
        >
          {locale === 'en' ? 'ES' : 'EN'}
        </Button>
        <Button
          iconOnly
          icon="close"
          disabled={closeDisabled}
          aria-label={t('preferences.close')}
          onClick={onClose}
        />
      </div>
    </div>
  )
}
