import './weekly-menu-planner.css'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { DayCard } from '../components/DayCard'
import { LoadingDots } from '../components/LoadingDots'
import { MainTab } from '../components/MainTab'
import { PreferencesPanel } from '../components/preferences-panel'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SettingsIcon,
  SparkleIcon,
} from '#/components/primitives'
import { formatRecipeIngredient } from '#/features/recipes/format'
import {
  DAYS,
  getWeekNumber,
  isWeekend,
} from '#/features/weekly-menu/constants'
import {
  getActivePreferencesBadgeCount,
  getDefaultPreferences,
} from '#/features/weekly-menu/types'
import type { Preferences } from '#/features/weekly-menu/types'
import { authClient } from '#/features/auth/auth-client'
import {
  loadWeeklyMenu,
  saveWeeklyMenu,
} from '#/features/weekly-menu/functions'
import { shoppingList } from '#/features/weekly-menu/shopping'
import type { ShoppingLine } from '#/features/weekly-menu/shopping'
import {
  applySchedule,
  assignRecipesToWeek,
  emptyMenu,
  placedRecipeIds,
  scheduleFromMenu,
  showMenuDay,
  shiftWeekStart,
  viewWeekStart,
} from '#/features/weekly-menu/week'
import type {
  CalendarWeekMenu,
  LoadedMenuWeek,
} from '#/features/weekly-menu/week'
import type { Recipe, RecipeInput } from '#/features/recipes/recipe'
import { listRecipes } from '#/features/recipes/functions'
import { useI18n } from '#/shared/i18n'
import {
  getBrowserStorage,
  readWeeklyMenuPlannerState,
  writeWeeklyMenuPlannerState,
} from '#/features/weekly-menu/planner-storage'

type MainTabId = 'menu' | 'ingredients'
type PlannerIdentity = { userId: string; weekStart: string }
type PlannerData = PlannerIdentity &
  (
    | { status: 'loading' | 'error' }
    | { status: 'ready'; week: LoadedMenuWeek; recipes: Recipe[] }
  )
type PlannerAction = PlannerIdentity & {
  kind: 'generate' | 'save'
  status: 'pending' | 'error' | 'success'
}

