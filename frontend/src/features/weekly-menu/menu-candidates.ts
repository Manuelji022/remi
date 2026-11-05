import type { Recipe, MealSlot } from '#/features/recipes/recipe'
import { DAYS } from '#/features/weekly-menu/constants'
import type { Day } from '#/features/weekly-menu/constants'
import type { TargetWeekSchedule } from '#/features/weekly-menu/ai-schedule'
import { menuForTargetSchedule } from '#/features/weekly-menu/ai-schedule'
import { scopeIncludes } from '#/features/weekly-menu/week'
import type { CalendarWeekMenu } from '#/features/weekly-menu/week'

const MAX_CANDIDATES = 8
const SEARCH_PASSES = 32
const SLOTS = [
  { slot: 'lunch', field: 'lunchRecipeId' },
  { slot: 'dinner', field: 'dinnerRecipeId' },
] as const

export type MenuCandidateContext = {
  targetWeekStart: string
  schedule: TargetWeekSchedule
  recipes: readonly Recipe[]
  currentWeek: CalendarWeekMenu
  previousWeek: CalendarWeekMenu
  previousProposal?: CalendarWeekMenu
}

type PlannedSlot = {
  day: Day
  slot: MealSlot
  field: 'lunchRecipeId' | 'dinnerRecipeId'
}

export function buildWeeklyMenuCandidates(
  context: MenuCandidateContext,
  seed: number | string,
): CalendarWeekMenu[] {
  const template = menuForTargetSchedule(
    context.targetWeekStart,
    context.schedule,
  )
  const plannedSlots: PlannedSlot[] = DAYS.flatMap((day) =>
    SLOTS.filter(({ slot }) =>
      scopeIncludes(template.days[day].scope, slot),
    ).map(({ slot, field }) => ({ day, slot, field })),
  )
  if (plannedSlots.length === 0) return [template]

  const recipes = uniqueRecipes(context.recipes)
  const pools = {
    lunch: recipes.filter((recipe) => recipe.slot === 'lunch'),
    dinner: recipes.filter((recipe) => recipe.slot === 'dinner'),
  }
  const currentCounts = recipeCounts(context.currentWeek)
  const previousCounts = recipeCounts(context.previousWeek)
  const proposalCounts = context.previousProposal
    ? recipeCounts(context.previousProposal)
    : new Map<string, number>()
  const basePools = {
    lunch: pools.lunch
      .slice()
      .sort(comparePreference(currentCounts, previousCounts, proposalCounts)),
    dinner: pools.dinner
      .slice()
      .sort(comparePreference(currentCounts, previousCounts, proposalCounts)),
  }
  const candidates = new Map<string, CalendarWeekMenu>()
  const base = assignFromPools(template, plannedSlots, basePools)
  candidates.set(menuSignature(base), base)

  const previousSignature = context.previousProposal
    ? menuSignature(context.previousProposal)
    : ''
  const candidateSeed = `${seed}:${previousSignature}`
  for (let pass = 0; pass < SEARCH_PASSES; pass += 1) {
    const shuffledPools = {
      lunch: shuffle(pools.lunch, `${candidateSeed}:${pass}:lunch`),
      dinner: shuffle(pools.dinner, `${candidateSeed}:${pass}:dinner`),
    }
    const candidate = assignFromPools(template, plannedSlots, shuffledPools)
    candidates.set(menuSignature(candidate), candidate)
  }

  let distinct = [...candidates.values()]
  const previousProposal = context.previousProposal
  if (previousProposal && distinct.length > 1) {
    const signature = menuSignature(previousProposal)
    distinct = distinct.filter(
      (candidate) => menuSignature(candidate) !== signature,
    )
  }

  const scoreCandidate = (menu: CalendarWeekMenu) =>
    scoreMenu(menu, context, currentCounts, previousCounts, proposalCounts)
  const ordered = distinct.sort((left, right) => {
    const scoreDifference = scoreCandidate(left) - scoreCandidate(right)
    if (scoreDifference !== 0) return scoreDifference
    const leftIsBase = menuSignature(left) === menuSignature(base)
    const rightIsBase = menuSignature(right) === menuSignature(base)
    if (leftIsBase !== rightIsBase) return leftIsBase ? -1 : 1
    const leftTie = stableHash(`${seed}:${menuSignature(left)}`)
    const rightTie = stableHash(`${seed}:${menuSignature(right)}`)
    return (
      leftTie - rightTie ||
      compareText(menuSignature(left), menuSignature(right))
    )
  })

  if (ordered.length <= MAX_CANDIDATES) return ordered
  return selectSpread(ordered, MAX_CANDIDATES)
}

