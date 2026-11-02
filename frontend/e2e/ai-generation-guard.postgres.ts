import { eq, inArray, sql } from 'drizzle-orm'

const mode = process.argv[2]
if (mode !== 'multi' && mode !== 'single') {
  throw new Error('Usage: ai-generation-guard.postgres.ts <multi|single>')
}

const databaseUrl = new URL(process.env.DATABASE_URL ?? '')
if (
  databaseUrl.protocol !== 'postgres:' ||
  databaseUrl.hostname !== '127.0.0.1' ||
  !databaseUrl.port ||
  databaseUrl.username !== 'remi_ai_guard_test' ||
  databaseUrl.pathname !== '/remi_ai_guard_test'
) {
  throw new Error(
    'PostgreSQL guard integration only accepts its disposable localhost database',
  )
}
if (process.env.PGMAX !== (mode === 'multi' ? '3' : '1')) {
  throw new Error(`Unexpected PGMAX for ${mode} integration run`)
}

const { db, schema } = await import('#/shared/db')
const {
  AiGenerationInProgressError,
  AiGenerationLimitError,
  runAiGenerationWithGuard,
} = await import('#/features/weekly-menu/ai-generation-guard')
const userIds: string[] = []
const checks: string[] = []

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
  checks.push(message)
}

async function createUser(label: string): Promise<string> {
  const id = crypto.randomUUID()
  await db.insert(schema.user).values({
    id,
    name: `Disposable AI guard ${label}`,
    email: `${id}@example.invalid`,
  })
  userIds.push(id)
  return id
}

async function cleanup() {
  try {
    if (userIds.length > 0) {
      await db
        .delete(schema.aiMenuGenerationRequest)
        .where(inArray(schema.aiMenuGenerationRequest.userId, userIds))
      await db.delete(schema.user).where(inArray(schema.user.id, userIds))
    }
  } finally {
    await db.$client.end({ timeout: 5 })
  }
}