export function WeeklyMenuPlanner() {
  const { t, formatWeekRange } = useI18n()
  const [activeTab, setActiveTab] = useState<MainTabId>('menu')
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(
    () => new Set(),
  )
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [guestPreferences, setGuestPreferences] = useState<Preferences>(() =>
    getDefaultPreferences(),
  )
  const [legacyCustomRecipes, setLegacyCustomRecipes] = useState<RecipeInput[]>(
    [],
  )
  const [data, setData] = useState<PlannerData | null>(null)
  const [action, setAction] = useState<PlannerAction | null>(null)
  const [isRecipeMutationPending, setIsRecipeMutationPending] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [guestGridOpen, setGuestGridOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const hasLoadedRef = useRef(false)
  const preferencesOpenRef = useRef(false)
  const loadGenerationRef = useRef(0)
  const writeInFlightRef = useRef<PlannerAction | null>(null)
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const userId = session?.user.id
  const viewedWeek = viewWeekStart(new Date(), weekOffset)
  const currentViewRef = useRef({ userId, viewedWeek, isSessionPending })
  useLayoutEffect(() => {
    currentViewRef.current = { userId, viewedWeek, isSessionPending }
  }, [userId, viewedWeek, isSessionPending])

  const currentData =
    data?.userId === userId && data?.weekStart === viewedWeek ? data : null
  const readyData = currentData?.status === 'ready' ? currentData : null
  const currentAction =
    action?.userId === userId && action?.weekStart === viewedWeek
      ? action
      : null
  const isGenerating =
    currentAction?.kind === 'generate' && currentAction.status === 'pending'
  const isSavingPreferences =
    currentAction?.kind === 'save' && currentAction.status === 'pending'
  const isWriting = isGenerating || isSavingPreferences
  const isLoading =
    !isHydrated ||
    isSessionPending ||
    Boolean(userId && (!currentData || currentData.status === 'loading'))
  const loadFailed = Boolean(userId && currentData?.status === 'error')
  const canWrite =
    !isLoading &&
    !loadFailed &&
    !isRecipeMutationPending &&
    (!userId || Boolean(readyData))
  const menuWeek = readyData?.week.menu
  const savedPreferences = useMemo(
    () => (menuWeek ? scheduleFromMenu(menuWeek) : guestPreferences),
    [menuWeek, guestPreferences],
  )
  const selectedWeekDate = new Date()
  selectedWeekDate.setDate(selectedWeekDate.getDate() + weekOffset * 7)
  const weekRange = formatWeekRange(selectedWeekDate)
  const activePreferenceCount = getActivePreferencesBadgeCount(savedPreferences)
  const visibleMenu = userId
    ? readyData?.week.hasSavedMenu
      ? readyData.week.menu
      : null
    : guestGridOpen
      ? assignRecipesToWeek(
          applySchedule(emptyMenu(viewedWeek), savedPreferences),
          [],
        )
      : null
  const shoppingEnabled = Boolean(userId && readyData?.week.hasSavedMenu)
  const lines =
    shoppingEnabled && readyData
      ? shoppingList(readyData.week.menu, readyData.recipes)
      : []
  const saveError =
    currentAction?.kind === 'save' && currentAction.status === 'error'
      ? t('planner.saveError')
      : null

  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    const stored = readWeeklyMenuPlannerState(getBrowserStorage())
    if (stored) {
      setGuestPreferences(stored.savedPreferences)
      setLegacyCustomRecipes(stored.legacyCustomRecipes)
    }
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    writeWeeklyMenuPlannerState(getBrowserStorage(), {
      savedPreferences: guestPreferences,
      legacyCustomRecipes,
    })
  }, [isHydrated, legacyCustomRecipes, guestPreferences])

  useEffect(() => {
    const generation = ++loadGenerationRef.current
    setAction(null)
    setIsPreferencesOpen(false)
    setActiveTab('menu')
    if (!userId || !isHydrated || isSessionPending) {
      setData(null)
      return
    }

    let cancelled = false
    const identity = { userId, weekStart: viewedWeek }
    setData({ ...identity, status: 'loading' })
    void Promise.all([
      loadWeeklyMenu({ data: { weekStart: viewedWeek } }),
      listRecipes(),
    ])
      .then(([week, recipes]) => {
        if (cancelled || generation !== loadGenerationRef.current) return
        setData({ ...identity, status: 'ready', week, recipes })
      })
      .catch(() => {
        if (cancelled || generation !== loadGenerationRef.current) return
        setData({ ...identity, status: 'error' })
      })

    return () => {
      cancelled = true
      loadGenerationRef.current += 1
    }
  }, [isHydrated, isSessionPending, userId, viewedWeek, loadAttempt])

  useEffect(() => {
    const wasOpen = preferencesOpenRef.current
    preferencesOpenRef.current = isPreferencesOpen
    if (!userId || !wasOpen || isPreferencesOpen) return

    let cancelled = false
    const generation = loadGenerationRef.current
    void listRecipes()
      .then((recipes) => {
        if (cancelled || generation !== loadGenerationRef.current) return
        setData((current) =>
          current?.status === 'ready' &&
          current.userId === userId &&
          current.weekStart === viewedWeek
            ? { ...current, recipes }
            : current,
        )
      })
      .catch(() => {
        if (cancelled || generation !== loadGenerationRef.current) return
        setData({ userId, weekStart: viewedWeek, status: 'error' })
      })

    return () => {
      cancelled = true
    }
  }, [isPreferencesOpen, userId, viewedWeek])

  function handleRetryLoad() {
    if (isWriting) return
    setData(null)
    setLoadAttempt((attempt) => attempt + 1)
  }

  const handleRecipeMutation = useCallback(async () => {
    const view = currentViewRef.current
    if (!view.userId || view.isSessionPending) return

    const identity = { userId: view.userId, weekStart: view.viewedWeek }
    const generation = ++loadGenerationRef.current
    const isCurrent = () => {
      const currentView = currentViewRef.current
      return (
        generation === loadGenerationRef.current &&
        currentView.userId === identity.userId &&
        currentView.viewedWeek === identity.weekStart &&
        !currentView.isSessionPending
      )
    }

    setAction(null)

    try {
      const [week, recipes] = await Promise.all([
        loadWeeklyMenu({ data: { weekStart: identity.weekStart } }),
        listRecipes(),
      ])
      if (isCurrent()) {
        setData({ ...identity, status: 'ready', week, recipes })
      }
    } catch {
      if (isCurrent()) setData({ ...identity, status: 'error' })
    }
  }, [])

  function handleOpenPreferences() {
    if (!canWrite || isWriting) return
    setAction(null)
    setIsPreferencesOpen(true)
  }

  async function writeMenu(
    kind: PlannerAction['kind'],
    preferences?: Preferences,
  ) {
    if (!canWrite || !readyData || !userId) return
    const pending = writeInFlightRef.current
    if (pending?.userId === userId && pending.weekStart === viewedWeek) return

    const operation: PlannerAction = {
      userId,
      weekStart: viewedWeek,
      kind,
      status: 'pending',
    }
    const generation = ++loadGenerationRef.current
    const isCurrent = () => {
      const view = currentViewRef.current
      return (
        generation === loadGenerationRef.current &&
        view.userId === operation.userId &&
        view.viewedWeek === operation.weekStart &&
        !view.isSessionPending
      )
    }
    writeInFlightRef.current = operation
    setAction(operation)

    try {
      let next = readyData.week.menu
      let recipes = readyData.recipes
      if (kind === 'generate') {
        const [catalog, priorWeek] = await Promise.all([
          listRecipes(),
          loadWeeklyMenu({
            data: { weekStart: shiftWeekStart(operation.weekStart, -1) },
          }),
        ])
        if (!isCurrent()) return
        recipes = catalog
        next = assignRecipesToWeek(
          next,
          catalog.map((recipe) => ({ id: recipe.id, slot: recipe.slot })),
          placedRecipeIds(priorWeek.menu),
        )
      } else if (preferences) {
        next = applySchedule(next, preferences)
      }

      const week = await saveWeeklyMenu({ data: next })
      if (!isCurrent()) return
      setData({
        userId: operation.userId,
        weekStart: operation.weekStart,
        status: 'ready',
        week,
        recipes,
      })
      setAction({ ...operation, status: 'success' })
      if (kind === 'save') setIsPreferencesOpen(false)
    } catch {
      if (isCurrent()) setAction({ ...operation, status: 'error' })
    } finally {
      if (writeInFlightRef.current === operation)
        writeInFlightRef.current = null
    }
  }

  function handleGenerateMenu() {
    if (!canWrite || isWriting) return
    setActiveTab('menu')
    if (!userId) {
      setGuestGridOpen(true)
      return
    }
    void writeMenu('generate')
  }

  function handleSavePreferences(preferences: Preferences) {
    if (!canWrite || isWriting) return
    if (!userId) {
      setGuestPreferences(preferences)
      setIsPreferencesOpen(false)
      return
    }
    void writeMenu('save', preferences)
  }

  const handleLegacyRecipesMigrated = useCallback(() => {
    setLegacyCustomRecipes([])
  }, [])

  return (
    <main className="planner-page" id="main">
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
                disabled={weekOffset <= -1 || isWriting}
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
              {weekOffset === 0 && (
                <span className="planner-current-week-label">
                  {t('planner.currentWeek')}
                </span>
              )}
              <button
                className="planner-week-nav-btn"
                type="button"
                aria-label={t('planner.nextWeek')}
                disabled={weekOffset >= 1 || isWriting}
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
              disabled={!canWrite || isWriting}
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
              disabled={!canWrite || isWriting}
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
            isIngredientsDisabled={!shoppingEnabled || isWriting}
            neededItems={lines.length}
            onTabChange={setActiveTab}
          />
        </div>

        {currentAction?.kind === 'generate' &&
          currentAction.status === 'error' && (
            <div className="planner-feedback" role="alert">
              <p>{t('planner.generateError')}</p>
              <button
                className="planner-secondary-btn"
                type="button"
                onClick={handleGenerateMenu}
                disabled={!canWrite || isWriting}
              >
                {t('planner.retryGenerate')}
              </button>
            </div>
          )}
        {currentAction?.status === 'success' && (
          <p className="planner-feedback" role="status">
            {t(
              currentAction.kind === 'save'
                ? 'planner.preferencesSaved'
                : 'planner.menuSaved',
            )}
          </p>
        )}

        {isLoading ? (
          <div className="planner-empty-state" role="status">
            <p>{t('planner.loadingWeek')}</p>
          </div>
        ) : loadFailed ? (
          <div className="planner-empty-state" role="alert">
            <h2>{t('planner.loadErrorTitle')}</h2>
            <p>{t('planner.loadErrorBody')}</p>
            <button
              className="planner-secondary-btn"
              type="button"
              onClick={handleRetryLoad}
            >
              {t('planner.retryLoad')}
            </button>
          </div>
        ) : activeTab === 'menu' ? (
          <MenuTab
            isGenerating={isGenerating}
            menu={visibleMenu}
            onGenerateMenu={handleGenerateMenu}
            recipeNames={readyData?.week.recipeNames ?? {}}
          />
        ) : shoppingEnabled ? (
          <ShoppingTab
            lines={lines}
            checklistId={JSON.stringify([userId, viewedWeek])}
            checkedIngredients={checkedIngredients}
            onToggleIngredient={(key) => {
              setCheckedIngredients((previous) => {
                const next = new Set(previous)
                if (next.has(key)) next.delete(key)
                else next.add(key)
                return next
              })
            }}
          />
        ) : null}
      </section>

      <PreferencesPanel
        isOpen={isPreferencesOpen}
        isSaving={isSavingPreferences}
        isRecipeMutationPending={isRecipeMutationPending}
        onRecipeMutation={handleRecipeMutation}
        onRecipeMutationPendingChange={setIsRecipeMutationPending}
        saveDisabled={!canWrite || isWriting}
        saveError={saveError}
        legacyCustomRecipes={legacyCustomRecipes}
        onClose={() => {
          if (!isSavingPreferences) setIsPreferencesOpen(false)
        }}
        onLegacyRecipesMigrated={handleLegacyRecipesMigrated}
        onSave={handleSavePreferences}
        savedPrefs={savedPreferences}
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

function ShoppingTab({
  lines,
  checklistId,
  checkedIngredients,
  onToggleIngredient,
}: {
  lines: readonly ShoppingLine[]
  checklistId: string
  checkedIngredients: ReadonlySet<string>
  onToggleIngredient: (key: string) => void
}) {
  const { t } = useI18n()

  return (
    <div className="planner-shopping-tab">
      <h2>{t('tabs.ingredients')}</h2>
      <p className="planner-shopping-helper">{t('planner.shoppingHelper')}</p>
      {lines.length === 0 ? (
        <p>{t('planner.shoppingEmpty')}</p>
      ) : (
        <ul>
          {lines.map((line) => {
            const key = JSON.stringify([
              checklistId,
              line.name,
              line.unit,
              line.quantity,
            ])

            return (
              <li key={key}>
                <label className="planner-shopping-item">
                  <input
                    type="checkbox"
                    checked={checkedIngredients.has(key)}
                    onChange={() => onToggleIngredient(key)}
                  />
                  <span>
                    {formatRecipeIngredient(line, (unit) => t(`units.${unit}`))}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
