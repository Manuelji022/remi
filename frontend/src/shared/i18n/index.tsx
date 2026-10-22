import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { localeSchema, messages } from './messages'
import type { Locale, MessageKey } from './messages'

const DATE_LOCALES: Record<Locale, string> = {
  en: 'en-GB',
  es: 'es-ES',
}

interface I18nContextValue {
  locale: Locale
  t: (key: MessageKey, params?: Record<string, string | number>) => string
  formatWeekRange: (date?: Date) => { start: string; end: string }
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function isLocale(value: string): value is Locale {
  return localeSchema.safeParse(value).success
}

export function getLocaleFromPathname(pathname: string): Locale {
  const pathLocale = pathname.split('/')[1]
  return pathLocale && isLocale(pathLocale) ? pathLocale : 'en'
}

export function getLocalizedPath(pathname: string, targetLocale: Locale) {
  const unlocalizedPath = pathname.replace(/^\/(?:en|es)(?=\/|$)/, '') || '/'

  if (targetLocale === 'es') {
    return unlocalizedPath === '/' ? '/es' : `/es${unlocalizedPath}`
  }

  return unlocalizedPath
}

export function I18nProvider({
  children,
  locale,
}: {
  children: ReactNode
  locale: Locale
}) {
  function t(key: MessageKey, params: Record<string, string | number> = {}) {
    let message: string = messages[locale][key]

    for (const [name, value] of Object.entries(params)) {
      message = message.replaceAll(`{${name}}`, String(value))
    }

    return message
  }

  function formatWeekRange(date: Date = new Date()) {
    const curr = new Date(date)
    const day = curr.getDay()
    const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(curr.setDate(diffToMonday))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    const formatter = new Intl.DateTimeFormat(DATE_LOCALES[locale], {
      day: 'numeric',
      month: 'short',
    })

    return {
      start: formatter.format(monday),
      end: formatter.format(sunday),
    }
  }

  return (
    <I18nContext.Provider value={{ locale, t, formatWeekRange }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)

  if (context === null) {
    throw new Error('useI18n must be used within I18nProvider')
  }

  return context
}

export type { Locale, MessageKey }