async function runMultiConnectionChecks() {
  const lockedUser = await createUser('lock')
  let releaseFirst!: () => void
  let signalFirstStarted!: () => void
  const firstStarted = new Promise<void>((resolve) => {
    signalFirstStarted = resolve
  })
  const firstRelease = new Promise<void>((resolve) => {
    releaseFirst = resolve
  })
  const first = runAiGenerationWithGuard(lockedUser, async () => {
    signalFirstStarted()
    await firstRelease
    return 'first'
  })

  await firstStarted
  let secondProviderCalls = 0
  let contentionError: unknown
  try {
    await runAiGenerationWithGuard(lockedUser, async () => {
      secondProviderCalls += 1
      return 'second'
    })
  } catch (error) {
    contentionError = error
  } finally {
    releaseFirst()
  }
  assert(
    contentionError instanceof AiGenerationInProgressError,
    'same-account contention rejects with AiGenerationInProgressError',
  )
  assert(
    secondProviderCalls === 0,
    'contending request never invokes provider callback',
  )
  assert((await first) === 'first', 'first guarded provider callback completes')

  const separateOne = await createUser('separate-one')
  const separateTwo = await createUser('separate-two')
  let activeProviders = 0
  let maximumActiveProviders = 0
  let releaseSeparate!: () => void
  let signalBothStarted!: () => void
  const bothStarted = new Promise<void>((resolve) => {
    signalBothStarted = resolve
  })
  const releaseBoth = new Promise<void>((resolve) => {
    releaseSeparate = resolve
  })
  const separateProvider = (id: string) =>
    runAiGenerationWithGuard(id, async () => {
      activeProviders += 1
      maximumActiveProviders = Math.max(maximumActiveProviders, activeProviders)
      if (activeProviders === 2) signalBothStarted()
      await releaseBoth
      activeProviders -= 1
      return id
    })
  const separateCalls = Promise.all([
    separateProvider(separateOne),
    separateProvider(separateTwo),
  ])
  let timeout!: ReturnType<typeof setTimeout>
  const concurrentCallbacksStarted = await Promise.race([
    bothStarted.then(() => true),
    new Promise<boolean>((resolve) => {
      timeout = setTimeout(() => {
        releaseSeparate()
        resolve(false)
      }, 5_000)
    }),
  ])
  releaseSeparate()
  clearTimeout(timeout)
  await separateCalls
  assert(
    concurrentCallbacksStarted && maximumActiveProviders === 2,
    'different users may hold independent generation guards concurrently',
  )

  const limitUser = await createUser('limit')
  let acceptedCalls = 0
  for (let index = 0; index < 5; index += 1) {
    await runAiGenerationWithGuard(limitUser, async () => {
      acceptedCalls += 1
      return index
    })
  }
  let limitError: unknown
  try {
    await runAiGenerationWithGuard(limitUser, async () => 'over limit')
  } catch (error) {
    limitError = error
  }
  assert(
    limitError instanceof AiGenerationLimitError && acceptedCalls === 5,
    'five accepted calls in one hour are counted and the sixth is rejected before provider work',
  )
  await db
    .update(schema.aiMenuGenerationRequest)
    .set({
      createdAt: sql`clock_timestamp() - interval '1 hour' - interval '1 second'`,
    })
    .where(eq(schema.aiMenuGenerationRequest.userId, limitUser))
  const resetResult = await runAiGenerationWithGuard(
    limitUser,
    async () => 'window reset',
  )
  assert(
    resetResult === 'window reset',
    'calls older than the rolling-hour cutoff are removed before accepting a new call',
  )

  const clockSkewUser = await createUser('clock-skew')
  const actualDate = globalThis.Date
  const skewedTime = '2000-01-01T00:00:00.000Z'
  const SkewedDate = function (this: Date, value?: string | number): Date {
    return new actualDate(value ?? skewedTime)
  } as unknown as DateConstructor
  SkewedDate.now = () => new actualDate(skewedTime).getTime()
  SkewedDate.parse = actualDate.parse
  SkewedDate.UTC = actualDate.UTC
  globalThis.Date = SkewedDate
  try {
    for (let index = 0; index < 5; index += 1) {
      await runAiGenerationWithGuard(clockSkewUser, async () => index)
    }
  } finally {
    globalThis.Date = actualDate
  }
  let skewedLimitError: unknown
  try {
    await runAiGenerationWithGuard(clockSkewUser, async () => 'over limit')
  } catch (error) {
    skewedLimitError = error
  }
  const clockSkewRows = await db
    .select({ createdAt: schema.aiMenuGenerationRequest.createdAt })
    .from(schema.aiMenuGenerationRequest)
    .where(eq(schema.aiMenuGenerationRequest.userId, clockSkewUser))
  assert(
    skewedLimitError instanceof AiGenerationLimitError &&
      clockSkewRows.length === 5 &&
      clockSkewRows.every(
        (row) => row.createdAt.getTime() > actualDate.now() - 60 * 60 * 1000,
      ),
    'a skewed application clock cannot place accepted attempts outside the database rolling-hour window',
  )

  const failureUser = await createUser('failure')
  let mockProviderFailure: unknown
  try {
    await runAiGenerationWithGuard(failureUser, async () => {
      throw new Error('mock provider failure')
    })
  } catch (error) {
    mockProviderFailure = error
  }
  assert(
    mockProviderFailure instanceof Error &&
      mockProviderFailure.message === 'mock provider failure',
    'mock provider failure is returned after its accepted attempt is committed',
  )
  for (let index = 0; index < 4; index += 1) {
    await runAiGenerationWithGuard(failureUser, async () => index)
  }
  let failureLimitError: unknown
  try {
    await runAiGenerationWithGuard(failureUser, async () => 'over limit')
  } catch (error) {
    failureLimitError = error
  }
  assert(
    failureLimitError instanceof AiGenerationLimitError,
    'a provider failure counts as one of five accepted calls in the rolling hour',
  )

  const isolatedUser = await createUser('isolated')
  const isolatedResult = await runAiGenerationWithGuard(
    isolatedUser,
    async () => 'isolated success',
  )
  assert(
    isolatedResult === 'isolated success',
    'a separate user is not affected by other users’ request counts or locks',
  )

  const rolloverUser = await createUser('provider-rollover')
  const { getStaleTargetWeekStart, nextCalendarWeekStart } =
    await import('#/features/weekly-menu/ai-schedule')
  const providerStartedAt = new Date('2026-10-25T23:59:00.000Z')
  const providerResolvedAt = new Date(providerStartedAt.getTime() + 2 * 60_000)
  const providerTarget = nextCalendarWeekStart(providerStartedAt, 'UTC')
  const rolloverResult = await runAiGenerationWithGuard(
    rolloverUser,
    async () => {
      const mockAssignments = { source: 'mock-provider' }
      return {
        providerCompleted: true,
        assignments: mockAssignments,
        staleTargetWeekStart: getStaleTargetWeekStart(
          providerTarget,
          'UTC',
          providerResolvedAt,
        ),
      }
    },
  )
  assert(
    rolloverResult.providerCompleted &&
      rolloverResult.assignments.source === 'mock-provider' &&
      rolloverResult.staleTargetWeekStart ===
        nextCalendarWeekStart(providerResolvedAt, 'UTC'),
    'mocked provider work crossing Sunday-to-Monday is rejected by the production post-provider target check',
  )

  const requestRows = await db
    .select({ userId: schema.aiMenuGenerationRequest.userId })
    .from(schema.aiMenuGenerationRequest)
    .where(eq(schema.aiMenuGenerationRequest.userId, failureUser))
  assert(
    requestRows.length === 5,
    'accepted requests, including the failure, are recorded durably',
  )
}

