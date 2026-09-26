import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const stylesPath = resolve(dirname(fileURLToPath(import.meta.url)), 'styles.css')
const styles = readFileSync(stylesPath, 'utf8')

const surfaces = [
  '#ffffff',
  '#f0eee6',
  '#e3dbcc',
  '#fffaf5',
  '#fffdf8',
  '#fefcf8',
  '#f0ebe4',
  '#fff8e6',
]

function channel(value: number) {
  const unit = value / 255
  return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string) {
  const red = Number.parseInt(hex.slice(1, 3), 16)
  const green = Number.parseInt(hex.slice(3, 5), 16)
  const blue = Number.parseInt(hex.slice(5, 7), 16)
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
}

function contrast(foreground: string, background: string) {
  const lighter = Math.max(luminance(foreground), luminance(background))
  const darker = Math.min(luminance(foreground), luminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

function token(name: string) {
  const match = styles.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!match?.[1]) {
    throw new Error(`missing ${name}`)
  }
  return match[1].toLowerCase()
}

describe('contrast tokens', () => {
  it('keeps muted text at 4.5:1 on app surfaces', () => {
    const muted = token('--text-muted')
    for (const surface of surfaces) {
      expect(contrast(muted, surface)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps primary button text at 4.5:1', () => {
    expect(
      contrast(token('--button-primary-fg'), token('--button-primary-bg')),
    ).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps disabled UI at 3:1', () => {
    const disabled = token('--text-disabled')
    expect(contrast(disabled, token('--button-disabled-bg'))).toBeGreaterThanOrEqual(3)
    expect(contrast(disabled, '#f0ebe4')).toBeGreaterThanOrEqual(3)
    expect(contrast(disabled, '#ffffff')).toBeGreaterThanOrEqual(3)
  })
})
