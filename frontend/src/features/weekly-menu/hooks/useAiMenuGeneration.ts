import { aiMockScenarioSchema } from '#/features/weekly-menu/ai-mock'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
} from 'react'
import { generateNextWeeklyMenu, loadWeeklyMenu } from '../functions'
import type { AiMenuResult } from '../ai-generator'
import {
  nextCalendarWeekStart,
  targetScheduleFromPreferences,
} from '../ai-schedule'
import { DAYS } from '../constants'
import type { Day } from '../constants'
import type { MealSlot, Recipe } from '#/features/recipes/recipe'
import type { DayContext, PlanningScope, Preferences } from '../types'
import {
  updateScheduleDayContext,
  updateSchedulePlanningScope,
} from '../schedule-domain'
import type { CalendarWeekMenu } from '../week'
import { scheduleFromMenu } from '../week'

export type AiPreview = {
  userId: string
  weekStart: string
  /** The server result as generated; manual recipe edits never change it. */
  generatedMenu: CalendarWeekMenu
  /** The target week already has a saved menu that accepting replaces. */
  replacesSavedMenu: boolean
} & AiMenuResult

export function hasManualEdits(preview: AiPreview): boolean {
  return DAYS.some((day) => {
    const shown = preview.menu.days[day]
    const generated = preview.generatedMenu.days[day]
    return (
      shown.lunchRecipeId !== generated.lunchRecipeId ||
      shown.dinnerRecipeId !== generated.dinnerRecipeId
    )
  })
}
export type AiGenerationState =
  | { phase: 'idle' }
  | {
      phase: 'preparing'
      userId: string
      targetWeekStart: string
      mode: 'new' | 'edit'
    }
  | {
      phase: 'confirming'
      userId: string
      targetWeekStart: string
      mode: 'new' | 'edit'
      draft: Preferences
      replacesSavedMenu: boolean
      preview?: AiPreview
      originalPreview?: AiPreview
    }
  | {
      phase: 'generating'
      userId: string
      targetWeekStart: string
      draft: Preferences
      replacesSavedMenu: boolean
      preview?: AiPreview
    }
  | {
      phase: 'preview'
      preview: AiPreview
      retry?: { targetWeekStart: string; draft: Preferences }
    }
  | { phase: 'saving'; preview: AiPreview }
  | {
      phase: 'error'
      userId: string
      targetWeekStart: string
      reason:
        | 'prepare'
        | 'generate'
        | 'stale-week'
        | 'rate-limited'
        | 'in-progress'
        | 'save'
      expectedTargetWeekStart?: string
      retry?: { targetWeekStart: string; draft: Preferences }
      preview?: AiPreview
    }

type Action =
  | { type: 'reset' }
  | {
      type: 'preparing'
      userId: string
      targetWeekStart: string
      mode: 'new' | 'edit'
    }
  | {
      type: 'confirm'
      userId: string
      targetWeekStart: string
      mode: 'new' | 'edit'
      draft: Preferences
      replacesSavedMenu: boolean
      preview?: AiPreview
    }
  | { type: 'draft'; draft: Preferences; invalidatePreview?: boolean }
  | {
      type: 'generating'
      userId: string
      targetWeekStart: string
      draft: Preferences
      replacesSavedMenu: boolean
      preview?: AiPreview
    }
  | {
      type: 'preview'
      preview: AiPreview
      retry: { targetWeekStart: string; draft: Preferences }
    }
  | { type: 'failure'; state: Extract<AiGenerationState, { phase: 'error' }> }
  | { type: 'saving'; preview: AiPreview }
  | { type: 'accepted' }
  | { type: 'restore-preview'; preview: AiPreview }
  | { type: 'recipe'; preview: AiPreview }

