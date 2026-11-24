import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const tokensPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  'design-tokens.css',
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
  const ink = token('--color-ink')
  const white = token('--color-white')

  it('keeps ink text at 4.5:1 on page, surface, fill and notes', () => {
    for (const bg of [
      '--color-white',
      '--color-gray-50',
      '--color-gray-100',
      '--color-gray-200',
      '--color-tomato-50',
      '--color-tomato-500',
      '--color-butter-400',
      '--color-lilac-300',
      '--color-mint-300',
    ]) {
      expect(contrast(ink, token(bg))).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps secondary text at 4.5:1 on page, surface and fill', () => {
    const text = token('--color-gray-700')
    for (const bg of ['--color-white', '--color-gray-50', '--color-gray-100']) {
      expect(contrast(text, token(bg))).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps white on ink and on destructive buttons at 4.5:1', () => {
    expect(contrast(white, ink)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(white, token('--color-tomato-700'))).toBeGreaterThanOrEqual(
      4.5,
    )
  })

  it('keeps status and brand text at 4.5:1 on their backgrounds', () => {
    const pairs = [
      ['--color-tomato-700', '--color-tomato-50'],
      ['--color-tomato-700', '--color-white'],
      ['--color-basil-700', '--color-basil-50'],
      ['--color-butter-800', '--color-butter-100'],
    ] as const
    for (const [fg, bg] of pairs) {
      expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps dimmed text and control borders at 3:1 on white', () => {
    expect(contrast(token('--color-gray-600'), white)).toBeGreaterThanOrEqual(3)
  })
})
