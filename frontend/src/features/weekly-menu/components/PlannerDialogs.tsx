import type { ComponentProps } from 'react'
import type { usePlannerGeneration } from '#/features/weekly-menu/hooks/usePlannerGeneration'
import { AiGenerationScheduleDialog } from './AiGenerationScheduleDialog'
import { DiscardPreviewDialog } from './DiscardPreviewDialog'
import { GenerateAnotherDialog } from './GenerateAnotherDialog'
import { RecipesNeededDialog } from './RecipesNeededDialog'

type ScheduleDialogProps = ComponentProps<typeof AiGenerationScheduleDialog>

interface PlannerDialogsProps {
  generation: ReturnType<typeof usePlannerGeneration>
  tour: ScheduleDialogProps['tour']
  // Set while the schedule dialog should show (confirming or generating).
  schedule: {
    draft: ScheduleDialogProps['preferences']
    replacesSavedMenu: boolean
  } | null
  targetWeekRange: ScheduleDialogProps['targetWeekRange']
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
  schedule,
  targetWeekRange,
  hasPreview,
  showDiscard,
  onKeepPreview,
  onDiscardPreview,
  isDiscardSaving,
  isSaveUnconfirmed,
}: PlannerDialogsProps) {
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
          targetWeekRange={targetWeekRange}
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
