import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://user:password@localhost:5432/db'

const rawPoolMax = process.env.PGMAX
const poolMax = rawPoolMax === undefined ? 10 : Number(rawPoolMax)
if (
  (rawPoolMax !== undefined && !/^[1-9]\d*$/.test(rawPoolMax)) ||
  !Number.isSafeInteger(poolMax) ||
  poolMax < 1
) {
  throw new Error('PGMAX must be a positive integer')
}

const client = postgres(connectionString, { max: poolMax })

export const db = drizzle(client, { schema })
export { schema }
