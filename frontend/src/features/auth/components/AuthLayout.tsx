import './auth-layout.css'
import { useEffect, useRef } from 'react'
import { Button, Icon } from '#/components/primitives'
import { LocalizedLink, useI18n } from '#/shared/i18n'
import { AuthNotes } from './AuthNotes'
import type { IconName } from '#/components/primitives'
import type { ReactNode } from 'react'

interface AuthLayoutProps {
  pitchTitle: string
  pitchCopy: string
  /** The one way out of the page, at the end of the header. */
  headerSwitch?: { prompt: string; label: string; to: string }
  title: string
  /**
   * The sticky note above a result title ("Check your email"). When it shows
   * up the form is gone, so focus moves to the title.
   */
  badge?: Extract<IconName, 'email' | 'done'>
  description: ReactNode
  children: ReactNode
}

export function AuthLayout({
  pitchTitle,
  pitchCopy,
  headerSwitch,
  title,
  badge,
  description,
  children,
}: AuthLayoutProps) {
  const { t } = useI18n()
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (badge) titleRef.current?.focus()
  }, [badge])

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
          {headerSwitch ? (
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
          ) : null}
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
          {badge ? (
            <div className={`auth-badge auth-badge-${badge}`}>
              <Icon name={badge} />
            </div>
          ) : null}
          <div className="auth-title">
            <h1
              aria-describedby={badge ? 'auth-description' : undefined}
              id="auth-title"
              ref={titleRef}
              tabIndex={-1}
            >
              {title}
            </h1>
            <p id="auth-description">{description}</p>
          </div>
          {children}
        </section>
      </main>
    </>
  )
}
