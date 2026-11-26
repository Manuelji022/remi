import type { ComponentProps } from 'react'
import { AiMenuPreview } from './AiMenuPreview'
import { AiMenuSkeleton } from './AiMenuSkeleton'
import { MenuTab } from './MenuTab'
import { Button, EmptyState } from '#/components/primitives'
import { useI18n } from '#/shared/i18n'

type PreviewProps = ComponentProps<typeof AiMenuPreview>
type MenuProps = ComponentProps<typeof MenuTab>

interface PlannerContentProps {
  generatingTargetWeek: string | null
  isLoading: boolean
  loadFailed: boolean
  onRetryLoad: () => void
  tour: PreviewProps['tour']
  // Set while an AI preview is open; otherwise the saved menu.
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
  onGenerateAnother: PreviewProps['onGenerateAnother']
  onEditSchedule: () => void
  onDiscard: () => void
  onAccept: () => void
  onGenerateMenu: () => void
  onUpdateRecipe: PreviewProps['onUpdateRecipe']
}

export function PlannerContent(props: PlannerContentProps) {
  const { t } = useI18n()
  const { currentPreview } = props

  if (props.generatingTargetWeek) return <AiMenuSkeleton />
  if (props.isLoading && !currentPreview) {
    return <EmptyState title={t('planner.loadingWeek')} role="status" />
  }
  if (props.loadFailed && !currentPreview) {
    return (
      <EmptyState
        title={t('planner.loadErrorTitle')}
        role="alert"
        action={
          <Button variant="secondary" onClick={props.onRetryLoad}>
            {t('planner.retryLoad')}
          </Button>
        }
      >
        <p>{t('planner.loadErrorBody')}</p>
      </EmptyState>
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
      <MenuTab
        isGenerating={props.isGenerating}
        menu={props.visibleMenu}
        onGenerateMenu={props.onGenerateMenu}
        recipeNames={props.readyData?.week.recipeNames ?? {}}
        isSignedIn={Boolean(props.userId)}
        stackPastDays
      />
    </>
  )
}
