import { z } from 'zod'
import { DAYS } from '#/features/weekly-menu/constants'
import type { Day } from '#/features/weekly-menu/constants'
import type { Recipe, MealSlot } from '#/features/recipes/recipe'
import { mealSlotSchema } from '#/features/recipes/recipe'
import { buildWeeklyMenuCandidates } from '#/features/weekly-menu/menu-candidates'
import { placedRecipeIds } from '#/features/weekly-menu/week'
import type { CalendarWeekMenu } from '#/features/weekly-menu/week'
import type { TargetWeekSchedule } from '#/features/weekly-menu/ai-schedule'
import { menuForTargetSchedule } from '#/features/weekly-menu/ai-schedule'

const dayAssignmentSchema = z.strictObject({
  lunchRecipeId: z.string().nullable(),
  dinnerRecipeId: z.string().nullable(),
})

const dayAssignmentShape = Object.fromEntries(
  DAYS.map((day) => [day, dayAssignmentSchema]),
) as Record<Day, typeof dayAssignmentSchema>

const aiMenuAssignmentsSchema = z.strictObject({
  weekStart: z.string(),
  days: z.strictObject(dayAssignmentShape),
})

export type AiMenuContext = {
  targetWeekStart: string
  schedule: TargetWeekSchedule
  recipes: Recipe[]
  currentWeek: CalendarWeekMenu
  previousWeek: CalendarWeekMenu
  previousProposal?: CalendarWeekMenu
}

export type AiMenuResult = {
  menu: CalendarWeekMenu
  recipeNames: Record<string, string>
  unavailableSlots: MealSlot[]
  // Set only when a local menu replaced a failed remote selection.
  selectionSource?: 'local'
}

export function validateAiMenuAssignments(
  context: AiMenuContext,
  value: unknown,
): AiMenuResult {
  const parsed = aiMenuAssignmentsSchema.safeParse(value)
  if (!parsed.success) throw new Error('AI returned an invalid Weekly Menu')
  if (parsed.data.weekStart !== context.targetWeekStart) {
    throw new Error('AI returned the wrong Calendar Week')
  }

  const orderedRecipes = context.recipes
    .slice()
    .sort((left, right) =>
      left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
    )
  const candidates = {
    lunch: orderedRecipes.filter((recipe) => recipe.slot === 'lunch'),
    dinner: orderedRecipes.filter((recipe) => recipe.slot === 'dinner'),
  }
  const menu = menuForTargetSchedule(context.targetWeekStart, context.schedule)
  const priorRecipeIds = new Set([
    ...placedRecipeIds(context.currentWeek),
    ...placedRecipeIds(context.previousWeek),
  ])
  const fallbackMenu = buildWeeklyMenuCandidates(context, 0)[0]
  const repairCounts: Record<MealSlot, number> = { lunch: 0, dinner: 0 }
  const unavailableSlots: MealSlot[] = []
  // Reserve every valid model choice before repairing any earlier missing slot.
  const reserved = { lunch: new Set<string>(), dinner: new Set<string>() }
  for (const day of DAYS) {
    for (const slot of mealSlotSchema.options) {
      if (menu.days[day].scope !== 'both' && menu.days[day].scope !== slot)
        continue
      const id =
        parsed.data.days[day][
          slot === 'lunch' ? 'lunchRecipeId' : 'dinnerRecipeId'
        ]
      if (candidates[slot].some((recipe) => recipe.id === id))
        reserved[slot].add(id!)
    }
  }

  for (const day of DAYS) {
    const plan = menu.days[day]
    const fallback = fallbackMenu.days[day]
    const assignment = parsed.data.days[day]
    const lunchRecipeId = checkedRecipeId(
      assignment.lunchRecipeId,
      plan.scope === 'both' || plan.scope === 'lunch',
      candidates.lunch,
      fallback.lunchRecipeId,
      repairCounts.lunch,
      reserved.lunch,
      priorRecipeIds,
    )
    if (lunchRecipeId !== assignment.lunchRecipeId) repairCounts.lunch += 1
    const dinnerRecipeId = checkedRecipeId(
      assignment.dinnerRecipeId,
      plan.scope === 'both' || plan.scope === 'dinner',
      candidates.dinner,
      fallback.dinnerRecipeId,
      repairCounts.dinner,
      reserved.dinner,
      priorRecipeIds,
    )
    if (dinnerRecipeId !== assignment.dinnerRecipeId) repairCounts.dinner += 1

    menu.days[day] = {
      ...plan,
      lunchRecipeId,
      dinnerRecipeId,
    }
  }

  for (const slot of mealSlotSchema.options) {
    if (candidates[slot].length > 0) continue
    if (
      DAYS.some((day) => {
        const plan = menu.days[day]
        return plan.scope === 'both' || plan.scope === slot
      })
    ) {
      unavailableSlots.push(slot)
    }
  }

  return {
    menu,
    recipeNames: Object.fromEntries(
      context.recipes.map((recipe) => [recipe.id, recipe.name]),
    ),
    unavailableSlots,
  }
}

function checkedRecipeId(
  recipeId: string | null,
  isHomePlanned: boolean,
  candidates: readonly Recipe[],
  fallbackRecipeId: string | null,
  fallbackIndex: number,
  reserved: Set<string>,
  priorRecipeIds: ReadonlySet<string>,
): string | null {
  if (!isHomePlanned) {
    if (recipeId !== null) throw new Error('AI assigned a covered Meal Slot')
    return null
  }
  if (candidates.length === 0) {
    if (recipeId !== null)
      throw new Error('AI assigned an unavailable Meal Slot')
    return null
  }

  const recipe = candidates.find((candidate) => candidate.id === recipeId)
  if (recipe) return recipe.id

  // Prefer unused this week, then not used in the current/previous week.
  const unreserved = candidates.filter(
    (candidate) => !reserved.has(candidate.id),
  )
  const freeFallback =
    fallbackRecipeId !== null && !reserved.has(fallbackRecipeId)
      ? fallbackRecipeId
      : undefined
  const repairedId =
    (freeFallback && !priorRecipeIds.has(freeFallback)
      ? freeFallback
      : undefined) ??
    unreserved.find((candidate) => !priorRecipeIds.has(candidate.id))?.id ??
    freeFallback ??
    unreserved.at(0)?.id ??
    fallbackRecipeId ??
    candidates[fallbackIndex % candidates.length].id
  reserved.add(repairedId)
  return repairedId
}
