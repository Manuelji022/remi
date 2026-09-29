import { DAYS } from '#/data/constants'
import type { IngredientUnit } from '#/data/types'
import type { CalendarWeekMenu } from '#/menu/week'
import type { Recipe } from '#/recipes/recipe'

export type ShoppingLine = {
  name: string
  quantity: number | null
  unit: IngredientUnit | null
}

export function shoppingList(
  menu: CalendarWeekMenu,
  catalog: readonly Recipe[],
): ShoppingLine[] {
  const recipesById = new Map(catalog.map((recipe) => [recipe.id, recipe]))
  const seenRecipeIds = new Set<string>()
  const lines: ShoppingLine[] = []
  const lineIndexByKey = new Map<string, number>()

  for (const day of DAYS) {
    const plan = menu.days[day]

    for (const recipeId of [plan.lunchRecipeId, plan.dinnerRecipeId]) {
      if (recipeId === null || seenRecipeIds.has(recipeId)) continue
      seenRecipeIds.add(recipeId)

      const recipe = recipesById.get(recipeId)
      if (!recipe) continue

      const ingredients = recipe.ingredients
        .slice()
        .sort((left, right) => left.position - right.position)

      for (const ingredient of ingredients) {
        const kind = ingredient.quantity === null ? 'unknown' : 'number'
        const key = JSON.stringify([ingredient.name, ingredient.unit, kind])
        const existingIndex = lineIndexByKey.get(key)

        if (existingIndex === undefined) {
          lineIndexByKey.set(key, lines.length)
          lines.push({
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
          })
          continue
        }

        const line = lines[existingIndex]
        if (line.quantity === null || ingredient.quantity === null) continue

        line.quantity += ingredient.quantity
      }
    }
  }

  return lines
}
