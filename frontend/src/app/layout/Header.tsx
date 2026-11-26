import './header.css'
import { useLocation } from '@tanstack/react-router'
import { Button, Menu, MenuItem } from '#/components/primitives'
import { LocalizedLink, useI18n } from '#/shared/i18n'
import { authClient } from '#/features/auth/auth-client'
import { useSignOut } from '#/features/auth/use-sign-out'
import { hasAuthLayout } from '#/features/auth/auth-layout-paths'

export function Header() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const signOut = useSignOut()

  if (hasAuthLayout(pathname)) return null

  return (
    <header className="site-header">
      <div className="header-inner">
        <LocalizedLink
          aria-label={t('nav.home')}
          className="header-logo"
          to="/"
          translate="no"
        >
          remi
        </LocalizedLink>
        <div aria-busy={isSessionPending} className="header-auth">
          {isSessionPending ? null : session ? (
            <Menu
              identity={{
                name: session.user.name,
                detail: session.user.email,
              }}
              label={t('nav.account')}
              trigger={(props) => (
                <button
                  {...props}
                  aria-label={t('nav.accountNamed', {
                    name: session.user.name,
                  })}
                  className="header-avatar"
                  type="button"
                >
                  <span aria-hidden="true" className="header-avatar-face">
                    {Array.from(session.user.name.trim())[0]?.toUpperCase()}
                  </span>
                </button>
              )}
              wide
            >
              <MenuItem icon="log-out" onSelect={() => void signOut()}>
                {t('auth.logout')}
              </MenuItem>
            </Menu>
          ) : (
            <>
              <Button className="header-login" nav to="/login" variant="ghost">
                {t('auth.login')}
              </Button>
              <Button className="header-signup" nav to="/signup">
                {t('auth.signup')}
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
