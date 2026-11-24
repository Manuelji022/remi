import './header.css'
import { Button, TextLink } from '#/components/primitives'
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
              <Button onClick={() => void signOut()}>{t('auth.logout')}</Button>
            </>
          ) : (
            <>
              <TextLink nav to="/login">
                {t('auth.login')}
              </TextLink>
              <Button nav to="/signup">
                {t('auth.signup')}
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
