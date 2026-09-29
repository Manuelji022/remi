import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import './weekly-menu-planner.css'
import { DayCard, LoadingDots, MainTab, PreferencesPanel } from '#/components'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SettingsIcon,
  SparkleIcon,
} from '#/components/icons'
import { DAYS, getWeekNumber, isWeekend } from '#/data/constants'
import {
  getActivePreferencesBadgeCount,
  getDefaultPreferences,
} from '#/data/types'
import type { Preferences } from '#/data/types'
import { authClient } from '#/lib/auth-client'
import { loadWeeklyMenu, saveWeeklyMenu } from '#/menu/functions'
import {
  applySchedule,
  assignRecipesToWeek,
  emptyMenu,
  scheduleFromMenu,
  showMenuDay,
  viewWeekStart,
} from '#/menu/week'
import type { CalendarWeekMenu } from '#/menu/week'
import type { RecipeInput } from '#/recipes/recipe'
import { listRecipes } from '#/recipes/functions'
import { useI18n } from '#/i18n'
import {
  getBrowserStorage,
  readWeeklyMenuPlannerState,
  writeWeeklyMenuPlannerState,
} from '#/lib/weekly-menu-planner-storage'

type MainTabId = 'menu' | 'ingredients'

export const Route = createFileRoute('/weekly-menu-planner')({
  component: WeeklyMenuPlanner,
})

