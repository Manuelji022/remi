import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('token literals', () => {
  it('keeps raw px, rem, and hex values in the tokens file', () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
    const output = execFileSync(
      process.execPath,
      ['scripts/check-token-literals.mjs'],
      { cwd: root, encoding: 'utf8' },
    )

    expect(output).toContain('(no matches)')
    expect(output.match(/\(no matches\)/g)).toHaveLength(5)
  })
})
