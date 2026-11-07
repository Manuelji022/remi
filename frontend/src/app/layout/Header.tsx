import { Link } from '@tanstack/react-router'
import './header.css'
import { getLocalizedPath, useI18n } from '#/shared/i18n'
import { authClient } from '#/features/auth/auth-client'
import { useSignOut } from '#/features/auth/use-sign-out'

export default function Header() {
  const { locale, t } = useI18n()
  const homePath = getLocalizedPath('/', locale)
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const signOut = useSignOut()

  return (
    <header className="site-header">
      <nav className="header-wrapper" aria-label="Primary">
        <div className="header-leading">
          <Link
            aria-label={t('nav.home')}
            className="header-logo"
            to={homePath}
            translate="no"
          >
            Remi
            <span aria-hidden="true" className="header-logo-span">
              .
            </span>
          </Link>
          <Link
            activeProps={{ 'aria-current': 'page' }}
            className="header-nav-link"
            to={getLocalizedPath('/weekly-menu-planner', locale)}
          >
            {t('nav.weeklyMenu')}
          </Link>
        </div>
        <div aria-busy={isSessionPending} className="header-auth">
          {isSessionPending ? null : session ? (
            <>
              <span className="header-user">{session.user.name}</span>
              <button
                className="header-auth-button"
                onClick={() => void signOut()}
                type="button"
              >
                {t('auth.logout')}
              </button>
            </>
          ) : (
            <>
              <Link
                activeProps={{ 'aria-current': 'page' }}
                className="header-auth-link"
                to={getLocalizedPath('/login', locale)}
              >
                {t('auth.login')}
              </Link>
              <Link
                activeProps={{ 'aria-current': 'page' }}
                className="header-auth-link header-auth-link-strong"
                to={getLocalizedPath('/signup', locale)}
              >
                {t('auth.signup')}
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