async function runSingleConnectionCheck() {
  assert(
    process.env.PGMAX === '1',
    'application postgres-js pool is configured with max=1',
  )
  const userId = await createUser('single-connection')
  const [
    { loadAiMenuContextForUser },
    { nextCalendarWeekStart, targetScheduleFromPreferences },
    { getDefaultPreferences },
  ] = await Promise.all([
    import('#/features/weekly-menu/ai-generation-store'),
    import('#/features/weekly-menu/ai-schedule'),
    import('#/features/weekly-menu/types'),
  ])
  const targetWeekStart = nextCalendarWeekStart(new Date(), 'UTC')
  const schedule = targetScheduleFromPreferences(getDefaultPreferences())
  const context = await loadAiMenuContextForUser(
    userId,
    targetWeekStart,
    schedule,
  )
  assert(
    context.targetWeekStart === targetWeekStart && context.recipes.length === 0,
    'real owned catalog and current/previous history load with a single DB connection',
  )

  let release!: () => void
  let started!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  const providerStarted = new Promise<void>((resolve) => {
    started = resolve
  })
  const first = runAiGenerationWithGuard(userId, async () => {
    started()
    await held
    return 'released'
  })
  await providerStarted
  try {
    await db.select({ id: schema.user.id }).from(schema.user).limit(1)
    assert(true, 'PGMAX=1 unrelated DB read completes while provider is held')
    let contention: unknown
    try {
      await runAiGenerationWithGuard(userId, async () => {
        throw new Error('must not run')
      })
    } catch (error) {
      contention = error
    }
    assert(
      contention instanceof AiGenerationInProgressError,
      'PGMAX=1 same-user contention rejects while provider is held',
    )
    const other = await createUser('single-independent')
    assert(
      (await runAiGenerationWithGuard(other, async () => 'independent')) ===
        'independent',
      'PGMAX=1 independent user completes while first provider is held',
    )
  } finally {
    release()
  }
  await first

  const result = await runAiGenerationWithGuard(userId, async () => ({
    targetWeekStart: context.targetWeekStart,
    currentWeek: context.currentWeek.weekStart,
    previousWeek: context.previousWeek.weekStart,
    mockedProvider: true,
  }))
  assert(
    result.targetWeekStart === targetWeekStart && result.mockedProvider,
    'guarded mocked provider callback completes after context reads using PGMAX=1',
  )
}

async function runExpiryChecks() {
  const userId = await createUser('expiry')
  await db.insert(schema.aiMenuGenerationLease).values({
    userId,
    token: 'crashed-owner',
    expiresAt: new Date(0),
  })
  assert(
    (await runAiGenerationWithGuard(userId, async () => 'recovered')) ===
      'recovered',
    'expired crashed-owner lease is reclaimable',
  )
  let releaseOld!: () => void
  let started!: () => void
  const held = new Promise<void>((resolve) => {
    releaseOld = resolve
  })
  const begun = new Promise<void>((resolve) => {
    started = resolve
  })
  const old = runAiGenerationWithGuard(userId, async () => {
    started()
    await held
  })
  await begun
  // Simulate crash/expiry handoff without waiting a minute. Only this test bypasses the bounded-provider contract.
  await db
    .update(schema.aiMenuGenerationLease)
    .set({ expiresAt: sql`clock_timestamp() - interval '1 second'` })
    .where(eq(schema.aiMenuGenerationLease.userId, userId))
  let releaseNew!: () => void
  let newStarted!: () => void
  const newHeld = new Promise<void>((resolve) => {
    releaseNew = resolve
  })
  const newBegun = new Promise<void>((resolve) => {
    newStarted = resolve
  })
  const replacement = runAiGenerationWithGuard(userId, async () => {
    newStarted()
    await newHeld
  })
  await newBegun
  try {
    releaseOld()
    await old
    let error: unknown
    try {
      await runAiGenerationWithGuard(userId, async () => 'must not run')
    } catch (caught) {
      error = caught
    }
    assert(
      error instanceof AiGenerationInProgressError,
      'old owner finally cannot release a replacement lease',
    )
  } finally {
    releaseNew()
  }
  await replacement
  const leases = await db
    .select()
    .from(schema.aiMenuGenerationLease)
    .where(eq(schema.aiMenuGenerationLease.userId, userId))
  assert(leases.length === 0, 'successful replacement releases its own lease')
}

try {
  if (mode === 'multi') await runMultiConnectionChecks()
  else await runSingleConnectionCheck()
  await runExpiryChecks()
} finally {
  await cleanup()
}

console.log(JSON.stringify({ mode, pgmax: process.env.PGMAX, checks }, null, 2))