function reducer(state: AiGenerationState, action: Action): AiGenerationState {
  switch (action.type) {
    case 'reset':
    case 'accepted':
      return { phase: 'idle' }
    case 'restore-preview':
      return { phase: 'preview', preview: action.preview }
    case 'preparing':
      return { phase: 'preparing', ...action }
    case 'confirm':
      return { phase: 'confirming', ...action }
    case 'draft':
      return state.phase === 'confirming'
        ? {
            ...state,
            draft: action.draft,
            ...(action.invalidatePreview
              ? {
                  preview: undefined,
                  originalPreview: state.originalPreview ?? state.preview,
                }
              : {}),
          }
        : state
    case 'generating':
      return { phase: 'generating', ...action }
    case 'preview':
      return { phase: 'preview', preview: action.preview, retry: action.retry }
    case 'failure':
      return action.state
    case 'saving':
      return { phase: 'saving', preview: action.preview }
    case 'recipe':
      return state.phase === 'preview' ||
        (state.phase === 'error' && Boolean(state.preview))
        ? { ...state, preview: action.preview }
        : state
  }
}

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
  useLayoutEffect(() => {
    identityRef.current = userId
  }, [userId])
  useEffect(() => {
    ++epochRef.current
    generationInFlightRef.current = false
    dispatch({ type: 'reset' })
    return () => {
      ++epochRef.current
    }
  }, [userId])

  const preview =
    state.phase === 'preview' || state.phase === 'saving'
      ? state.preview
      : state.phase === 'error' || state.phase === 'generating'
        ? state.preview
        : state.phase === 'confirming'
          ? state.preview
          : null
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
      if (
        !requester ||
        state.phase === 'preparing' ||
        state.phase === 'generating' ||
        state.phase === 'saving'
      )
        return
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
      }
    },
    [state.phase, timeZone],
  )

  const updateContext = useCallback(
    (day: Day, context: DayContext) => {
      if (state.phase !== 'confirming') return
      const next = updateScheduleDayContext(state.draft, day, context)
      dispatch({
        type: 'draft',
        draft: next,
        invalidatePreview: state.mode === 'edit' && next !== state.draft,
      })
    },
    [state],
  )
  const updateScope = useCallback(
    (day: Day, scope: PlanningScope) => {
      if (state.phase !== 'confirming') return
      const next = updateSchedulePlanningScope(state.draft, day, scope)
      if (next === state.draft) return
      dispatch({
        type: 'draft',
        draft: next,
        invalidatePreview: state.mode === 'edit',
      })
    },
    [state],
  )

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
          if (result.reason === 'stale-week')
            dispatch({
              type: 'failure',
              state: {
                phase: 'error',
                userId: requester,
                targetWeekStart: target,
                reason: 'stale-week',
                expectedTargetWeekStart: result.expectedTargetWeekStart,
                preview: previousPreview,
              },
            })
          else
            dispatch({
              type: 'failure',
              state: {
                phase: 'error',
                userId: requester,
                targetWeekStart: target,
                reason: result.reason,
                retry: { targetWeekStart: target, draft },
                preview: previousPreview,
              },
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
        onPreviewWeek(target)
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
    [timeZone, onPreviewWeek],
  )

  const confirm = useCallback(async () => {
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
  }, [state, runGeneration])

  // A brand-new full proposal for the same confirmed schedule, varied against
  // the proposal on screen. Only allowed from a settled preview.
  const regenerate = useCallback(async () => {
    if (
      state.phase !== 'preview' ||
      !identityRef.current ||
      state.preview.userId !== identityRef.current ||
      generationInFlightRef.current
    )
      return
    const previousPreview = state.preview
    await runGeneration({
      requester: previousPreview.userId,
      target: previousPreview.weekStart,
      // After Edit schedule -> Cancel the retry info is gone; the schedule is
      // still fully described by the menu itself.
      draft: state.retry?.draft ?? scheduleFromMenu(previousPreview.menu),
      replacesSavedMenu: previousPreview.replacesSavedMenu,
      previousPreview,
      previousMenu: previousPreview.menu,
    })
  }, [state, runGeneration])

  const retry = useCallback(async () => {
    if (state.phase !== 'error') return
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
  }, [state, openSchedule, timeZone])

  const updateRecipe = useCallback(
    (
      day: Day,
      slot: MealSlot,
      recipeId: string | null,
      recipes: readonly Recipe[],
    ) => {
      if (!(
        state.phase === 'preview' ||
        (state.phase === 'error' && state.preview)
      ))
        return
      const currentPreview =
        state.phase === 'preview' ? state.preview : state.preview!
      const selected = recipes.find((recipe) => recipe.id === recipeId)
      const plan = currentPreview.menu.days[day]
      const field = slot === 'lunch' ? 'lunchRecipeId' : 'dinnerRecipeId'
      dispatch({
        type: 'recipe',
        preview: {
          ...currentPreview,
          menu: {
            ...currentPreview.menu,
            days: {
              ...currentPreview.menu.days,
              [day]: { ...plan, [field]: recipeId },
            },
          },
          recipeNames: selected
            ? { ...currentPreview.recipeNames, [selected.id]: selected.name }
            : currentPreview.recipeNames,
        },
      })
    },
    [state],
  )

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
    canRegenerate: state.phase === 'preview',
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
