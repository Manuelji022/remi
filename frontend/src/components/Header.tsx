import './header.css'

import { Link } from '@tanstack/react-router'
import { useI18n } from '#/i18n'
import { authClient } from '#/lib/auth-client'

export default function Header() {
  const { locale } = useI18n()
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
                Log out
              </button>
            </>
          ) : isPending ? null : (
            <>
              <Link className="header-auth-link" to="/login">
                Log in
              </Link>
              <Link
                className="header-auth-link header-auth-link-strong"
                to="/signup"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