function uniqueRecipes(recipes: readonly Recipe[]): Recipe[] {
  const byId = new Map<string, Recipe>()
  for (const recipe of recipes
    .slice()
    .sort(
      (left, right) =>
        compareText(left.id, right.id) || compareText(left.slot, right.slot),
    )) {
    if (!byId.has(recipe.id)) byId.set(recipe.id, recipe)
  }
  return [...byId.values()]
}

function comparePreference(
  currentCounts: ReadonlyMap<string, number>,
  previousCounts: ReadonlyMap<string, number>,
  proposalCounts: ReadonlyMap<string, number>,
) {
  return (left: Recipe, right: Recipe) =>
    recipeCost(left.id, currentCounts, previousCounts, proposalCounts) -
      recipeCost(right.id, currentCounts, previousCounts, proposalCounts) ||
    compareText(left.id, right.id)
}

function recipeCost(
  id: string,
  currentCounts: ReadonlyMap<string, number>,
  previousCounts: ReadonlyMap<string, number>,
  proposalCounts: ReadonlyMap<string, number>,
): number {
  return (
    (currentCounts.get(id) ?? 0) * 100 +
    (previousCounts.get(id) ?? 0) * 20 +
    (proposalCounts.get(id) ?? 0) * 2
  )
}

function recipeCounts(menu: CalendarWeekMenu): Map<string, number> {
  const counts = new Map<string, number>()
  for (const day of DAYS) {
    for (const { field } of SLOTS) {
      const id = menu.days[day][field]
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
  }
  return counts
}

function assignFromPools(
  template: CalendarWeekMenu,
  plannedSlots: readonly PlannedSlot[],
  pools: Record<MealSlot, readonly Recipe[]>,
): CalendarWeekMenu {
  const days = Object.fromEntries(
    DAYS.map((day) => [day, { ...template.days[day] }]),
  ) as CalendarWeekMenu['days']
  const placements: Record<MealSlot, number> = { lunch: 0, dinner: 0 }

  for (const { day, slot, field } of plannedSlots) {
    const pool = pools[slot]
    if (pool.length === 0) continue
    const recipe = pool[placements[slot] % pool.length]
    placements[slot] += 1
    days[day][field] = recipe.id
  }

  return { weekStart: template.weekStart, days }
}

function shuffle(recipes: readonly Recipe[], key: string): Recipe[] {
  return recipes.slice().sort((left, right) => {
    const difference =
      stableHash(`${key}:${left.id}`) - stableHash(`${key}:${right.id}`)
    return difference || compareText(left.id, right.id)
  })
}

function scoreMenu(
  menu: CalendarWeekMenu,
  context: MenuCandidateContext,
  currentCounts: ReadonlyMap<string, number>,
  previousCounts: ReadonlyMap<string, number>,
  proposalCounts: ReadonlyMap<string, number>,
): number {
  const counts = new Map<string, number>()
  let score = 0

  for (const day of DAYS) {
    for (const { field } of SLOTS) {
      const id = menu.days[day][field]
      if (!id) continue
      score += recipeCost(id, currentCounts, previousCounts, proposalCounts)
      const count = counts.get(id) ?? 0
      if (count > 0) score += 4
      counts.set(id, count + 1)
      if (context.previousProposal?.days[day][field] === id) score += 1
    }
  }

  return score
}

function selectSpread(
  ordered: CalendarWeekMenu[],
  limit: number,
): CalendarWeekMenu[] {
  const remainder = ordered.slice(1)
  const count = limit - 1
  if (count <= 0) return ordered.slice(0, limit)
  return [
    ordered[0],
    ...Array.from({ length: count }, (_, index) => {
      const position = Math.round(
        (index * (remainder.length - 1)) / (count - 1),
      )
      return remainder[position]
    }),
  ]
}

function menuSignature(menu: CalendarWeekMenu): string {
  return JSON.stringify([
    menu.weekStart,
    DAYS.map((day) => {
      const plan = menu.days[day]
      return [plan.context, plan.scope, plan.lunchRecipeId, plan.dinnerRecipeId]
    }),
  ])
}

function stableHash(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}
