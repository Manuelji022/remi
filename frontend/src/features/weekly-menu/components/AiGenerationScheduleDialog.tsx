import type { CSSProperties } from 'react'
import { TourCallout } from './TourCallout'
import type { useFirstRunTour } from '../hooks/useFirstRunTour'
import { Banner, Button, TextLink } from '#/components/primitives'
import { Dialog } from '#/components/primitives/Dialog'
import type { Preferences } from '#/features/weekly-menu/types'
import type {
  ScheduleDayContextChange,
  SchedulePlanningScopeChange,
} from '#/features/weekly-menu/schedule-domain'
import type { MealSlot } from '#/features/recipes/recipe'
import { useI18n } from '#/shared/i18n'
import { ScheduleEditor } from './ScheduleEditor'

interface AiGenerationScheduleDialogProps {
  tour: ReturnType<typeof useFirstRunTour>
  isPending: boolean
  preferences: Preferences
  targetWeekRange: { start: string; end: string }
  returnFocusTo: HTMLElement | null
  missingRecipeSlots: readonly MealSlot[]
  replacesSavedMenu: boolean
  onAddRecipes: () => void
  onCancel: () => void
  onConfirm: () => void
  onUpdateDayContext: ScheduleDayContextChange
  onUpdatePlanningScope: SchedulePlanningScopeChange
}

/** The schedule editor needs more room than the 520 default. */
const wideDialog = { '--dialog-width': '58rem' } as CSSProperties

export function AiGenerationScheduleDialog({
  tour,
  isPending,
  preferences,
  targetWeekRange,
  returnFocusTo,
  missingRecipeSlots,
  replacesSavedMenu,
  onAddRecipes,
  onCancel,
  onConfirm,
  onUpdateDayContext,
  onUpdatePlanningScope,
}: AiGenerationScheduleDialogProps) {
  const { t } = useI18n()
  return (
    <Dialog
      id="ai-generation"
      title={t('planner.aiScheduleTitle')}
      description={t('planner.aiScheduleBody')}
      style={wideDialog}
      returnFocusTo={returnFocusTo}
      onDismiss={onCancel}
      dismissDisabled={isPending}
      actions={
        <>
          <Button variant="secondary" disabled={isPending} onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button variant="brand" disabled={isPending} onClick={onConfirm}>
            {t(isPending ? 'planner.generating' : 'planner.aiConfirmSchedule')}
          </Button>
        </>
      }
    >
      <p className="panel-section-kicker">
        {t('planner.aiScheduleKicker')} · {targetWeekRange.start} –{' '}
        {targetWeekRange.end}
      </p>
      <fieldset className="planner-ai-schedule-fields" disabled={isPending}>
        <ScheduleEditor
          dayContexts={preferences.dayContexts}
          planningScopes={preferences.planningScopes}
          onUpdateDayContext={onUpdateDayContext}
          onUpdatePlanningScope={onUpdatePlanningScope}
        />
      </fieldset>
      {tour.step === 1 && (
        <TourCallout
          step={1}
          title={t('planner.tourScheduleTitle')}
          body={t('planner.tourScheduleBody')}
          isLast={false}
          onNext={tour.next}
          onSkip={tour.skip}
        />
      )}
      {missingRecipeSlots.length > 0 && (
        <Banner
          tone="error"
          announce
          action={
            <TextLink onClick={onAddRecipes}>
              {t('planner.aiAddRecipes')}
            </TextLink>
          }
        >
          {t(
            missingRecipeSlots.length > 1
              ? 'planner.aiMissingBothRecipes'
              : missingRecipeSlots[0] === 'lunch'
                ? 'planner.aiMissingLunchRecipes'
                : 'planner.aiMissingDinnerRecipes',
          )}
        </Banner>
      )}
      {replacesSavedMenu && (
        <p className="planner-ai-replace-note">{t('planner.aiReplaceNote')}</p>
      )}
    </Dialog>
  )
}
