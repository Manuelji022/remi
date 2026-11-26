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
import { ToastProvider } from '#/components/primitives'
import { I18nProvider, getLocaleFromPathname, useI18n } from '#/shared/i18n'

import appCss from '../app/styles.css?url'

const THEME_COLOR = '#F8F8F8' // must match --color-theme in shared/styles/design-tokens.css

// must match the design faces in shared/styles/fonts.css
const PRELOADED_FONTS = [
  '/fonts/bricolage-grotesque-latin-wdth-normal.woff2',
  '/fonts/geist-latin-wght-normal.woff2',
]

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
      ...PRELOADED_FONTS.map((href) => ({
        rel: 'preload',
        as: 'font',
        type: 'font/woff2',
        href,
        // Font requests are CORS requests; without this they download twice.
        crossOrigin: 'anonymous' as const,
      })),
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
          <ToastProvider>
            <SkipLink />
            <Header />
            {children}
            <Footer />
          </ToastProvider>
        </I18nProvider>
        <Scripts />
      </body>
    </html>
  )
}
