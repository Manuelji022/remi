import { DAYS } from '#/data/constants'
import type { Day } from '#/data/constants'
import type {
  DayContext,
  MealSlot,
  PlanningScope,
  Preferences,
} from '#/data/types'

const DAY_CONTEXTS = [
  'office',
  'eatOut',
] as const satisfies readonly DayContext[]
const PLANNING_SCOPES = [
  'lunch',
  'dinner',
  'both',
] as const satisfies readonly PlanningScope[]

export type DayPlan = {
  context: DayContext | null
  scope: PlanningScope
  lunchRecipeId: string | null
  dinnerRecipeId: string | null
}

export type CalendarWeekMenu = {
  weekStart: string
  days: Record<Day, DayPlan>
}

export type LoadedMenuWeek = {
  menu: CalendarWeekMenu
  recipeNames: Record<string, string>
  hasSavedMenu: boolean
}

export type ShownMeal =
  | { kind: 'recipe'; name: string }
  | { kind: 'unplanned' }
  | { kind: 'covered'; context: DayContext }
  | { kind: 'outside' }

export class MenuInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MenuInputError'
  }
}

export function weekStartFromDate(date: Date): string {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = local.getDay()
  const delta = day === 0 ? -6 : 1 - day
  local.setDate(local.getDate() + delta)
  return formatIsoDate(
    local.getFullYear(),
    local.getMonth() + 1,
    local.getDate(),
  )
}

export function viewWeekStart(today: Date, offset: number): string {
  const clamped: -1 | 0 | 1 = offset <= -1 ? -1 : offset >= 1 ? 1 : 0
  return shiftWeekStart(weekStartFromDate(today), clamped)
}

export function shiftWeekStart(weekStart: string, offset: -1 | 0 | 1): string {
  const monday = parseWeekStart(weekStart)
  const [year, month, day] = monday.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + offset * 7)
  return formatIsoDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  )
}

export function emptyMenu(weekStart: string): CalendarWeekMenu {
  const monday = parseWeekStart(weekStart)
  const days = {} as Record<Day, DayPlan>

  for (const day of DAYS) {
    days[day] = emptyDay()
  }

  return { weekStart: monday, days }
}

export function applySchedule(
  menu: CalendarWeekMenu,
  preferences: Preferences,
): CalendarWeekMenu {
  const days = {} as Record<Day, DayPlan>

  for (const day of DAYS) {
    days[day] = planDay(
      menu.days[day],
      preferences.dayContexts[day] ?? null,
      preferences.planningScopes[day] ?? 'both',
    )
  }

  return { weekStart: menu.weekStart, days }
}

export function assignRecipesToWeek(
  menu: CalendarWeekMenu,
  orderedPool: readonly { id: string; slot: MealSlot }[],
): CalendarWeekMenu {
  const queues = recipeQueues(orderedPool)
  const days = {} as Record<Day, DayPlan>

  for (const day of DAYS) {
    const current = menu.days[day]
    const planned = planDay(emptyDay(), current.context, current.scope)
    days[day] = {
      context: planned.context,
      scope: planned.scope,
      lunchRecipeId: scopeIncludes(planned.scope, 'lunch')
        ? (queues.lunch.shift() ?? null)
        : null,
      dinnerRecipeId: scopeIncludes(planned.scope, 'dinner')
        ? (queues.dinner.shift() ?? null)
        : null,
    }
  }

  return { weekStart: menu.weekStart, days }
}

export function scheduleFromMenu(menu: CalendarWeekMenu): Preferences {
  const dayContexts: Preferences['dayContexts'] = {}
  const planningScopes: Preferences['planningScopes'] = {}

  for (const day of DAYS) {
    const plan = menu.days[day]
    if (plan.context) dayContexts[day] = plan.context
    if (plan.scope !== 'both') planningScopes[day] = plan.scope
  }

  return { dayContexts, planningScopes }
}

export function showMenuDay(
  plan: DayPlan,
  recipeNames: Readonly<Record<string, string>>,
): {
  context: DayContext | null
  scope: PlanningScope
  lunch: ShownMeal
  dinner: ShownMeal
} {
  return {
    context: plan.context,
    scope: plan.scope,
    lunch: showSlot('lunch', plan, recipeNames),
    dinner: showSlot('dinner', plan, recipeNames),
  }
}

export function parseWeekStart(value: unknown): string {
  if (typeof value !== 'string' || !isMonday(value)) {
    throw new MenuInputError('Week start must be a Monday')
  }

  return value
}

export function readStoredDay(value: unknown): DayPlan {
  try {
    return parseDay(value)
  } catch (error) {
    if (error instanceof MenuInputError) throw new Error('Invalid menu day')
    throw error
  }
}

