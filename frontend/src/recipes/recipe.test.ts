import { describe, expect, it } from 'vitest'
import {
  parseRecipeId,
  parseRecipeInput,
  parseRecipeUpdate,
  readRecipeInput,
  readStoredIngredientUnit,
  readStoredMealSlot,
  recipesMissingFromCatalog,
  RecipeInputError,
} from './recipe'
import type { Recipe, RecipeInput } from './recipe'

const pasta: RecipeInput = {
  name: 'Lemon pasta',
  slot: 'dinner',
  ingredients: [{ name: 'Pasta', quantity: 200, unit: 'g' }],
}

describe('recipe input', () => {
  it('parses a recipe and fills missing quantity and unit with null', () => {
    expect(
      parseRecipeInput({
        name: '  Soup  ',
        slot: 'lunch',
        ingredients: [{ name: '  Stock  ' }, { name: 'Salt', quantity: 0 }],
      }),
    ).toEqual({
      name: 'Soup',
      slot: 'lunch',
      ingredients: [
        { name: 'Stock', quantity: null, unit: null },
        { name: 'Salt', quantity: 0, unit: null },
      ],
    })
  })

  it('rejects a blank name, a bad slot, and a missing ingredient list', () => {
    expect(
      readRecipeInput({ name: ' ', slot: 'lunch', ingredients: [] }),
    ).toEqual({ ok: false, error: 'Recipe name is required' })
    expect(
      readRecipeInput({ name: 'Soup', slot: 'breakfast', ingredients: [] }),
    ).toEqual({ ok: false, error: 'Recipe slot must be lunch or dinner' })
    expect(readRecipeInput({ name: 'Soup', slot: 'lunch' })).toEqual({
      ok: false,
      error: 'Recipe ingredients must be a list',
    })
  })

  it('rejects a blank ingredient, a bad quantity, and a bad unit', () => {
    expect(
      readRecipeInput({
        name: 'Soup',
        slot: 'lunch',
        ingredients: [{ name: ' ' }],
      }),
    ).toEqual({ ok: false, error: 'Ingredient name is required' })
    expect(
      readRecipeInput({
        name: 'Soup',
        slot: 'lunch',
        ingredients: [{ name: 'Salt', quantity: -1 }],
      }),
    ).toEqual({
      ok: false,
      error:
        'Ingredient quantity must be a number greater than or equal to zero',
    })
    expect(
      readRecipeInput({
        name: 'Soup',
        slot: 'lunch',
        ingredients: [{ name: 'Salt', quantity: '1' }],
      }),
    ).toEqual({
      ok: false,
      error:
        'Ingredient quantity must be a number greater than or equal to zero',
    })
    expect(
      readRecipeInput({
        name: 'Soup',
        slot: 'lunch',
        ingredients: [{ name: 'Salt', unit: 'cup' }],
      }),
    ).toEqual({ ok: false, error: 'Ingredient unit is invalid' })
  })

  it('parses an update and an id', () => {
    expect(parseRecipeUpdate({ id: ' recipe-1 ', ...pasta })).toEqual({
      id: 'recipe-1',
      ...pasta,
    })
    expect(parseRecipeId({ id: ' recipe-1 ' })).toEqual({ id: 'recipe-1' })
    expect(() => parseRecipeId({})).toThrow(RecipeInputError)
    expect(() => parseRecipeId({})).toThrow('Recipe id is required')
  })

  it('reads stored slot and unit text', () => {
    expect(readStoredMealSlot('dinner')).toBe('dinner')
    expect(() => readStoredMealSlot('breakfast')).toThrow('Invalid recipe slot')
    expect(readStoredIngredientUnit(null)).toBeNull()
    expect(readStoredIngredientUnit('tbsp')).toBe('tbsp')
    expect(() => readStoredIngredientUnit('cup')).toThrow(
      'Invalid ingredient unit',
    )
  })
})

describe('legacy recipe migration', () => {
  it('returns legacy recipes that are not already in the catalog', () => {
    const catalog: Recipe[] = [
      {
        id: 'saved',
        name: 'Lemon pasta',
        slot: 'dinner',
        ingredients: [
          {
            id: 'ingredient',
            name: 'Pasta',
            quantity: 200,
            unit: 'g',
            position: 0,
          },
        ],
      },
    ]
    const soup: RecipeInput = {
      name: 'Soup',
      slot: 'lunch',
      ingredients: [],
    }

    expect(recipesMissingFromCatalog(catalog, [pasta, soup, pasta])).toEqual([
      soup,
      pasta,
    ])
    expect(recipesMissingFromCatalog(catalog, [pasta])).toEqual([])
  })
})
