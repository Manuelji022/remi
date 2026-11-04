import type { AiMenuResult } from './ai-generator'
import { DAYS } from './constants'
import type { Day } from './constants'
import type { MealSlot, Recipe } from '#/features/recipes/recipe'
import type { DayContext, PlanningScope, Preferences } from './types'
import {
  updateScheduleDayContext,
  updateSchedulePlanningScope,
} from './schedule-domain'
import type { CalendarWeekMenu } from './week'

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

export type Action =
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
  | { type: 'update-context'; day: Day; context: DayContext }
  | { type: 'update-scope'; day: Day; scope: PlanningScope }
  | {
      type: 'update-recipe'
      day: Day
      slot: MealSlot
      recipeId: string | null
      recipes: readonly Recipe[]
    }
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

export function reducer(
  state: AiGenerationState,
  action: Action,
): AiGenerationState {
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
    case 'update-context': {
      if (state.phase !== 'confirming') return state
      const nextWithContext = updateScheduleDayContext(
        state.draft,
        action.day,
        action.context,
      )
      return {
        ...state,
        draft: nextWithContext,
        ...(state.mode === 'edit' && nextWithContext !== state.draft
          ? {
              preview: undefined,
              originalPreview: state.originalPreview ?? state.preview,
            }
          : {}),
      }
    }
    case 'update-scope': {
      if (state.phase !== 'confirming') return state
      const nextWithScope = updateSchedulePlanningScope(
        state.draft,
        action.day,
        action.scope,
      )
      if (nextWithScope === state.draft) return state
      return {
        ...state,
        draft: nextWithScope,
        ...(state.mode === 'edit'
          ? {
              preview: undefined,
              originalPreview: state.originalPreview ?? state.preview,
            }
          : {}),
      }
    }
    case 'generating':
      return { phase: 'generating', ...action }
    case 'preview':
      return { phase: 'preview', preview: action.preview, retry: action.retry }
    case 'failure':
      return action.state
    case 'saving':
      return { phase: 'saving', preview: action.preview }
    case 'update-recipe': {
      if (!(
        state.phase === 'preview' ||
        (state.phase === 'error' && state.preview)
      ))
        return state
      const currentPreview =
        state.phase === 'preview' ? state.preview : state.preview!
      const selected = action.recipes.find(
        (recipe) => recipe.id === action.recipeId,
      )
      const plan = currentPreview.menu.days[action.day]
      const field = action.slot === 'lunch' ? 'lunchRecipeId' : 'dinnerRecipeId'
      return {
        ...state,
        preview: {
          ...currentPreview,
          menu: {
            ...currentPreview.menu,
            days: {
              ...currentPreview.menu.days,
              [action.day]: { ...plan, [field]: action.recipeId },
            },
          },
          recipeNames: selected
            ? { ...currentPreview.recipeNames, [selected.id]: selected.name }
            : currentPreview.recipeNames,
        },
      }
    }
  }
}

/**
 * Get the editable preview, accounting for edit mode invalidation.
 * Returns the current preview if one exists and is ready for editing.
 */
export function editablePreview(state: AiGenerationState): AiPreview | null {
  if (state.phase === 'preview' || state.phase === 'saving')
    return state.preview
  if (state.phase === 'error' || state.phase === 'generating')
    return state.preview ?? null
  if (state.phase === 'confirming') return state.preview ?? null
  return null
}

/**
 * Map a generation result failure to the appropriate error state.
 * Handles stale-week and other failure reasons.
 */
export function failureFor(
  result: { ok: false; reason: string; expectedTargetWeekStart?: string },
  ctx: {
    requester: string
    target: string
    draft: Preferences
    previousPreview?: AiPreview
  },
): Extract<AiGenerationState, { phase: 'error' }> {
  if (result.reason === 'stale-week') {
    return {
      phase: 'error',
      userId: ctx.requester,
      targetWeekStart: ctx.target,
      reason: 'stale-week',
      expectedTargetWeekStart: result.expectedTargetWeekStart,
      preview: ctx.previousPreview,
    }
  }
  return {
    phase: 'error',
    userId: ctx.requester,
    targetWeekStart: ctx.target,
    reason: result.reason as any,
    retry: { targetWeekStart: ctx.target, draft: ctx.draft },
    preview: ctx.previousPreview,
  }
}
