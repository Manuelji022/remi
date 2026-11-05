import { TourCallout } from './TourCallout'
import type { useFirstRunTour } from '../hooks/useFirstRunTour'
import { useEffect, useRef } from 'react'
import { MenuTab } from './MenuTab'
import type { Day } from '../constants'
import type { CalendarWeekMenu } from '../week'
import type { MealSlot, Recipe } from '#/features/recipes/recipe'
import { useI18n } from '#/shared/i18n'

interface AiMenuPreviewProps {
  tour: ReturnType<typeof useFirstRunTour>
  menu: CalendarWeekMenu
  recipeNames: Record<string, string>
  unavailableSlots: readonly MealSlot[]
  recipes?: readonly Recipe[]
  isCatalogReady: boolean
  hasCatalogLoadFailed: boolean
  isWriting: boolean
  isAccepting: boolean
  isSaveUnconfirmed: boolean
  canAccept: boolean
  isSignedIn: boolean
  replacesSavedMenu: boolean
  isLocalFallback?: boolean
  canGenerateAnother: boolean
  onGenerateAnother: (opener: HTMLElement) => void
  onEditSchedule: () => void
  onDiscard: () => void
  onAccept: () => void
  onRetryCatalog: () => void
  onGenerateMenu: () => void
  onUpdateRecipe: (day: Day, slot: MealSlot, recipeId: string | null) => void
}

export function AiMenuPreview({
  tour,
  menu,
  recipeNames,
  unavailableSlots,
  recipes,
  isCatalogReady,
  hasCatalogLoadFailed,
  isWriting,
  isAccepting,
  isSaveUnconfirmed,
  canAccept,
  isSignedIn,
  replacesSavedMenu,
  isLocalFallback = false,
  canGenerateAnother,
  onGenerateAnother,
  onEditSchedule,
  onDiscard,
  onAccept,
  onRetryCatalog,
  onGenerateMenu,
  onUpdateRecipe,
}: AiMenuPreviewProps) {
  const { t } = useI18n()
  const headingRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    if (document.activeElement === document.body) headingRef.current?.focus()
  }, [])

  return (
    <div className="planner-ai-preview">
      <div className="planner-ai-preview-banner">
        <div aria-live="polite">
          <p
            className="planner-ai-preview-kicker"
            ref={headingRef}
            role="heading"
            aria-level={2}
            tabIndex={-1}
          >
            {t('planner.aiPreviewLabel')}
          </p>
          <p>
            {t(
              isSaveUnconfirmed
                ? 'planner.aiPreviewSaveUnconfirmed'
                : 'planner.aiPreviewBody',
            )}
          </p>
          {isLocalFallback && (
            <p className="planner-ai-replace-note" role="status">
              {t('planner.aiPreviewLocalFallback')}
            </p>
          )}
          {replacesSavedMenu && (
            <p className="planner-ai-replace-note">
              {t('planner.aiPreviewReplaceNote')}
            </p>
          )}
        </div>
        {tour.step === 2 && (
          <TourCallout
            step={2}
            title={t('planner.tourReviewTitle')}
            body={t('planner.tourReviewBody')}
            isLast={false}
            onNext={tour.next}
            onSkip={tour.skip}
          />
        )}
        <div className="planner-ai-preview-actions">
          <button
            className="planner-secondary-btn"
            type="button"
            onClick={onEditSchedule}
            disabled={isWriting}
          >
            {t('planner.aiEditSchedule')}
          </button>
          <button
            className="planner-secondary-btn"
            type="button"
            onClick={(event) => onGenerateAnother(event.currentTarget)}
            disabled={!canGenerateAnother}
          >
            {t('planner.aiGenerateAnother')}
          </button>
          <button
            className="planner-secondary-btn"
            type="button"
            onClick={onDiscard}
            disabled={isWriting}
          >
            {t('planner.aiDiscardPreview')}
          </button>
          {tour.step === 3 && (
            <TourCallout
              step={3}
              title={t('planner.tourAcceptTitle')}
              body={t('planner.tourAcceptBody')}
              isLast
              onNext={tour.next}
              onSkip={tour.skip}
            />
          )}
          <button
            className="planner-primary-btn"
            type="button"
            onClick={onAccept}
            disabled={!canAccept}
          >
            {t(
              isAccepting
                ? 'planner.aiSavingPreview'
                : 'planner.aiAcceptPreview',
            )}
          </button>
        </div>
      </div>
      {unavailableSlots.map((slot) => (
        <p className="planner-ai-shortage" key={slot} role="status">
          {t(
            slot === 'lunch'
              ? 'planner.aiNoLunchRecipes'
              : 'planner.aiNoDinnerRecipes',
          )}
        </p>
      ))}
      {!isCatalogReady && hasCatalogLoadFailed && (
        <div className="planner-feedback" role="alert">
          <p>{t('planner.loadErrorBody')}</p>
          <button
            className="planner-secondary-btn"
            type="button"
            onClick={onRetryCatalog}
          >
            {t('planner.retryLoad')}
          </button>
        </div>
      )}
      {!isCatalogReady && !hasCatalogLoadFailed && (
        <p className="planner-feedback" role="status">
          {t('planner.loadingWeek')}
        </p>
      )}
      <div className="planner-ai-preview-menu">
        <MenuTab
          editableRecipes={isCatalogReady ? recipes : undefined}
          isGenerating={false}
          menu={menu}
          onGenerateMenu={onGenerateMenu}
          onUpdateRecipe={onUpdateRecipe}
          areRecipeEditsDisabled={isAccepting}
          recipeNames={recipeNames}
          isSignedIn={isSignedIn}
        />
      </div>
    </div>
  )
}
