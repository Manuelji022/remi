import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'

const results = []
const browser = ({ args, stdin }) => new Promise((resolve, reject) => {
  const child = spawn('agent-browser', ['--session', 'remi-week-lock', '--json', ...args])
  let output = '', error = ''
  child.stdout.on('data', chunk => { output += chunk })
  child.stderr.on('data', chunk => { error += chunk })
  child.on('error', reject)
  child.stdin.end(stdin)
  child.on('close', () => {
    try {
      const parsed = JSON.parse(output)
      resolve(Array.isArray(parsed)
        ? { success: parsed.every(item => item.success), error: parsed.find(item => !item.success)?.error }
        : parsed)
    }
    catch { reject(new Error(error || output)) }
  })
})
const emit = result => { results.push(result); console.log(JSON.stringify(result)) }
try {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
  await new AsyncFunction('browser', 'emit', await readFile('e2e/week-lock.browser.js', 'utf8'))(browser, emit)
} finally {
  await mkdir('e2e/artifacts', { recursive: true })
  await writeFile('e2e/artifacts/week-lock-results.json', '[\n' + results.map(result => JSON.stringify(result)).join(',\n') + '\n]\n')
}
