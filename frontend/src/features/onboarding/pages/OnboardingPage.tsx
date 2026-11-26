import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Banner, Skeleton, TextLink } from '#/components/primitives'
import { getLocalizedPath, useI18n } from '#/shared/i18n'
import { authClient } from '#/features/auth/auth-client'
import { useRecipeCatalog } from '#/features/recipes/hooks/useRecipeCatalog'
import { AddRecipesStep } from '../components/AddRecipesStep'
import { OnboardingTopBar } from '../components/OnboardingTopBar'
import '../components/onboarding.css'

export function OnboardingPage() {
  const { locale, t } = useI18n()
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()
  const userId = session?.user.id
  const catalog = useRecipeCatalog({ userId })
  const plannerPath = getLocalizedPath('/weekly-menu-planner', locale)

  // Onboarding saves to an account, so guests go straight to the planner.
  const isGuest = !isPending && !userId
  useEffect(() => {
    if (isGuest) void navigate({ to: plannerPath, replace: true })
  }, [isGuest, navigate, plannerPath])

  let content
  if (userId && catalog.recipes) {
    content = (
      <AddRecipesStep
        isSaving={catalog.isAddingRecipe}
        onAddRecipe={catalog.addRecipe}
        onContinue={() => void navigate({ to: plannerPath })}
        recipes={catalog.recipes}
      />
    )
  } else if (userId && catalog.actionFailed) {
    content = (
      <Banner
        announce
        className="onboarding-notice"
        tone="error"
        action={
          <TextLink onClick={() => window.location.reload()} variant="inline">
            {t('common.tryAgain')}
          </TextLink>
        }
      >
        {t('onboarding.loadError')}
      </Banner>
    )
  } else {
    content = (
      <div className="onboarding-notice" role="status">
        <span className="onboarding-hidden-text">
          {t('preferences.recipesLoading')}
        </span>
        <Skeleton />
      </div>
    )
  }

  return (
    <div className="onboarding">
      <OnboardingTopBar step="recipes" />
      <main className="onboarding-main" id="main">
        {content}
      </main>
    </div>
  )
}
