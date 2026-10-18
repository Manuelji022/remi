import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const tokensPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  'tokens.css',
)
const tokens = readFileSync(tokensPath, 'utf8')

function channel(value: number) {
  const unit = value / 255
  return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string) {
  const red = Number.parseInt(hex.slice(1, 3), 16)
  const green = Number.parseInt(hex.slice(3, 5), 16)
  const blue = Number.parseInt(hex.slice(5, 7), 16)
  return (
    0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
  )
}

function contrast(foreground: string, background: string) {
  const lighter = Math.max(luminance(foreground), luminance(background))
  const darker = Math.min(luminance(foreground), luminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

function token(name: string) {
  const match = tokens.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!match?.[1]) {
    throw new Error(`missing ${name}`)
  }
  return match[1].toLowerCase()
}

describe('contrast tokens', () => {
  it('keeps primary text at 4.5:1 on page, surface, and fill', () => {
    const text = token('--gray-900')
    expect(contrast(text, token('--gray-50'))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(text, token('--gray-0'))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(text, token('--gray-100'))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(text, token('--gray-200'))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(text, token('--blue-50'))).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps secondary text at 4.5:1 on page and surface', () => {
    const text = token('--gray-600')
    expect(contrast(text, token('--gray-0'))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(text, token('--gray-50'))).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps accent text and filled buttons at 4.5:1', () => {
    expect(
      contrast(token('--gray-0'), token('--blue-500')),
    ).toBeGreaterThanOrEqual(4.5)
    expect(
      contrast(token('--gray-0'), token('--blue-600')),
    ).toBeGreaterThanOrEqual(4.5)
    expect(
      contrast(token('--gray-0'), token('--blue-700')),
    ).toBeGreaterThanOrEqual(4.5)
    expect(
      contrast(token('--blue-600'), token('--gray-0')),
    ).toBeGreaterThanOrEqual(4.5)
    expect(
      contrast(token('--blue-600'), token('--gray-50')),
    ).toBeGreaterThanOrEqual(4.5)
    expect(
      contrast(token('--blue-600'), token('--blue-50')),
    ).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps disabled text at 3:1 and destructive text readable', () => {
    expect(
      contrast(token('--gray-600'), token('--gray-100')),
    ).toBeGreaterThanOrEqual(3)
    expect(
      contrast(token('--red-600'), token('--gray-0')),
    ).toBeGreaterThanOrEqual(4.5)
    expect(
      contrast(token('--red-600'), token('--gray-100')),
    ).toBeGreaterThanOrEqual(3)
    expect(
      contrast(token('--green-700'), token('--gray-0')),
    ).toBeGreaterThanOrEqual(4.5)
    expect(
      contrast(token('--green-700'), token('--gray-100')),
    ).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps the focus ring and control border at 3:1', () => {
    expect(
      contrast(token('--blue-500'), token('--gray-0')),
    ).toBeGreaterThanOrEqual(3)
    expect(
      contrast(token('--blue-500'), token('--gray-50')),
    ).toBeGreaterThanOrEqual(3)
    expect(
      contrast(token('--gray-400'), token('--gray-0')),
    ).toBeGreaterThanOrEqual(3)
  })
})
