import {
  HeadContent,
  Scripts,
  createRootRoute,
  useLocation,
} from '@tanstack/react-router'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { I18nProvider, getLocaleFromPathname } from '#/i18n'
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
          <Header />
          {children}
          <Footer />
        </I18nProvider>
        <Scripts />
      </body>
    </html>
  )
}
