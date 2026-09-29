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
import { formatRecipeIngredient } from '#/components/preferences-panel/utils'
import { DAYS, getWeekNumber, isWeekend } from '#/data/constants'
import {
  getActivePreferencesBadgeCount,
  getDefaultPreferences,
} from '#/data/types'
import type { Preferences } from '#/data/types'
import { authClient } from '#/lib/auth-client'
import { loadWeeklyMenu, saveWeeklyMenu } from '#/menu/functions'
import { shoppingList } from '#/menu/shopping'
import type { ShoppingLine } from '#/menu/shopping'
import {
  applySchedule,
  assignRecipesToWeek,
  emptyMenu,
  placedRecipeIds,
  scheduleFromMenu,
  showMenuDay,
  shiftWeekStart,
  viewWeekStart,
} from '#/menu/week'
import type { CalendarWeekMenu } from '#/menu/week'
import type { Recipe, RecipeInput } from '#/recipes/recipe'
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
  const [recipes, setRecipes] = useState<Recipe[] | null>(null)
  const [recipeNames, setRecipeNames] = useState<Record<string, string>>({})
  const [hasSavedMenu, setHasSavedMenu] = useState(false)
  const [guestGridOpen, setGuestGridOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const hasLoadedRef = useRef(false)
  const guestPreferencesRef = useRef<Preferences>(getDefaultPreferences())
  const previousUserIdRef = useRef<string | undefined>(undefined)
  const weekOffsetRef = useRef(weekOffset)
  const activeTabRef = useRef(activeTab)
  const preferencesOpenRef = useRef(false)
  const loadGenerationRef = useRef(0)
  const writeInFlightRef = useRef(false)
  const { data: session } = authClient.useSession()
  const userId = session?.user.id
  weekOffsetRef.current = weekOffset
  activeTabRef.current = activeTab

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
  const signedIn = Boolean(userId)
  const catalogLoaded = recipes !== null
  const shoppingEnabled = signedIn && hasSavedMenu && catalogLoaded
  const lines =
    shoppingEnabled && menuWeek ? shoppingList(menuWeek, recipes) : []

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

    void Promise.all([
      listRecipes(),
      loadWeeklyMenu({
        data: { weekStart: shiftWeekStart(savedWeekStart, -1) },
      }),
    ])
      .then(([catalog, priorWeek]) => {
        const next = assignRecipesToWeek(
          source,
          catalog.map((recipe) => ({ id: recipe.id, slot: recipe.slot })),
          placedRecipeIds(priorWeek.menu),
        )
        return saveWeeklyMenu({ data: next }).then((loaded) => ({
          loaded,
          catalog,
        }))
      })
      .then(({ loaded, catalog }) => {
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
        setRecipes(catalog)
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
    setRecipes(null)
    if (activeTabRef.current === 'ingredients') setActiveTab('menu')
  }, [isHydrated, userId])

  useEffect(() => {
    if (!userId || !isHydrated) return

    let cancelled = false
    const generation = ++loadGenerationRef.current
    const weekStart = viewWeekStart(new Date(), weekOffset)
    setMenuWeek(null)
    setHasSavedMenu(false)
    setRecipes(null)
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

    void listRecipes()
      .then((catalog) => {
        if (cancelled || generation !== loadGenerationRef.current) return
        setRecipes(catalog)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [isHydrated, userId, weekOffset])

  useEffect(() => {
    const wasOpen = preferencesOpenRef.current
    preferencesOpenRef.current = isPreferencesOpen
    if (!userId || !wasOpen || isPreferencesOpen) return

    let cancelled = false
    const generation = loadGenerationRef.current
    void listRecipes()
      .then((catalog) => {
        if (cancelled || generation !== loadGenerationRef.current) return
        setRecipes(catalog)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [isPreferencesOpen, userId])

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
            isIngredientsDisabled={!shoppingEnabled}
            neededItems={lines.length}
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

        {activeTab === 'ingredients' && shoppingEnabled && (
          <ShoppingTab lines={lines} />
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

function ShoppingTab({ lines }: { lines: readonly ShoppingLine[] }) {
  const { t } = useI18n()

  return (
    <div className="planner-shopping-tab">
      <h2>{t('tabs.ingredients')}</h2>
      <p className="planner-shopping-helper">{t('planner.shoppingHelper')}</p>
      {lines.length === 0 ? (
        <p>{t('planner.shoppingEmpty')}</p>
      ) : (
        <ul>
          {lines.map((line) => (
            <li
              key={`${line.name}\0${line.unit ?? ''}\0${
                line.quantity === null ? 'unknown' : 'number'
              }`}
            >
              {formatRecipeIngredient(line, (unit) => t(`units.${unit}`))}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
