import { useState } from 'react'
import { AUTH_STORAGE_KEYS } from '#/features/auth/storage-keys'

type Step = 1 | 2 | 3 | null

// Supply an account only while its AI flow is open: leaving resets progress.
export function useFirstRunTour(userId?: string) {
  const [completed, setCompleted] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const [progress, setProgress] = useState<{ userId?: string; step: Step }>({
    userId,
    step: 1,
  })

  // Lazy read from localStorage instead of caching with useMemo
  let storedCompletion = false
  if (userId) {
    try {
      storedCompletion =
        localStorage.getItem(AUTH_STORAGE_KEYS.tour.progress(userId)) === 'done'
    } catch {
      // Session completion still applies when browser storage is unavailable.
    }
  }

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
      localStorage.setItem(AUTH_STORAGE_KEYS.tour.progress(userId), 'done')
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
