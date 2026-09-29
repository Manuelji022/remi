import { describe, expect, it } from 'vitest'
import type { IngredientUnit, MealSlot } from '#/data/types'
import { emptyMenu } from '#/menu/week'
import { shoppingList } from '#/menu/shopping'
import type { Recipe, RecipeIngredient } from '#/recipes/recipe'

function ingredient(
  name: string,
  quantity: number | null,
  unit: IngredientUnit | null,
  position: number,
): RecipeIngredient {
  return {
    id: `${name}-${position}`,
    name,
    quantity,
    unit,
    position,
  }
}

function recipe(
  id: string,
  slot: MealSlot,
  ingredients: RecipeIngredient[],
): Recipe {
  return { id, name: id, slot, ingredients }
}

describe('shoppingList', () => {
  it('sums home meals in day order and skips recipes that are not placed', () => {
    const menu = emptyMenu('2026-09-28')
    menu.days.Monday = {
      context: 'office',
      scope: 'dinner',
      lunchRecipeId: null,
      dinnerRecipeId: 'lemon-pasta',
    }
    menu.days.Tuesday = {
      context: null,
      scope: 'both',
      lunchRecipeId: 'salad',
      dinnerRecipeId: 'soup',
    }
    const pasta = ingredient('Pasta', 200, 'g', 0)
    const lemon = ingredient('Lemon', 1, 'unit', 1)
    const catalog = [
      recipe('lemon-pasta', 'dinner', [lemon, pasta]),
      recipe('salad', 'lunch', [
        ingredient('Olive oil', null, null, 1),
        ingredient('Lemon', 1, 'unit', 0),
      ]),
      recipe('soup', 'dinner', [ingredient('Olive oil', 15, 'ml', 0)]),
      recipe('ignored', 'lunch', [ingredient('Secret', 1, 'unit', 0)]),
    ]

    expect(shoppingList(menu, catalog)).toEqual([
      { name: 'Pasta', quantity: 200, unit: 'g' },
      { name: 'Lemon', quantity: 2, unit: 'unit' },
      { name: 'Olive oil', quantity: null, unit: null },
      { name: 'Olive oil', quantity: 15, unit: 'ml' },
    ])
    expect(catalog[0]?.ingredients.map((item) => item.name)).toEqual([
      'Lemon',
      'Pasta',
    ])
    expect(pasta.quantity).toBe(200)
    expect(lemon.quantity).toBe(1)
    expect(menu.days.Monday.dinnerRecipeId).toBe('lemon-pasta')
  })

  it('returns an empty list for an empty menu', () => {
    const catalog = [recipe('soup', 'dinner', [ingredient('Stock', 1, 'l', 0)])]

    expect(shoppingList(emptyMenu('2026-09-28'), catalog)).toEqual([])
  })

  it('skips a placed id that is missing from the catalog', () => {
    const menu = emptyMenu('2026-09-28')
    menu.days.Monday.lunchRecipeId = 'missing'
    menu.days.Tuesday.dinnerRecipeId = 'soup'

    expect(
      shoppingList(menu, [
        recipe('soup', 'dinner', [ingredient('Stock', 500, 'ml', 0)]),
      ]),
    ).toEqual([{ name: 'Stock', quantity: 500, unit: 'ml' }])
  })

  it('counts a recipe once when lunch and dinner share its id', () => {
    const menu = emptyMenu('2026-09-28')
    menu.days.Monday = {
      context: null,
      scope: 'both',
      lunchRecipeId: 'soup',
      dinnerRecipeId: 'soup',
    }

    expect(
      shoppingList(menu, [
        recipe('soup', 'dinner', [ingredient('Noodles', 3, 'g', 0)]),
      ]),
    ).toEqual([{ name: 'Noodles', quantity: 3, unit: 'g' }])
  })

  it('collapses two unknown quantities of the same name and unit', () => {
    const menu = emptyMenu('2026-09-28')
    menu.days.Monday.lunchRecipeId = 'dressing'
    menu.days.Tuesday.dinnerRecipeId = 'salad'

    expect(
      shoppingList(menu, [
        recipe('dressing', 'lunch', [ingredient('Salt', null, 'tsp', 0)]),
        recipe('salad', 'lunch', [ingredient('Salt', null, 'tsp', 0)]),
      ]),
    ).toEqual([{ name: 'Salt', quantity: null, unit: 'tsp' }])
  })

  it('keeps a measured quantity beside an unknown quantity', () => {
    const menu = emptyMenu('2026-09-28')
    menu.days.Monday.lunchRecipeId = 'measured'
    menu.days.Tuesday.dinnerRecipeId = 'unknown'

    expect(
      shoppingList(menu, [
        recipe('measured', 'lunch', [ingredient('Salt', 1, 'tsp', 0)]),
        recipe('unknown', 'dinner', [ingredient('Salt', null, 'tsp', 0)]),
      ]),
    ).toEqual([
      { name: 'Salt', quantity: 1, unit: 'tsp' },
      { name: 'Salt', quantity: null, unit: 'tsp' },
    ])
  })

  it('adds a zero quantity to a later number', () => {
    const menu = emptyMenu('2026-09-28')
    menu.days.Monday.dinnerRecipeId = 'empty'
    menu.days.Tuesday.dinnerRecipeId = 'full'

    expect(
      shoppingList(menu, [
        recipe('empty', 'dinner', [ingredient('Flour', 0, 'g', 0)]),
        recipe('full', 'dinner', [ingredient('Flour', 2, 'g', 0)]),
      ]),
    ).toEqual([{ name: 'Flour', quantity: 2, unit: 'g' }])
  })

  it('keeps differently cased names on separate lines', () => {
    const menu = emptyMenu('2026-09-28')
    menu.days.Monday.lunchRecipeId = 'upper'
    menu.days.Tuesday.lunchRecipeId = 'lower'

    expect(
      shoppingList(menu, [
        recipe('upper', 'lunch', [ingredient('Pasta', 1, 'g', 0)]),
        recipe('lower', 'lunch', [ingredient('pasta', 1, 'g', 0)]),
      ]),
    ).toEqual([
      { name: 'Pasta', quantity: 1, unit: 'g' },
      { name: 'pasta', quantity: 1, unit: 'g' },
    ])
  })
})
