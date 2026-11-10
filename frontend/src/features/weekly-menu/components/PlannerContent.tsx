import type { ComponentProps } from 'react'
import { AiMenuPreview } from './AiMenuPreview'
import { AiMenuSkeleton } from './AiMenuSkeleton'
import { MenuTab } from './MenuTab'
import { ShoppingTab } from './ShoppingTab'
import { WeekLockButton } from './WeekLockButton'
import type { ShoppingLine } from '#/features/weekly-menu/shopping'
import { useI18n } from '#/shared/i18n'

type PreviewProps = ComponentProps<typeof AiMenuPreview>
type MenuProps = ComponentProps<typeof MenuTab>

interface PlannerContentProps {
  activeTab: 'menu' | 'ingredients'
  generatingTargetWeek: string | null
  isLoading: boolean
  loadFailed: boolean
  onRetryLoad: () => void
  tour: PreviewProps['tour']
  // Set while an AI preview is open; otherwise the saved menu or shopping list.
  currentPreview:
    | {
        menu: PreviewProps['menu']
        recipeNames: PreviewProps['recipeNames']
        unavailableSlots: PreviewProps['unavailableSlots']
        replacesSavedMenu: PreviewProps['replacesSavedMenu']
        selectionSource?: string
      }
    | null
    | undefined
  readyData: {
    recipes: PreviewProps['recipes']
    week: { recipeNames: MenuProps['recipeNames'] }
  } | null
  previewCatalogReady: boolean
  isWriting: boolean
  isAcceptingPreview: boolean
  previewSaveError: string | null
  canAcceptPreview: boolean
  canGenerateAnother: boolean
  userId: string | undefined
  isGenerating: boolean
  visibleMenu: MenuProps['menu']
  viewedWeek: string
  isLocked: boolean
  shoppingEnabled: boolean
  shoppingLines: readonly ShoppingLine[]
  checkedIngredients: ComponentProps<typeof ShoppingTab>['checkedIngredients']
  onToggleIngredient: (key: string) => void
  onGenerateAnother: PreviewProps['onGenerateAnother']
  onEditSchedule: () => void
  onDiscard: () => void
  onAccept: () => void
  onGenerateMenu: () => void
  onUpdateRecipe: PreviewProps['onUpdateRecipe']
  onUnlockWeek: (week: string) => void
}

export function PlannerContent(props: PlannerContentProps) {
  const { t } = useI18n()
  const { currentPreview, shoppingLines } = props

  if (props.generatingTargetWeek) return <AiMenuSkeleton />
  if (props.isLoading && !currentPreview) {
    return (
      <div className="empty-state" role="status">
        <p>{t('planner.loadingWeek')}</p>
      </div>
    )
  }
  if (props.loadFailed && !currentPreview) {
    return (
      <div className="empty-state" role="alert">
        <h2>{t('planner.loadErrorTitle')}</h2>
        <p>{t('planner.loadErrorBody')}</p>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={props.onRetryLoad}
        >
          {t('planner.retryLoad')}
        </button>
      </div>
    )
  }
  if (props.activeTab !== 'menu') {
    if (!props.shoppingEnabled) return null
    return (
      <ShoppingTab
        lines={shoppingLines}
        checklistId={JSON.stringify([props.userId, props.viewedWeek])}
        checkedIngredients={props.checkedIngredients}
        onToggleIngredient={props.onToggleIngredient}
      />
    )
  }
  if (currentPreview) {
    return (
      <AiMenuPreview
        tour={props.tour}
        menu={currentPreview.menu}
        recipeNames={currentPreview.recipeNames}
        unavailableSlots={currentPreview.unavailableSlots}
        recipes={props.readyData?.recipes}
        isCatalogReady={props.previewCatalogReady}
        hasCatalogLoadFailed={props.loadFailed}
        isWriting={props.isWriting}
        isAccepting={props.isAcceptingPreview}
        isSaveUnconfirmed={Boolean(props.previewSaveError)}
        canAccept={props.canAcceptPreview}
        isSignedIn={Boolean(props.userId)}
        replacesSavedMenu={currentPreview.replacesSavedMenu}
        isLocalFallback={currentPreview.selectionSource === 'local'}
        canGenerateAnother={props.canGenerateAnother}
        onGenerateAnother={props.onGenerateAnother}
        onEditSchedule={props.onEditSchedule}
        onDiscard={props.onDiscard}
        onAccept={props.onAccept}
        onRetryCatalog={props.onRetryLoad}
        onGenerateMenu={props.onGenerateMenu}
        onUpdateRecipe={props.onUpdateRecipe}
      />
    )
  }
  return (
    <>
      {props.visibleMenu && (
        <WeekLockButton
          key={props.viewedWeek}
          isLocked={props.isLocked}
          onUnlock={() => {
            props.onUnlockWeek(props.viewedWeek)
            document
              .querySelector<HTMLButtonElement>(
                '.planner-actions .btn-secondary',
              )
              ?.focus()
          }}
        />
      )}
      <MenuTab
        isGenerating={props.isGenerating}
        menu={props.visibleMenu}
        onGenerateMenu={props.onGenerateMenu}
        recipeNames={props.readyData?.week.recipeNames ?? {}}
        isSignedIn={Boolean(props.userId)}
      />
    </>
  )
}
