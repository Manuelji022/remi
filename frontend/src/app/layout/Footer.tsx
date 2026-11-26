import { Link, useLocation } from '@tanstack/react-router'
import { Button, Icon } from '#/components/primitives'
import { getLocalizedPath, useI18n } from '#/shared/i18n'
import { authClient } from '#/features/auth/auth-client'
import { hasAuthLayout } from '#/features/auth/auth-layout-paths'
import { isOnboardingPath } from '#/features/onboarding/onboarding-path'
import './footer.css'

export function Footer() {
  const { locale, t } = useI18n()
  const { pathname } = useLocation()
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const alternateLocale = locale === 'en' ? 'es' : 'en'
  const showSignup = !isSessionPending && !session
  const legal = { year: new Date().getFullYear() }
  const languageName = t(
    alternateLocale === 'en' ? 'header.languageEn' : 'header.languageEs',
  )
  const languageLink = (
    <Link
      aria-label={`${t('header.languageLabel')}: ${languageName}`}
      className="footer-language"
      hrefLang={alternateLocale}
      to={getLocalizedPath(pathname, alternateLocale)}
    >
      <Icon name="language" size="sm" />
      {languageName}
    </Link>
  )

  if (isOnboardingPath(pathname)) return null

  // Auth pages: one quiet row. The page itself already offers sign up.
  if (hasAuthLayout(pathname)) {
    return (
      <footer className="site-footer site-footer-compact">
        <div className="footer-inner">
          <div className="footer-brand">
            <p aria-hidden="true" className="footer-mark" translate="no">
              remi
            </p>
            <p className="footer-legal">{t('footer.legalCompact', legal)}</p>
          </div>
          <nav aria-label={t('footer.navLabel')} className="footer-actions">
            {languageLink}
          </nav>
        </div>
      </footer>
    )
  }

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <nav aria-label={t('footer.navLabel')} className="footer-actions">
          {languageLink}
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
          <p className="footer-legal">{t('footer.legal', legal)}</p>
        </div>
      </div>
    </footer>
  )
}
