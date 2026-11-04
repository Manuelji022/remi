import type { ReactNode } from 'react'
import { createContext, useContext, useMemo } from 'react'
import { useAiMenuGeneration } from './useAiMenuGeneration'
import type { AiPreview } from '../ai-generation-state'
import type { Day } from '../constants'
import type { DayContext, Preferences, PlanningScope } from '../types'
import type { MealSlot, Recipe } from '#/features/recipes/recipe'

interface PlannerGenerationContextType {
  // State
  preview: AiPreview | null
  hasUnsavedPreview: boolean
  isGenerating: boolean
  isPreparing: boolean
  isSaving: boolean
  canRegenerate: boolean
  state: ReturnType<typeof useAiMenuGeneration>['state']

  // Actions
  openSchedule: (options?: {
    targetWeekStart?: string
    mode?: 'new' | 'edit'
    preferences?: Preferences
    preview?: AiPreview
  }) => Promise<void>
  updateContext: (day: Day, context: DayContext) => void
  updateScope: (day: Day, scope: PlanningScope) => void
  confirm: () => Promise<void>
  regenerate: () => Promise<void>
  retry: () => Promise<void>
  updateRecipe: (
    day: Day,
    slot: MealSlot,
    recipeId: string | null,
    recipes: readonly Recipe[],
  ) => void
  accept: (
    persist: (menu: any, preview: AiPreview) => Promise<boolean>,
  ) => Promise<boolean>
  discard: () => void
  dismiss: () => void
}

const PlannerGenerationContext =
  createContext<PlannerGenerationContextType | null>(null)

export function usePlannerGeneration(): PlannerGenerationContextType {
  const context = useContext(PlannerGenerationContext)
  if (!context) {
    throw new Error(
      'usePlannerGeneration must be used within PlannerGenerationProvider',
    )
  }
  return context
}

export function PlannerGenerationProvider({
  userId,
  timeZone,
  onPreviewWeek,
  children,
}: {
  userId?: string
  timeZone: string
  onPreviewWeek: (weekStart: string) => void
  children: ReactNode
}) {
  const aiGeneration = useAiMenuGeneration({
    userId,
    timeZone,
    onPreviewWeek,
  })

  const value = useMemo<PlannerGenerationContextType>(
    () => ({
      preview: aiGeneration.preview,
      hasUnsavedPreview: aiGeneration.hasUnsavedPreview,
      isGenerating: aiGeneration.isGenerating,
      isPreparing: aiGeneration.isPreparing,
      isSaving: aiGeneration.isSaving,
      canRegenerate: aiGeneration.canRegenerate,
      state: aiGeneration.state,
      openSchedule: aiGeneration.openSchedule,
      updateContext: aiGeneration.updateContext,
      updateScope: aiGeneration.updateScope,
      confirm: aiGeneration.confirm,
      regenerate: aiGeneration.regenerate,
      retry: aiGeneration.retry,
      updateRecipe: aiGeneration.updateRecipe,
      accept: aiGeneration.accept,
      discard: aiGeneration.discard,
      dismiss: aiGeneration.dismiss,
    }),
    [aiGeneration],
  )

  return (
    <PlannerGenerationContext.Provider value={value}>
      {children}
    </PlannerGenerationContext.Provider>
  )
}
