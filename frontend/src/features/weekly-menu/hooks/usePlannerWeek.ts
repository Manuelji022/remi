import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { listRecipes } from '#/features/recipes/functions'
import type { Recipe } from '#/features/recipes/recipe'
import {
  loadWeeklyMenu,
  saveWeeklyMenu,
} from '#/features/weekly-menu/functions'
import type {
  CalendarWeekMenu,
  LoadedMenuWeek,
} from '#/features/weekly-menu/week'
import { applySchedule } from '#/features/weekly-menu/week'
import type { Preferences } from '#/features/weekly-menu/types'

export type PlannerWeekIdentity = { userId: string; weekStart: string }
export type PlannerWeekData = PlannerWeekIdentity &
  (
    | { status: 'loading' | 'error' }
    | { status: 'ready'; week: LoadedMenuWeek; recipes: Recipe[] }
  )
export type PlannerAction = PlannerWeekIdentity & {
  kind: 'save' | 'accept'
  status: 'pending' | 'error' | 'success'
}
type ScopedPlannerAction = {
  identity: PlannerWeekIdentity & { enabled: boolean }
  writeScope: number
  value: PlannerAction
}

export function usePlannerWeek({
  userId,
  weekStart,
  enabled,
  preferencesOpen,
}: {
  userId?: string
  weekStart: string
  enabled: boolean
  preferencesOpen: boolean
}) {
  const [data, setData] = useState<PlannerWeekData | null>(null)
  const [action, setAction] = useState<ScopedPlannerAction | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const generationRef = useRef(0)
  const writeScopeRef = useRef(0)
  const identityRef = useRef({ userId, weekStart, enabled })
  const previousPreferencesOpen = useRef(preferencesOpen)
  const writeInFlightRef = useRef<PlannerAction | null>(null)
  useLayoutEffect(() => {
    identityRef.current = { userId, weekStart, enabled }
    ++writeScopeRef.current
  }, [userId, weekStart, enabled])

  const load = useCallback(async (setLoading: boolean) => {
    const identity = identityRef.current
    if (!identity.userId || !identity.enabled) return
    const generation = ++generationRef.current
    const isCurrent = () => {
      const current = identityRef.current
      return (
        generation === generationRef.current &&
        current.userId === identity.userId &&
        current.weekStart === identity.weekStart &&
        current.enabled
      )
    }
    if (setLoading)
      setData({
        userId: identity.userId,
        weekStart: identity.weekStart,
        status: 'loading',
      })
    try {
      const [week, recipes] = await Promise.all([
        loadWeeklyMenu({ data: { weekStart: identity.weekStart } }),
        listRecipes(),
      ])
      if (isCurrent())
        setData({
          userId: identity.userId,
          weekStart: identity.weekStart,
          status: 'ready',
          week,
          recipes,
        })
    } catch {
      if (isCurrent())
        setData({
          userId: identity.userId,
          weekStart: identity.weekStart,
          status: 'error',
        })
    }
  }, [])

  useEffect(() => {
    if (!userId || !enabled) {
      ++generationRef.current
      setData(null)
      return
    }
    void load(true)
    return () => {
      ++generationRef.current
    }
  }, [userId, weekStart, enabled, loadAttempt, load])
  useEffect(() => {
    const wasOpen = previousPreferencesOpen.current
    previousPreferencesOpen.current = preferencesOpen
    if (!wasOpen || preferencesOpen || !userId || !enabled) return
    const generation = generationRef.current
    void listRecipes()
      .then((recipes) => {
        if (generation !== generationRef.current) return
        setData((current) =>
          current?.status === 'ready' &&
          current.userId === userId &&
          current.weekStart === weekStart
            ? { ...current, recipes }
            : current,
        )
      })
      .catch(() => {
        if (generation === generationRef.current)
          setData({ userId, weekStart, status: 'error' })
      })
  }, [preferencesOpen, userId, weekStart, enabled])

  const retry = useCallback(() => {
    setData(null)
    setLoadAttempt((attempt) => attempt + 1)
  }, [])
  const clearAction = useCallback(() => setAction(null), [])
  const refreshAfterRecipeMutation = useCallback(async () => {
    setAction(null)
    await load(true)
  }, [load])
  const ownsAccept = useCallback((identity: PlannerWeekIdentity) => {
    const pending = writeInFlightRef.current
    return (
      pending?.kind === 'accept' &&
      pending.userId === identity.userId &&
      pending.weekStart === identity.weekStart
    )
  }, [])
  const persist = useCallback(
    async (
      menu: CalendarWeekMenu,
      kind: PlannerAction['kind'],
      recipes?: Recipe[],
    ) => {
      const identity = identityRef.current
      if (!identity.userId || !identity.enabled) return false
      const operation: PlannerAction = {
        userId: identity.userId,
        weekStart: identity.weekStart,
        kind,
        status: 'pending',
      }
      if (
        writeInFlightRef.current?.userId === operation.userId &&
        writeInFlightRef.current.weekStart === operation.weekStart
      )
        return false
      ++generationRef.current
      const writeScope = writeScopeRef.current
      const matches = () => {
        const current = identityRef.current
        return (
          writeScope === writeScopeRef.current &&
          current.enabled &&
          current.userId === operation.userId &&
          current.weekStart === operation.weekStart
        )
      }
      writeInFlightRef.current = operation
      setAction({
        identity: {
          userId: operation.userId,
          weekStart: operation.weekStart,
          enabled: identity.enabled,
        },
        writeScope,
        value: operation,
      })
      try {
        const week = await saveWeeklyMenu({ data: menu })
        // A completed write remains successful even if its view was invalidated.
        if (!matches()) return true
        setData((current) => {
          const catalog =
            recipes ??
            (current?.status === 'ready' &&
            current.userId === operation.userId &&
            current.weekStart === operation.weekStart
              ? current.recipes
              : [])
          return { ...operation, status: 'ready', week, recipes: catalog }
        })
        setAction((current) =>
          current?.value === operation
            ? { ...current, value: { ...operation, status: 'success' } }
            : current,
        )
        return true
      } catch {
        if (matches())
          setAction((current) =>
            current?.value === operation
              ? { ...current, value: { ...operation, status: 'error' } }
              : current,
          )
        return false
      } finally {
        setAction((current) => (current?.value === operation ? null : current))
        if (writeInFlightRef.current === operation)
          writeInFlightRef.current = null
      }
    },
    [],
  )
  const savePreferences = useCallback(
    (preferences: Preferences, menu: CalendarWeekMenu) =>
      persist(applySchedule(menu, preferences), 'save'),
    [persist],
  )
  const acceptPreview = useCallback(
    (menu: CalendarWeekMenu, recipes: Recipe[]) =>
      persist(menu, 'accept', recipes),
    [persist],
  )
  const dataForView =
    data && data.userId === userId && data.weekStart === weekStart ? data : null
  const actionForView =
    action &&
    action.writeScope === writeScopeRef.current &&
    action.identity.userId === userId &&
    action.identity.weekStart === weekStart &&
    action.identity.enabled === enabled
      ? action.value
      : null
  return {
    data: dataForView,
    action: actionForView,
    retry,
    refreshAfterRecipeMutation,
    savePreferences,
    acceptPreview,
    ownsAccept,
    clearAction,
  }
}
