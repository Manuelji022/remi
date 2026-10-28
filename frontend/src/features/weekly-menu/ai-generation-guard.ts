import { and, eq, gt, lte, sql } from 'drizzle-orm'
import { db, schema } from '#/shared/db'

const MAX_REQUESTS_PER_HOUR = 5
// generateAiMenu aborts its single provider call after 20s (no retries). The
// callback must settle within that bound: expiry recovers crashed workers, not
// arbitrary callbacks that ignore cancellation. Allow 40s of scheduling margin.
const LEASE_SECONDS = 60
const { aiMenuGenerationRequest, aiMenuGenerationLease, user } = schema

export class AiGenerationLimitError extends Error {
  constructor() {
    super('AI Weekly Menu request limit reached')
    this.name = 'AiGenerationLimitError'
  }
}

export class AiGenerationInProgressError extends Error {
  constructor() {
    super('AI Weekly Menu generation is already in progress')
    this.name = 'AiGenerationInProgressError'
  }
}

export async function runAiGenerationWithGuard<T>(
  userId: string,
  generate: () => Promise<T>,
): Promise<T> {
  const token = crypto.randomUUID()
  await db.transaction(async (tx) => {
    try {
      await tx
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, userId))
        .for('update', { noWait: true })
    } catch (error) {
      if (isLockNotAvailable(error)) throw new AiGenerationInProgressError()
      throw error
    }

    const acquired = await tx
      .insert(aiMenuGenerationLease)
      .values({
        userId,
        token,
        expiresAt: sql`clock_timestamp() + ${LEASE_SECONDS} * interval '1 second'`,
      })
      .onConflictDoUpdate({
        target: aiMenuGenerationLease.userId,
        set: {
          token,
          expiresAt: sql`clock_timestamp() + ${LEASE_SECONDS} * interval '1 second'`,
        },
        setWhere: sql`${aiMenuGenerationLease.expiresAt} <= clock_timestamp()`,
      })
      .returning({ token: aiMenuGenerationLease.token })
    if (acquired.length === 0) throw new AiGenerationInProgressError()

    const windowStart = sql`clock_timestamp() - interval '1 hour'`
    await tx
      .delete(aiMenuGenerationRequest)
      .where(
        and(
          eq(aiMenuGenerationRequest.userId, userId),
          lte(aiMenuGenerationRequest.createdAt, windowStart),
        ),
      )

    const recentRequests = await tx
      .select({ id: aiMenuGenerationRequest.id })
      .from(aiMenuGenerationRequest)
      .where(
        and(
          eq(aiMenuGenerationRequest.userId, userId),
          gt(aiMenuGenerationRequest.createdAt, windowStart),
        ),
      )
      .limit(MAX_REQUESTS_PER_HOUR)

    if (recentRequests.length >= MAX_REQUESTS_PER_HOUR) {
      throw new AiGenerationLimitError()
    }

    await tx.insert(aiMenuGenerationRequest).values({
      id: crypto.randomUUID(),
      userId,
      createdAt: sql`clock_timestamp()`,
    })
  })

  // Acquisition and attempt accounting are committed before provider work, so
  // failures count and no transaction/connection/row lock spans this await.
  try {
    return await generate()
  } finally {
    await db
      .delete(aiMenuGenerationLease)
      .where(
        and(
          eq(aiMenuGenerationLease.userId, userId),
          eq(aiMenuGenerationLease.token, token),
        ),
      )
  }
}

function isLockNotAvailable(error: unknown): boolean {
  const seen = new Set<object>()
  let cause: unknown = error

  for (let depth = 0; depth < 5; depth += 1) {
    if (!cause || typeof cause !== 'object' || seen.has(cause)) return false
    seen.add(cause)
    if ('code' in cause && cause.code === '55P03') return true
    cause = 'cause' in cause ? cause.cause : undefined
  }

  return false
}