export function WeeklyMenuPlanner() {
  const { t, formatWeekRange } = useI18n()
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState<MainTabId>('menu')
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [savedPreferences, setSavedPreferences] = useState<Preferences>(() =>
    getDefaultPreferences(),
  )
  const [draftPreferences, setDraftPreferences] = useState<Preferences>(() =>
    getDefaultPreferences(),
  )
  const [legacyCustomRecipes, setLegacyCustomRecipes] = useState<RecipeInput[]>(
    [],
  )
  const [menuWeek, setMenuWeek] = useState<CalendarWeekMenu | null>(null)
  const [recipeNames, setRecipeNames] = useState<Record<string, string>>({})
  const [hasSavedMenu, setHasSavedMenu] = useState(false)
  const [guestGridOpen, setGuestGridOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const hasLoadedRef = useRef(false)
  const guestPreferencesRef = useRef<Preferences>(getDefaultPreferences())
  const previousUserIdRef = useRef<string | undefined>(undefined)
  const weekOffsetRef = useRef(weekOffset)
  const loadGenerationRef = useRef(0)
  const writeInFlightRef = useRef(false)
  const { data: session } = authClient.useSession()
  const userId = session?.user.id
  weekOffsetRef.current = weekOffset

  const selectedWeekDate = new Date()
  selectedWeekDate.setDate(selectedWeekDate.getDate() + weekOffset * 7)
  const viewedWeek = viewWeekStart(new Date(), weekOffset)
  const weekRange = formatWeekRange(selectedWeekDate)
  const activePreferenceCount = getActivePreferencesBadgeCount(savedPreferences)
  const visibleMenu = userId
    ? hasSavedMenu
      ? menuWeek
      : null
    : guestGridOpen
      ? assignRecipesToWeek(
          applySchedule(emptyMenu(viewedWeek), savedPreferences),
          [],
        )
      : null

  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true

    const stored = readWeeklyMenuPlannerState(getBrowserStorage())

    if (stored) {
      guestPreferencesRef.current = stored.savedPreferences
      setSavedPreferences(stored.savedPreferences)
      setDraftPreferences(stored.savedPreferences)
      setLegacyCustomRecipes(stored.legacyCustomRecipes)
    }

    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    writeWeeklyMenuPlannerState(getBrowserStorage(), {
      savedPreferences: guestPreferencesRef.current,
      legacyCustomRecipes,
    })
  }, [isHydrated, legacyCustomRecipes, savedPreferences])

  function handleGenerateMenu() {
    if (writeInFlightRef.current) return

    setActiveTab('menu')

    if (!userId) {
      setGuestGridOpen(true)
      return
    }

    if (!menuWeek) return

    const source = menuWeek
    const savedWeekStart = source.weekStart
    const saveGeneration = loadGenerationRef.current
    writeInFlightRef.current = true
    setIsGenerating(true)

    void listRecipes()
      .then((recipes) => {
        const next = assignRecipesToWeek(
          source,
          recipes.map((recipe) => ({ id: recipe.id, slot: recipe.slot })),
        )
        return saveWeeklyMenu({ data: next })
      })
      .then((loaded) => {
        if (loadGenerationRef.current !== saveGeneration) return
        loadGenerationRef.current += 1
        if (
          viewWeekStart(new Date(), weekOffsetRef.current) !== savedWeekStart
        ) {
          return
        }
        setMenuWeek(loaded.menu)
        setRecipeNames(loaded.recipeNames)
        setHasSavedMenu(loaded.hasSavedMenu)
        const saved = scheduleFromMenu(loaded.menu)
        setSavedPreferences(saved)
        setDraftPreferences(saved)
      })
      .catch(() => undefined)
      .finally(() => {
        writeInFlightRef.current = false
        setIsGenerating(false)
      })
  }

  function handleOpenPreferences() {
    setDraftPreferences(savedPreferences)
    setIsPreferencesOpen(true)
  }

  useEffect(() => {
    if (!isHydrated) return

    const previous = previousUserIdRef.current
    previousUserIdRef.current = userId
    if (!previous || userId) return

    setSavedPreferences(guestPreferencesRef.current)
    setDraftPreferences(guestPreferencesRef.current)
    setMenuWeek(null)
    setRecipeNames({})
    setHasSavedMenu(false)
  }, [isHydrated, userId])

  useEffect(() => {
    if (!userId || !isHydrated) return

    let cancelled = false
    const generation = ++loadGenerationRef.current
    const weekStart = viewWeekStart(new Date(), weekOffset)
    setMenuWeek(null)
    setHasSavedMenu(false)
    setSavedPreferences(getDefaultPreferences())
    setDraftPreferences(getDefaultPreferences())

    void loadWeeklyMenu({ data: { weekStart } })
      .then((loaded) => {
        if (cancelled || generation !== loadGenerationRef.current) return
        setMenuWeek(loaded.menu)
        setRecipeNames(loaded.recipeNames)
        setHasSavedMenu(loaded.hasSavedMenu)
        const preferences = scheduleFromMenu(loaded.menu)
        setSavedPreferences(preferences)
        setDraftPreferences(preferences)
      })
      .catch(() => {
        if (cancelled || generation !== loadGenerationRef.current) return
        const empty = emptyMenu(weekStart)
        setMenuWeek(empty)
        setRecipeNames({})
        setHasSavedMenu(false)
        const preferences = scheduleFromMenu(empty)
        setSavedPreferences(preferences)
        setDraftPreferences(preferences)
      })

    return () => {
      cancelled = true
    }
  }, [isHydrated, userId, weekOffset])

  function handleSavePreferences(preferences: Preferences) {
    if (!userId) {
      guestPreferencesRef.current = preferences
      setSavedPreferences(preferences)
      setDraftPreferences(preferences)
      setIsPreferencesOpen(false)
      return
    }

    if (writeInFlightRef.current) return
    if (!menuWeek) return

    const next = applySchedule(menuWeek, preferences)
    const savedWeekStart = next.weekStart
    const saveGeneration = loadGenerationRef.current
    writeInFlightRef.current = true

    void saveWeeklyMenu({ data: next })
      .then((loaded) => {
        if (loadGenerationRef.current !== saveGeneration) return
        loadGenerationRef.current += 1
        if (
          viewWeekStart(new Date(), weekOffsetRef.current) !== savedWeekStart
        ) {
          return
        }
        setMenuWeek(loaded.menu)
        setRecipeNames(loaded.recipeNames)
        setHasSavedMenu(loaded.hasSavedMenu)
        const saved = scheduleFromMenu(loaded.menu)
        setSavedPreferences(saved)
        setDraftPreferences(saved)
        setIsPreferencesOpen(false)
      })
      .catch(() => undefined)
      .finally(() => {
        writeInFlightRef.current = false
      })
  }

  const handleLegacyRecipesMigrated = useCallback(() => {
    setLegacyCustomRecipes([])
  }, [])

  return (
    <main className="planner-page">
      <section className="planner-shell" aria-labelledby="planner-title">
        <div className="planner-hero">
          <div className="planner-card-meta">
            <div
              className="planner-week-nav"
              aria-label={t('planner.weekNavigationLabel')}
            >
              <button
                className="planner-week-nav-btn"
                type="button"
                aria-label={t('planner.previousWeek')}
                disabled={weekOffset <= -1}
                onClick={() =>
                  setWeekOffset((offset) => Math.max(offset - 1, -1))
                }
              >
                <ChevronLeftIcon aria-hidden="true" />
              </button>
              <p className="planner-week-pill" aria-live="polite">
                {t('planner.weekKicker', {
                  week: getWeekNumber(selectedWeekDate),
                  start: weekRange.start,
                  end: weekRange.end,
                })}
              </p>
              <button
                className="planner-week-nav-btn"
                type="button"
                aria-label={t('planner.nextWeek')}
                disabled={weekOffset >= 1}
                onClick={() =>
                  setWeekOffset((offset) => Math.min(offset + 1, 1))
                }
              >
                <ChevronRightIcon aria-hidden="true" />
              </button>
            </div>
          </div>

          <div
            className="planner-actions"
            aria-label={t('planner.actionsLabel')}
          >
            <button
              className="planner-secondary-btn"
              type="button"
              onClick={handleOpenPreferences}
            >
              <SettingsIcon aria-hidden="true" />
              {t('planner.preferences')}
              {activePreferenceCount > 0 && (
                <span className="planner-btn-badge">
                  {activePreferenceCount}
                </span>
              )}
            </button>
            <button
              className="planner-primary-btn"
              type="button"
              onClick={handleGenerateMenu}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  {t('planner.generating')} <LoadingDots />
                </>
              ) : (
                <>
                  <SparkleIcon aria-hidden="true" />
                  {visibleMenu
                    ? t('planner.regenerateMenu')
                    : t('planner.generateMenu')}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="planner-divider" />

        <div className="planner-toolbar">
          <MainTab
            activeTab={activeTab}
            isIngredientsDisabled
            neededItems={0}
            onTabChange={setActiveTab}
          />
        </div>

        {activeTab === 'menu' && (
          <MenuTab
            isGenerating={isGenerating}
            menu={visibleMenu}
            onGenerateMenu={handleGenerateMenu}
            recipeNames={recipeNames}
          />
        )}
      </section>

      <PreferencesPanel
        isOpen={isPreferencesOpen}
        legacyCustomRecipes={legacyCustomRecipes}
        onClose={() => setIsPreferencesOpen(false)}
        onLegacyRecipesMigrated={handleLegacyRecipesMigrated}
        onSave={handleSavePreferences}
        savedPrefs={draftPreferences}
      />
    </main>
  )
}

