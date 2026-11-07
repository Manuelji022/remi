import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { messages } from './messages'
import type { Locale, MessageKey } from './messages'

const DATE_LOCALES: Record<Locale, string> = {
  en: 'en-GB',
  es: 'es-ES',
}

const WEEK_RANGE_FORMATTERS: Record<Locale, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat(DATE_LOCALES.en, {
    day: 'numeric',
    month: 'short',
  }),
  es: new Intl.DateTimeFormat(DATE_LOCALES.es, {
    day: 'numeric',
    month: 'short',
  }),
}

interface I18nContextValue {
  locale: Locale
  t: (key: MessageKey, params?: Record<string, string | number>) => string
  formatWeekRange: (date?: Date) => { start: string; end: string }
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({
  children,
  locale,
}: {
  children: ReactNode
  locale: Locale
}) {
  const value = useMemo<I18nContextValue>(() => {
    function t(key: MessageKey, params: Record<string, string | number> = {}) {
      let message: string = messages[locale][key]

      for (const [name, paramValue] of Object.entries(params)) {
        message = message.replaceAll(`{${name}}`, String(paramValue))
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

      const formatter = WEEK_RANGE_FORMATTERS[locale]

      return {
        start: formatter.format(monday),
        end: formatter.format(sunday),
      }
    }

    return { locale, t, formatWeekRange }
  }, [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)

  if (context === null) {
    throw new Error('useI18n must be used within I18nProvider')
  }

  return context
}
