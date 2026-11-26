import './auth-layout.css'
import { Button } from '#/components/primitives'
import { LocalizedLink, useI18n } from '#/shared/i18n'
import { AuthNotes } from './AuthNotes'
import type { ReactNode } from 'react'

interface AuthLayoutProps {
  pitchTitle: string
  pitchCopy: string
  /** The one way out of the page, at the end of the header. */
  headerSwitch: { prompt: string; label: string; to: string }
  title: string
  description: ReactNode
  children: ReactNode
}

export function AuthLayout({
  pitchTitle,
  pitchCopy,
  headerSwitch,
  title,
  description,
  children,
}: AuthLayoutProps) {
  const { t } = useI18n()

  return (
    <>
      <header className="auth-header">
        <div className="auth-header-inner">
          <LocalizedLink
            aria-label={t('nav.home')}
            className="auth-wordmark"
            to="/"
            translate="no"
          >
            remi
          </LocalizedLink>
          <div className="auth-header-switch">
            <span className="auth-header-prompt">{headerSwitch.prompt}</span>
            <Button
              className="auth-header-button"
              size="sm"
              to={headerSwitch.to}
            >
              {headerSwitch.label}
            </Button>
          </div>
        </div>
      </header>
      <main className="auth-main" id="main">
        <div className="auth-board">
          <div className="auth-pitch">
            <p className="auth-pitch-title">{pitchTitle}</p>
            <p className="auth-pitch-copy">{pitchCopy}</p>
          </div>
          <AuthNotes />
        </div>
        <section className="auth-panel" aria-labelledby="auth-title">
          <div className="auth-title">
            <h1 id="auth-title">{title}</h1>
            <p>{description}</p>
          </div>
          {children}
        </section>
      </main>
    </>
  )
}
