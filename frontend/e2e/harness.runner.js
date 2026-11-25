// Runs a browser harness (e2e/*.browser.js) through the agent-browser CLI.
//
//   node e2e/harness.runner.js <harness.browser.js> <agent-browser session> <results.json>
//
// The harness file is a function body that receives `browser` and `emit`. This runner
// provides both: `browser({ args, stdin })` shells out to `agent-browser --json`, and
// `emit(result)` prints the result and records it in the JSON artifact.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { spawn } from 'node:child_process'

const [harness, session, output] = process.argv.slice(2)
if (!harness || !session || !output) {
  console.error('usage: node e2e/harness.runner.js <harness.browser.js> <session> <results.json>')
  process.exit(2)
}

const results = []
const browser = ({ args, stdin }) => new Promise((resolve, reject) => {
  const child = spawn('agent-browser', ['--session', session, '--json', ...args])
  let out = '', error = ''
  child.stdout.on('data', chunk => { out += chunk })
  child.stderr.on('data', chunk => { error += chunk })
  child.on('error', reject)
  child.stdin.end(stdin)
  child.on('close', () => {
    try {
      const parsed = JSON.parse(out)
      resolve(Array.isArray(parsed)
        ? { success: parsed.every(item => item.success), error: parsed.find(item => !item.success)?.error, data: parsed }
        : parsed)
    }
    catch { reject(new Error(error || out)) }
  })
})
const emit = result => { results.push(result); console.log(JSON.stringify(result)) }
let failed = false
try {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
  await new AsyncFunction('browser', 'emit', await readFile(harness, 'utf8'))(browser, emit)
} catch (error) {
  failed = true
  console.error(String(error))
} finally {
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, '[\n' + results.map(result => JSON.stringify(result)).join(',\n') + '\n]\n')
}
if (failed || results.some(result => result.verdict === 'FAIL')) process.exit(1)
