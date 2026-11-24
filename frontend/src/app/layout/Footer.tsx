import { Link, useLocation } from '@tanstack/react-router'
import { Button, Icon } from '#/components/primitives'
import { getLocalizedPath, useI18n } from '#/shared/i18n'
import { authClient } from '#/features/auth/auth-client'
import './footer.css'

export function Footer() {
  const { locale, t } = useI18n()
  const { pathname } = useLocation()
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const alternateLocale = locale === 'en' ? 'es' : 'en'
  const showSignup = !isSessionPending && !session

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <nav aria-label={t('footer.navLabel')} className="footer-actions">
          <Link
            aria-label={`${t('header.languageLabel')}: ${t(
              alternateLocale === 'en'
                ? 'header.languageEn'
                : 'header.languageEs',
            )}`}
            className="footer-language"
            hrefLang={alternateLocale}
            to={getLocalizedPath(pathname, alternateLocale)}
          >
            <Icon name="language" size="sm" />
            {t(
              alternateLocale === 'en'
                ? 'header.languageEn'
                : 'header.languageEs',
            )}
          </Link>
          {showSignup ? (
            <Button className="footer-signup" nav to="/signup" variant="brand">
              {t('auth.signup')}
            </Button>
          ) : null}
        </nav>
        <div className="footer-base">
          <p aria-hidden="true" className="footer-wordmark" translate="no">
            rem<span className="footer-wordmark-i">i</span>
          </p>
          <p className="footer-legal">
            {t('footer.legal', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  )
}
