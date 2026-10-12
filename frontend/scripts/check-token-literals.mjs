import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const src = join(dirname(fileURLToPath(import.meta.url)), '../src')
const tokensFile = join(src, 'styles/tokens.css')

function cssFiles(dir) {
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...cssFiles(path))
    else if (entry.name.endsWith('.css')) files.push(path)
  }
  return files
}

function linesOf(pattern, files) {
  const hits = []
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    text.split('\n').forEach((line, index) => {
      if (pattern.test(line)) {
        hits.push(
          `${relative(src, file).replaceAll('\\', '/')}:${index + 1}:${line.trim()}`,
        )
      }
      pattern.lastIndex = 0
    })
  }
  return hits
}

const componentCss = cssFiles(src).filter((file) => file !== tokensFile)

const checks = [
  {
    title: '1. Spacing primitives outside tokens.css',
    hits: linesOf(/--space-/, componentCss),
  },
  {
    title: '2. Raw px/rem/hex outside tokens.css',
    hits: linesOf(
      /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|[0-9.]+(?:px|rem|em|vw|vh|ms)\b/,
      componentCss,
    ),
  },
  {
    title: '3. Physical properties outside tokens.css',
    hits: linesOf(
      /(margin|padding|border)-(top|bottom|left|right)|[ ;{](top|left|right|bottom|width|height|min-width|max-width|min-height|max-height):/,
      componentCss,
    ),
  },
  {
    title: '4. Ad-hoc breakpoints outside tokens.css',
    hits: linesOf(/@(?:media|container)/, componentCss).filter(
      (hit) =>
        !/\((?:--bp-|--cq-)/.test(hit) && !/\(pointer:\s*fine\)/.test(hit),
    ),
  },
  {
    title: '5. max-width queries outside tokens.css',
    hits: linesOf(/@(?:media|container)[^{]*max-/, componentCss),
  },
]

let failed = false
for (const check of checks) {
  console.log(check.title)
  if (check.hits.length === 0) {
    console.log('(no matches)')
  } else {
    failed = true
    for (const hit of check.hits) console.log(hit)
  }
  console.log()
}

if (failed) process.exit(1)
