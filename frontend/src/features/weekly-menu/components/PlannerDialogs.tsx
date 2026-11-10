import type { ComponentProps } from 'react'
import type { usePlannerGeneration } from '#/features/weekly-menu/hooks/usePlannerGeneration'
import { dateFromWeekStart } from '#/features/weekly-menu/planner-view'
import { useI18n } from '#/shared/i18n'
import { AiGenerationScheduleDialog } from './AiGenerationScheduleDialog'
import { DiscardPreviewDialog } from './DiscardPreviewDialog'
import { GenerateAnotherDialog } from './GenerateAnotherDialog'
import { RecipesNeededDialog } from './RecipesNeededDialog'

type ScheduleDialogProps = ComponentProps<typeof AiGenerationScheduleDialog>

interface PlannerDialogsProps {
  generation: ReturnType<typeof usePlannerGeneration>
  tour: ScheduleDialogProps['tour']
  // Set while a schedule is being confirmed or generated.
  scheduleDialog: {
    draft: ScheduleDialogProps['preferences']
    replacesSavedMenu: boolean
    targetWeekStart: string
  } | null
  isGenerating: boolean
  hasPreview: boolean
  showDiscard: boolean
  onKeepPreview: () => void
  onDiscardPreview: () => void
  isDiscardSaving: boolean
  isSaveUnconfirmed: boolean
}

export function PlannerDialogs({
  generation,
  tour,
  scheduleDialog,
  isGenerating,
  hasPreview,
  showDiscard,
  onKeepPreview,
  onDiscardPreview,
  isDiscardSaving,
  isSaveUnconfirmed,
}: PlannerDialogsProps) {
  const { formatWeekRange } = useI18n()
  const schedule = isGenerating ? null : scheduleDialog
  return (
    <>
      {schedule && (
        <AiGenerationScheduleDialog
          tour={tour}
          isPending={false}
          missingRecipeSlots={generation.missingRecipeSlots}
          replacesSavedMenu={schedule.replacesSavedMenu}
          onAddRecipes={generation.openRecipes}
          preferences={schedule.draft}
          targetWeekRange={formatWeekRange(
            dateFromWeekStart(schedule.targetWeekStart),
          )}
          returnFocusTo={generation.scheduleOpenerRef.current}
          onCancel={generation.cancelScheduleConfirmation}
          onConfirm={() => void generation.confirmGenerationSchedule()}
          onUpdateDayContext={generation.updateScheduleDayContext}
          onUpdatePlanningScope={generation.updateSchedulePlanningScope}
        />
      )}

      {generation.showRecipesNotice && (
        <RecipesNeededDialog
          returnFocusTo={generation.scheduleOpenerRef.current}
          onAddRecipes={generation.openRecipes}
          onClose={generation.closeRecipesNotice}
        />
      )}

      {generation.showGenerateAnother && hasPreview && (
        <GenerateAnotherDialog
          returnFocusTo={generation.generateAnotherOpenerRef.current}
          onCancel={generation.cancelGenerateAnother}
          onConfirm={generation.startGenerateAnother}
        />
      )}

      {showDiscard && (
        <DiscardPreviewDialog
          onKeep={onKeepPreview}
          onDiscard={onDiscardPreview}
          isSaving={isDiscardSaving}
          isSaveUnconfirmed={isSaveUnconfirmed}
        />
      )}
    </>
  )
}
