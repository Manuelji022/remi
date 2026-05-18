import './header.css'

import { Link } from '@tanstack/react-router'
import { useI18n } from '#/i18n'

export default function Header() {
  const { locale } = useI18n()
  const homePath = locale === 'es' ? '/es' : '/'

  return (
    <header className="site-header">
      <nav className="header-wrapper" aria-label="Primary">
        <Link className="header-logo" to={homePath} aria-label="Remi home">
          REMI<span className="header-logo-span">!</span>
        </Link>
      </nav>
    </header>
  )
}