interface MenuTabProps {
  isGenerating: boolean
  menu: CalendarWeekMenu | null
  onGenerateMenu: () => void
  recipeNames: Record<string, string>
}

function MenuTab({
  isGenerating,
  menu,
  onGenerateMenu,
  recipeNames,
}: MenuTabProps) {
  const { t } = useI18n()

  if (isGenerating) {
    return (
      <div className="planner-empty-state" role="status" aria-live="polite">
        <SparkleIcon aria-hidden="true" />
        <h2>{t('planner.buildingTitle')}</h2>
        <p>{t('planner.buildingBody')}</p>
      </div>
    )
  }

  if (!menu) {
    return (
      <div className="planner-empty-state">
        <SparkleIcon aria-hidden="true" />
        <h2>{t('planner.emptyTitle')}</h2>
        <p>{t('planner.emptyBody')}</p>
        <button
          className="planner-primary-btn"
          type="button"
          onClick={onGenerateMenu}
        >
          <SparkleIcon aria-hidden="true" />
          {t('planner.generateMenu')}
        </button>
      </div>
    )
  }

  return (
    <div className="planner-menu-tab">
      <div className="planner-section-heading"></div>

      <div className="planner-day-grid">
        {DAYS.map((day, index) => {
          const shown = showMenuDay(menu.days[day], recipeNames)

          return (
            <div className={`delay-${index + 1}`} key={day}>
              <DayCard
                day={day}
                dayContext={shown.context}
                dinner={shown.dinner}
                isWeekend={isWeekend(day)}
                lunch={shown.lunch}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
