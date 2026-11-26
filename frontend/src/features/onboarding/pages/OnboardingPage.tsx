import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Banner, Skeleton, TextLink } from '#/components/primitives'
import { getLocalizedPath, useI18n } from '#/shared/i18n'
import { authClient } from '#/features/auth/auth-client'
import { useRecipeCatalog } from '#/features/recipes/hooks/useRecipeCatalog'
import { AddRecipesStep } from '../components/AddRecipesStep'
import { DoneStep } from '../components/DoneStep'
import { OnboardingTopBar } from '../components/OnboardingTopBar'
import type { OnboardingStep } from '../components/OnboardingTopBar'
import { WelcomeStep } from '../components/WelcomeStep'
import '../components/onboarding.css'

export function OnboardingPage({ step }: { step: OnboardingStep }) {
  const { locale, t } = useI18n()
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()
  const userId = session?.user.id
  const firstName = session?.user.name.trim().split(/\s+/)[0] ?? ''
  const catalog = useRecipeCatalog({ userId })
  const plannerPath = getLocalizedPath('/weekly-menu-planner', locale)
  const recipes = userId ? catalog.recipes : null
  // A typed address cannot finish onboarding with nothing saved.
  const isEarly = step === 'done' && recipes?.length === 0
  const shownStep = isEarly ? 'recipes' : step
  const onboardingPath = getLocalizedPath('/onboarding', locale)

  // Onboarding saves to an account, so guests go straight to the planner.
  const isGuest = !isPending && !userId
  useEffect(() => {
    if (isGuest) void navigate({ to: plannerPath, replace: true })
  }, [isGuest, navigate, plannerPath])

  // The address is corrected too, or the first save would jump to done.
  useEffect(() => {
    if (!isEarly) return
    void navigate({
      to: onboardingPath,
      search: { step: 'recipes' },
      replace: true,
    })
  }, [isEarly, navigate, onboardingPath])

  function goTo(next: Exclude<OnboardingStep, 'welcome'> | undefined) {
    void navigate({ to: onboardingPath, search: { step: next } })
  }

  let content
  if (recipes && shownStep === 'welcome') {
    content = <WelcomeStep name={firstName} onStart={() => goTo('recipes')} />
  } else if (recipes && shownStep === 'done') {
    content = (
      <DoneStep
        name={firstName}
        onAddMore={() => goTo('recipes')}
        onGenerate={() =>
          void navigate({ to: plannerPath, search: { generate: 'first' } })
        }
        recipes={recipes}
      />
    )
  } else if (recipes) {
    content = (
      <AddRecipesStep
        isSaving={catalog.isAddingRecipe}
        onAddRecipe={catalog.addRecipe}
        onContinue={() => goTo('done')}
        recipes={recipes}
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
    <div
      className={
        shownStep === 'recipes' ? 'onboarding' : 'onboarding onboarding-intro'
      }
    >
      <OnboardingTopBar
        onBack={shownStep === 'recipes' ? () => goTo(undefined) : undefined}
        step={shownStep}
      />
      <main className="onboarding-main" id="main">
        {content}
      </main>
    </div>
  )
}
