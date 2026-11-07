import './header.css'
import { LocalizedLink, useI18n } from '#/shared/i18n'
import { authClient } from '#/features/auth/auth-client'
import { useSignOut } from '#/features/auth/use-sign-out'

export function Header() {
  const { t } = useI18n()
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const signOut = useSignOut()

  return (
    <header className="site-header">
      <nav className="header-wrapper" aria-label="Primary">
        <div className="header-leading">
          <LocalizedLink
            aria-label={t('nav.home')}
            className="header-logo"
            to="/"
            translate="no"
          >
            Remi
            <span aria-hidden="true" className="header-logo-span">
              .
            </span>
          </LocalizedLink>
          <LocalizedLink
            className="header-nav-link"
            nav
            to="/weekly-menu-planner"
          >
            {t('nav.weeklyMenu')}
          </LocalizedLink>
        </div>
        <div aria-busy={isSessionPending} className="header-auth">
          {isSessionPending ? null : session ? (
            <>
              <span className="header-user">{session.user.name}</span>
              <button
                className="btn btn-secondary"
                onClick={() => void signOut()}
                type="button"
              >
                {t('auth.logout')}
              </button>
            </>
          ) : (
            <>
              <LocalizedLink className="text-link" nav to="/login">
                {t('auth.login')}
              </LocalizedLink>
              <LocalizedLink className="btn btn-secondary" nav to="/signup">
                {t('auth.signup')}
              </LocalizedLink>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
