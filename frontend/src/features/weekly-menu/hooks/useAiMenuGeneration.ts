import type { DayContext, Preferences, PlanningScope } from '../types'
import type { AiPreview } from '../ai-generation-state'
import type { Day } from '../constants'
import type { MealSlot, Recipe } from '#/features/recipes/recipe'
import type { CalendarWeekMenu } from '../week'
import { aiMockScenarioSchema } from '#/features/weekly-menu/ai-mock'
import { useCallback, useEffectEvent, useReducer, useRef } from 'react'
import { generateNextWeeklyMenu, loadWeeklyMenu } from '../functions'
import {
  nextCalendarWeekStart,
  targetScheduleFromPreferences,
} from '../ai-schedule'
import { scheduleFromMenu } from '../week'
import { reducer, editablePreview, failureFor } from '../ai-generation-state'

export type { AiPreview, AiGenerationState } from '../ai-generation-state'
export { hasManualEdits } from '../ai-generation-state'

export function useAiMenuGeneration({
  userId,
  timeZone,
  onPreviewWeek,
}: {
  userId?: string
  timeZone: string
  onPreviewWeek: (weekStart: string) => void
}) {
  const [state, dispatch] = useReducer(reducer, { phase: 'idle' })
  const identityRef = useRef(userId)
  const epochRef = useRef(0)
  const generationInFlightRef = useRef(false)
  const scheduleOpenInFlightRef = useRef(false)

  // Reset when userId changes (render-time reset, no passive effect)
  if (identityRef.current !== userId) {
    identityRef.current = userId
    ++epochRef.current
    generationInFlightRef.current = false
    dispatch({ type: 'reset' })
    epochRef.current++ // Increment again on cleanup to invalidate in-flight requests
  }

  // Stable callback for onPreviewWeek using useEffectEvent
  const onPreviewWeekEvent = useEffectEvent(onPreviewWeek)

  const preview = editablePreview(state)
  const hasUnsavedPreview = Boolean(
    userId &&
    (preview?.userId === userId ||
      (state.phase === 'confirming' &&
        state.userId === userId &&
        state.originalPreview?.userId === userId)),
  )
  const openSchedule = useCallback(
    async (
      options: {
        targetWeekStart?: string
        mode?: 'new' | 'edit'
        preferences?: Preferences
        preview?: AiPreview
      } = {},
    ) => {
      const requester = identityRef.current
      if (!requester || scheduleOpenInFlightRef.current) return
      const target =
        options.targetWeekStart ?? nextCalendarWeekStart(new Date(), timeZone)
      const mode = options.mode ?? 'new'
      const epoch = ++epochRef.current
      const current = () =>
        epoch === epochRef.current && requester === identityRef.current
      if (
        mode === 'edit' &&
        options.preview?.userId === requester &&
        options.preview.weekStart === target
      ) {
        dispatch({
          type: 'confirm',
          userId: requester,
          targetWeekStart: target,
          mode,
          draft: options.preferences ?? scheduleFromMenu(options.preview.menu),
          replacesSavedMenu: options.preview.replacesSavedMenu,
          preview: options.preview,
        })
        return
      }
      scheduleOpenInFlightRef.current = true
      dispatch({
        type: 'preparing',
        userId: requester,
        targetWeekStart: target,
        mode,
      })
      try {
        const week = await loadWeeklyMenu({ data: { weekStart: target } })
        if (!current()) return
        dispatch({
          type: 'confirm',
          userId: requester,
          targetWeekStart: target,
          mode,
          draft:
            options.preferences ??
            (week.hasSavedMenu
              ? scheduleFromMenu(week.menu)
              : { dayContexts: {}, planningScopes: {} }),
          replacesSavedMenu: week.hasSavedMenu,
        })
      } catch {
        if (current())
          dispatch({
            type: 'failure',
            state: {
              phase: 'error',
              userId: requester,
              targetWeekStart: target,
              reason: 'prepare',
            },
          })
      } finally {
        scheduleOpenInFlightRef.current = false
      }
    },
    [timeZone],
  )

  const updateContext = (day: Day, context: DayContext) => {
    dispatch({ type: 'update-context', day, context })
  }

  const updateScope = (day: Day, scope: PlanningScope) => {
    dispatch({ type: 'update-scope', day, scope })
  }

  // Shared generation core: epoch/identity/in-flight guards, error mapping and
  // preview creation. Callers check their own phase preconditions first.
  const runGeneration = useCallback(
    async ({
      requester,
      target,
      draft,
      replacesSavedMenu,
      previousPreview,
      previousMenu,
    }: {
      requester: string
      target: string
      draft: Preferences
      replacesSavedMenu: boolean
      previousPreview?: AiPreview
      previousMenu?: CalendarWeekMenu
    }) => {
      generationInFlightRef.current = true
      const epoch = ++epochRef.current
      const current = () =>
        epoch === epochRef.current && requester === identityRef.current
      dispatch({
        type: 'generating',
        userId: requester,
        targetWeekStart: target,
        draft,
        replacesSavedMenu,
        preview: previousPreview,
      })
      try {
        const parsedMock = aiMockScenarioSchema.safeParse(
          new URLSearchParams(window.location.search).get('mock'),
        )
        const result = await generateNextWeeklyMenu({
          data: {
            targetWeekStart: target,
            timeZone,
            schedule: targetScheduleFromPreferences(draft),
            ...(previousMenu ? { previousMenu } : {}),
            ...(parsedMock.success ? { mockScenario: parsedMock.data } : {}),
          },
        })
        if (!current()) return
        if (!result.ok) {
          dispatch({
            type: 'failure',
            state: failureFor(result, {
              requester,
              target,
              draft,
              previousPreview,
            }),
          })
          return
        }
        const generated: AiPreview = {
          userId: requester,
          weekStart: target,
          menu: result.menu,
          generatedMenu: result.menu,
          replacesSavedMenu,
          recipeNames: result.recipeNames,
          unavailableSlots: result.unavailableSlots,
        }
        dispatch({
          type: 'preview',
          preview: generated,
          retry: { targetWeekStart: target, draft },
        })
        onPreviewWeekEvent(target)
      } catch {
        if (current())
          dispatch({
            type: 'failure',
            state: {
              phase: 'error',
              userId: requester,
              targetWeekStart: target,
              reason: 'generate',
              retry: { targetWeekStart: target, draft },
              preview: previousPreview,
            },
          })
      } finally {
        if (epoch === epochRef.current) generationInFlightRef.current = false
      }
    },
    [timeZone],
  )

  const confirm = async () => {
    if (
      state.phase !== 'confirming' ||
      !identityRef.current ||
      generationInFlightRef.current
    )
      return
    await runGeneration({
      requester: state.userId,
      target: state.targetWeekStart,
      draft: state.draft,
      replacesSavedMenu: state.replacesSavedMenu,
      previousPreview: state.preview,
    })
  }

  const canRegenerate =
    state.phase === 'preview' ||
    (state.phase === 'error' &&
      Boolean(state.preview) &&
      (state.reason === 'generate' || state.reason === 'in-progress'))

  // Regeneration and its retry retain the proposal until another succeeds.
  const regenerate = async () => {
    const previousPreview =
      state.phase === 'preview' || state.phase === 'error'
        ? state.preview
        : undefined
    if (
      !canRegenerate ||
      !previousPreview ||
      !identityRef.current ||
      previousPreview.userId !== identityRef.current ||
      generationInFlightRef.current
    )
      return
    await runGeneration({
      requester: previousPreview.userId,
      target: previousPreview.weekStart,
      draft: scheduleFromMenu(previousPreview.menu),
      replacesSavedMenu: previousPreview.replacesSavedMenu,
      previousPreview,
      previousMenu: previousPreview.menu,
    })
  }

  const retry = async () => {
    if (state.phase !== 'error') return
    if (
      state.preview &&
      (state.reason === 'generate' || state.reason === 'in-progress')
    ) {
      await regenerate()
      return
    }
    if (state.reason === 'stale-week' && state.expectedTargetWeekStart) {
      await openSchedule({
        targetWeekStart: state.expectedTargetWeekStart,
        mode: 'new',
      })
      return
    }
    if (state.reason === 'prepare') {
      await openSchedule({
        targetWeekStart: state.targetWeekStart,
        mode: 'new',
      })
      return
    }
    const target = nextCalendarWeekStart(new Date(), timeZone)
    const savedDraft =
      state.retry?.targetWeekStart === target ? state.retry.draft : undefined
    await openSchedule({
      targetWeekStart: target,
      mode: 'new',
      preferences: savedDraft,
    })
  }

  const updateRecipe = (
    day: Day,
    slot: MealSlot,
    recipeId: string | null,
    recipes: readonly Recipe[],
  ) => {
    dispatch({
      type: 'update-recipe',
      day,
      slot,
      recipeId,
      recipes,
    })
  }

  const accept = useCallback(
    async (
      persist: (menu: CalendarWeekMenu, preview: AiPreview) => Promise<boolean>,
    ) => {
      if (
        !(
          state.phase === 'preview' ||
          (state.phase === 'error' && state.preview)
        ) ||
        generationInFlightRef.current
      )
        return false
      const currentPreview =
        state.phase === 'preview' ? state.preview : state.preview!
      generationInFlightRef.current = true
      const epoch = ++epochRef.current
      const requester = currentPreview.userId
      dispatch({ type: 'saving', preview: currentPreview })
      try {
        const saved = await persist(currentPreview.menu, currentPreview)
        if (epoch !== epochRef.current || requester !== identityRef.current)
          return false
        if (saved) {
          dispatch({ type: 'accepted' })
          return true
        }
        dispatch({
          type: 'failure',
          state: {
            phase: 'error',
            userId: requester,
            targetWeekStart: currentPreview.weekStart,
            reason: 'save',
            preview: currentPreview,
          },
        })
        return false
      } finally {
        if (epoch === epochRef.current) generationInFlightRef.current = false
      }
    },
    [state],
  )

  const discard = useCallback(() => {
    if (state.phase === 'generating' || state.phase === 'saving') return
    dispatch({ type: 'reset' })
  }, [state.phase])

  const dismiss = useCallback(() => {
    const originalPreview =
      state.phase === 'confirming'
        ? (state.originalPreview ?? state.preview)
        : undefined
    if (originalPreview) {
      dispatch({ type: 'restore-preview', preview: originalPreview })
    } else if (state.phase !== 'generating' && state.phase !== 'saving') {
      dispatch({ type: 'reset' })
    }
  }, [state])
  return {
    state,
    preview,
    hasUnsavedPreview,
    openSchedule,
    updateContext,
    updateScope,
    confirm,
    regenerate,
    canRegenerate,
    retry,
    updateRecipe,
    accept,
    discard,
    dismiss,
    isPreparing: state.phase === 'preparing',
    isGenerating: state.phase === 'generating',
    isSaving: state.phase === 'saving',
  }
}
