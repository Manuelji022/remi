import './header.css'

import { Link } from '@tanstack/react-router'
import { getLocalizedPath, useI18n } from '#/i18n'
import { authClient } from '#/lib/auth-client'

export default function Header() {
  const { locale, t } = useI18n()
  const homePath = locale === 'es' ? '/es' : '/'
  const { data: session, isPending } = authClient.useSession()

  async function handleSignOut() {
    await authClient.signOut()
  }

  return (
    <header className="site-header">
      <nav className="header-wrapper" aria-label="Primary">
        <Link className="header-logo" to={homePath} aria-label="Remi home">
          REMI<span className="header-logo-span">!</span>
        </Link>
        <div className="header-auth">
          {session ? (
            <>
              <span className="header-user">{session.user.email}</span>
              <button
                className="header-auth-button"
                onClick={handleSignOut}
                type="button"
              >
                {t('auth.logout')}
              </button>
            </>
          ) : isPending ? null : (
            <>
              <Link
                className="header-auth-link"
                to={getLocalizedPath('/login', locale)}
              >
                {t('auth.login')}
              </Link>
              <Link
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