export function parseCalendarWeek(value: unknown): CalendarWeekMenu {
  if (!isRecord(value)) throw new MenuInputError('Week is required')

  const weekStart = parseWeekStart(value.weekStart)
  if (!isRecord(value.days)) throw new MenuInputError('Week days are required')

  const days = {} as Record<Day, DayPlan>

  for (const day of DAYS) {
    days[day] = parseDay(value.days[day])
  }

  return { weekStart, days }
}

function planDay(
  current: DayPlan,
  context: DayContext | null,
  scope: PlanningScope,
): DayPlan {
  if (context === 'office') {
    return {
      context: 'office',
      scope: 'dinner',
      lunchRecipeId: null,
      dinnerRecipeId: current.dinnerRecipeId,
    }
  }

  if (context === 'eatOut') {
    const eatOutScope = scope === 'lunch' ? 'lunch' : 'dinner'
    return eatOutScope === 'lunch'
      ? {
          context: 'eatOut',
          scope: 'lunch',
          lunchRecipeId: current.lunchRecipeId,
          dinnerRecipeId: null,
        }
      : {
          context: 'eatOut',
          scope: 'dinner',
          lunchRecipeId: null,
          dinnerRecipeId: current.dinnerRecipeId,
        }
  }

  return {
    context: null,
    scope,
    lunchRecipeId: scope === 'dinner' ? null : current.lunchRecipeId,
    dinnerRecipeId: scope === 'lunch' ? null : current.dinnerRecipeId,
  }
}

function showSlot(
  slot: MealSlot,
  plan: DayPlan,
  recipeNames: Readonly<Record<string, string>>,
): ShownMeal {
  if (!scopeIncludes(plan.scope, slot)) {
    return plan.context
      ? { kind: 'covered', context: plan.context }
      : { kind: 'outside' }
  }

  const recipeId = slot === 'lunch' ? plan.lunchRecipeId : plan.dinnerRecipeId
  const name = recipeId ? recipeNames[recipeId] : undefined
  if (name) return { kind: 'recipe', name }

  return { kind: 'unplanned' }
}

function recipeQueues(orderedPool: readonly { id: string; slot: MealSlot }[]): {
  lunch: string[]
  dinner: string[]
} {
  const seen = new Set<string>()
  const lunch: string[] = []
  const dinner: string[] = []

  for (const recipe of orderedPool) {
    if (seen.has(recipe.id)) continue
    seen.add(recipe.id)
    if (recipe.slot === 'lunch') lunch.push(recipe.id)
    else dinner.push(recipe.id)
  }

  return { lunch, dinner }
}

function scopeIncludes(scope: PlanningScope, slot: MealSlot): boolean {
  return scope === 'both' || scope === slot
}

function parseDay(value: unknown): DayPlan {
  if (!isRecord(value)) throw new MenuInputError('Day plan is required')

  const context = parseContext(value.context)
  const scope = parseScope(value.scope)
  const lunchRecipeId = parseRecipeId(value.lunchRecipeId)
  const dinnerRecipeId = parseRecipeId(value.dinnerRecipeId)
  const plan = planDay(
    { context: null, scope: 'both', lunchRecipeId, dinnerRecipeId },
    context,
    scope,
  )

  if (
    plan.context !== context ||
    plan.scope !== scope ||
    plan.lunchRecipeId !== lunchRecipeId ||
    plan.dinnerRecipeId !== dinnerRecipeId
  ) {
    throw new MenuInputError('Day plan does not match its context')
  }

  return plan
}

function parseContext(value: unknown): DayContext | null {
  if (value === null) return null
  if (typeof value === 'string' && isListed(DAY_CONTEXTS, value)) return value
  throw new MenuInputError('Day context must be office, eat out, or empty')
}

function parseScope(value: unknown): PlanningScope {
  if (typeof value === 'string' && isListed(PLANNING_SCOPES, value))
    return value
  throw new MenuInputError('Planning scope must be lunch, dinner, or both')
}

function parseRecipeId(value: unknown): string | null {
  if (value === null) return null
  if (
    typeof value !== 'string' ||
    value.trim() === '' ||
    value !== value.trim()
  ) {
    throw new MenuInputError('Recipe id is required')
  }
  return value
}

function emptyDay(): DayPlan {
  return {
    context: null,
    scope: 'both',
    lunchRecipeId: null,
    dinnerRecipeId: null,
  }
}

function isMonday(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCDay() === 1
  )
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function isListed<T extends string>(
  list: readonly T[],
  value: string,
): value is T {
  return list.some((item) => item === value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
