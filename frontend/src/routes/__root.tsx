import {
  HeadContent,
  Scripts,
  createRootRoute,
  useLocation,
} from '@tanstack/react-router'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { I18nProvider, getLocaleFromPathname, useI18n } from '#/i18n'
import { messages } from '#/i18n/messages'
import { useEffect } from 'react'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        name: 'color-scheme',
        content: 'light',
      },
      {
        name: 'theme-color',
        content: '#F5F5F7',
      },
      {
        title: 'Remi - Your weekly meal planner',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function SkipLink() {
  const { t } = useI18n()

  return (
    <a className="skip" href="#main">
      {t('common.skip')}
    </a>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const locale = getLocaleFromPathname(location.pathname)

  useEffect(() => {
    document.title = messages[locale]['app.title']
  }, [locale])

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <HeadContent />
        <title>{messages[locale]['app.title']}</title>
      </head>
      <body>
        <I18nProvider locale={locale}>
          <SkipLink />
          <Header />
          {children}
          <Footer />
        </I18nProvider>
        <Scripts />
      </body>
    </html>
  )
}
