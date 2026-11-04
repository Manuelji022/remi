// Runtime egress boundary for Node (including Vite workers); never an HTTP fixture.
import net from 'node:net'
import dns from 'node:dns'
import dgram from 'node:dgram'
import { syncBuiltinESMExports } from 'node:module'
const local = (host) => ['localhost', '127.0.0.1', '::1'].includes(host)
function check(host = 'localhost') {
  if (!local(host)) throw new Error(`REAL_STACK_NONLOCAL: ${host}`)
}
const connect = net.Socket.prototype.connect
net.Socket.prototype.connect = function (...input) {
  const args = Array.isArray(input[0]) ? input[0] : input
  const options = args[0]
  if (typeof options === 'object') {
    if (!options.path) check(options.host ?? options.hostname)
  } else if (typeof options === 'number')
    check(typeof args[1] === 'string' ? args[1] : undefined)
  else if (!String(options).startsWith('/')) check(args[1])
  return connect.apply(this, input)
}
for (const api of [
  dns,
  dns.promises,
  dns.Resolver.prototype,
  dns.promises.Resolver.prototype,
]) {
  for (const name of Object.getOwnPropertyNames(api).filter((key) =>
    /^(lookup|resolve|reverse)/.test(key),
  )) {
    const original = api[name]
    api[name] = function (host, ...args) {
      check(host)
      return original.call(this, host, ...args)
    }
  }
}
for (const name of ['connect', 'send']) {
  const original = dgram.Socket.prototype[name]
  dgram.Socket.prototype[name] = function (...args) {
    check(args.slice(1).find((value) => typeof value === 'string'))
    return original.apply(this, args)
  }
}
syncBuiltinESMExports()
