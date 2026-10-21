import { describe, expect, it } from 'vitest'
import { getLocaleFromPathname, getLocalizedPath } from './index'

describe('localized paths', () => {
  it('uses English for unprefixed paths and Spanish for the Spanish prefix', () => {
    expect(getLocaleFromPathname('/weekly-menu-planner')).toBe('en')
    expect(getLocaleFromPathname('/en/weekly-menu-planner')).toBe('en')
    expect(getLocaleFromPathname('/es/weekly-menu-planner')).toBe('es')
    expect(getLocaleFromPathname('/esoteric')).toBe('en')
  })

  it('switches locales without duplicating or retaining a locale prefix', () => {
    expect(getLocalizedPath('/', 'es')).toBe('/es')
    expect(getLocalizedPath('/weekly-menu-planner', 'es')).toBe(
      '/es/weekly-menu-planner',
    )
    expect(getLocalizedPath('/es/weekly-menu-planner', 'en')).toBe(
      '/weekly-menu-planner',
    )
    expect(getLocalizedPath('/en/login', 'es')).toBe('/es/login')
  })
})
