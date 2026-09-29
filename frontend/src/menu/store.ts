import { and, eq, inArray } from 'drizzle-orm'
import { DAYS } from '#/data/constants'
import type { Day } from '#/data/constants'
import { db, schema } from '#/db'
import {
  MenuInputError,
  emptyMenu,
  parseCalendarWeek,
  parseWeekStart,
  readStoredDay,
} from '#/menu/week'
import type { CalendarWeekMenu, DayPlan, LoadedMenuWeek } from '#/menu/week'

const { recipe, weeklyMenu, weeklyMenuDay } = schema

export async function loadMenuWeekForUser(
  userId: string,
  weekStart: string,
): Promise<LoadedMenuWeek> {
  const monday = parseWeekStart(weekStart)
  const loaded = await readMenu(userId, monday)
  return {
    menu: loaded.menu,
    recipeNames: await recipeNamesFor(userId, loaded.menu),
    hasSavedMenu: loaded.hasSavedMenu,
  }
}

export async function saveMenuWeekForUser(
  userId: string,
  input: CalendarWeekMenu,
): Promise<LoadedMenuWeek> {
  const menu = parseCalendarWeek(input)
  await assertPlacedRecipes(userId, menu)

  await db.transaction(async (tx) => {
    const saved = await tx
      .insert(weeklyMenu)
      .values({
        id: crypto.randomUUID(),
        userId,
        weekStart: menu.weekStart,
      })
      .onConflictDoUpdate({
        target: [weeklyMenu.userId, weeklyMenu.weekStart],
        set: { updatedAt: new Date() },
      })
      .returning({ id: weeklyMenu.id })

    const weeklyMenuId = saved[0]?.id
    if (!weeklyMenuId) throw new Error('Week did not save')

    await tx
      .delete(weeklyMenuDay)
      .where(eq(weeklyMenuDay.weeklyMenuId, weeklyMenuId))

    await tx
      .insert(weeklyMenuDay)
      .values(DAYS.map((day) => dayRow(weeklyMenuId, day, menu.days[day])))
  })

  return loadMenuWeekForUser(userId, menu.weekStart)
}

async function readMenu(
  userId: string,
  weekStart: string,
): Promise<{ menu: CalendarWeekMenu; hasSavedMenu: boolean }> {
  const row = await db.query.weeklyMenu.findFirst({
    where: and(
      eq(weeklyMenu.userId, userId),
      eq(weeklyMenu.weekStart, weekStart),
    ),
    with: { days: true },
  })

  if (!row) return { menu: emptyMenu(weekStart), hasSavedMenu: false }

  const days = {} as CalendarWeekMenu['days']

  for (const day of DAYS) {
    const stored = row.days.find((item) => item.day === day)
    if (!stored) throw new Error('Invalid menu day')
    days[day] = storedDay(stored)
  }

  return { menu: { weekStart, days }, hasSavedMenu: true }
}

async function recipeNamesFor(
  userId: string,
  menu: CalendarWeekMenu,
): Promise<Record<string, string>> {
  const ids = recipeIds(menu)
  if (ids.length === 0) return {}

  const rows = await db
    .select({ id: recipe.id, name: recipe.name })
    .from(recipe)
    .where(and(eq(recipe.userId, userId), inArray(recipe.id, ids)))

  return Object.fromEntries(rows.map((row) => [row.id, row.name]))
}

async function assertPlacedRecipes(
  userId: string,
  menu: CalendarWeekMenu,
): Promise<void> {
  const placed = placements(menu)
  const seen = new Set<string>()

  for (const placement of placed) {
    if (seen.has(placement.id)) {
      throw new MenuInputError('Recipe is already placed')
    }
    seen.add(placement.id)
  }

  if (placed.length === 0) return

  const rows = await db
    .select({ id: recipe.id, slot: recipe.slot })
    .from(recipe)
    .where(and(eq(recipe.userId, userId), inArray(recipe.id, [...seen])))

  const slots = new Map(rows.map((row) => [row.id, row.slot]))

  for (const placement of placed) {
    const slot = slots.get(placement.id)
    if (!slot) throw new MenuInputError('Recipe not found')
    if (slot !== placement.slot) {
      throw new MenuInputError('Recipe slot does not match the meal')
    }
  }
}

function placements(
  menu: CalendarWeekMenu,
): { id: string; slot: 'lunch' | 'dinner' }[] {
  const placed: { id: string; slot: 'lunch' | 'dinner' }[] = []

  for (const day of DAYS) {
    const plan = menu.days[day]
    if (plan.lunchRecipeId) {
      placed.push({ id: plan.lunchRecipeId, slot: 'lunch' })
    }
    if (plan.dinnerRecipeId) {
      placed.push({ id: plan.dinnerRecipeId, slot: 'dinner' })
    }
  }

  return placed
}

function recipeIds(menu: CalendarWeekMenu): string[] {
  const ids = new Set<string>()

  for (const day of DAYS) {
    const plan = menu.days[day]
    if (plan.lunchRecipeId) ids.add(plan.lunchRecipeId)
    if (plan.dinnerRecipeId) ids.add(plan.dinnerRecipeId)
  }

  return [...ids]
}

function dayRow(weeklyMenuId: string, day: Day, plan: DayPlan) {
  return {
    id: crypto.randomUUID(),
    weeklyMenuId,
    day,
    context: plan.context,
    scope: plan.scope,
    lunchRecipeId: plan.lunchRecipeId,
    dinnerRecipeId: plan.dinnerRecipeId,
  }
}

function storedDay(row: {
  context: string | null
  scope: string
  lunchRecipeId: string | null
  dinnerRecipeId: string | null
}): DayPlan {
  return readStoredDay(row)
}
