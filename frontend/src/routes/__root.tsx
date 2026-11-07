import {
  HeadContent,
  Scripts,
  createRootRoute,
  useLocation,
} from '@tanstack/react-router'
import { Footer } from '#/app/layout/Footer'
import { Header } from '#/app/layout/Header'
import { NotFound } from '#/app/layout/NotFound'
import { RouteError } from '#/app/layout/RouteError'
import { I18nProvider, getLocaleFromPathname, useI18n } from '#/shared/i18n'

import appCss from '../app/styles.css?url'

const THEME_COLOR = '#F5F5F7' // must match --bg-page in shared/styles/tokens.css

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
        content: THEME_COLOR,
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  errorComponent: RouteError,
  notFoundComponent: NotFound,
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

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <HeadContent />
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
