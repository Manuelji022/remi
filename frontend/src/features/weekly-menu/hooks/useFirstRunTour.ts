import { useCallback, useState, useSyncExternalStore } from 'react'

type Step = 1 | 2 | 3 | null

function readStoredCompletion(userId?: string) {
  if (!userId || typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(`remi:ai-tour:v1:${userId}`) === 'done'
  } catch {
    return false
  }
}

function subscribeToStoredCompletion(
  userId: string | undefined,
  onChange: () => void,
) {
  if (!userId || typeof window === 'undefined') return () => {}
  const key = `remi:ai-tour:v1:${userId}`
  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) onChange()
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}

const getServerSnapshot = () => false

// Supply an account only while its AI flow is open: leaving resets progress.
export function useFirstRunTour(userId?: string) {
  const [completed, setCompleted] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const [progress, setProgress] = useState<{ userId?: string; step: Step }>({
    userId,
    step: 1,
  })
  const subscribe = useCallback(
    (onChange: () => void) => subscribeToStoredCompletion(userId, onChange),
    [userId],
  )
  const getSnapshot = useCallback(() => readStoredCompletion(userId), [userId])
  const storedCompletion = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  )
  // `userId` becomes undefined when the AI flow closes. Reset here so reopening
  // the same account starts at step 1 instead of restoring its old in-memory step.
  if (progress.userId !== userId) setProgress({ userId, step: 1 })
  const step: Step =
    !userId || completed.has(userId) || storedCompletion
      ? null
      : progress.userId === userId
        ? progress.step
        : 1

  function skip() {
    if (!userId) return
    setCompleted((previous) => new Set([...previous, userId]))
    try {
      localStorage.setItem(`remi:ai-tour:v1:${userId}`, 'done')
    } catch {
      // Session completion still applies when browser storage is unavailable.
    }
  }

  function next() {
    if (step === 3) skip()
    else if (step) setProgress({ userId, step: step === 1 ? 2 : 3 })
  }

  return { step, next, skip }
}
