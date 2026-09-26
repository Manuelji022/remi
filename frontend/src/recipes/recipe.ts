import type { IngredientUnit, MealSlot } from '#/data/types'

export const MEAL_SLOTS = [
  'lunch',
  'dinner',
] as const satisfies readonly MealSlot[]

export const INGREDIENT_UNITS = [
  'unit',
  'g',
  'kg',
  'ml',
  'l',
  'tbsp',
  'tsp',
  'can',
  'pack',
] as const satisfies readonly IngredientUnit[]

export type RecipeIngredientInput = {
  name: string
  quantity: number | null
  unit: IngredientUnit | null
}

export type RecipeInput = {
  name: string
  slot: MealSlot
  ingredients: RecipeIngredientInput[]
}

export type RecipeIngredient = RecipeIngredientInput & {
  id: string
  position: number
}

export type Recipe = {
  id: string
  name: string
  slot: MealSlot
  ingredients: RecipeIngredient[]
}

export type RecipeUpdate = RecipeInput & {
  id: string
}

export type ReadResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

export class RecipeInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RecipeInputError'
  }
}

export class RecipeNotFoundError extends Error {
  constructor() {
    super('Recipe not found')
    this.name = 'RecipeNotFoundError'
  }
}

export function readRecipeInput(value: unknown): ReadResult<RecipeInput> {
  if (!isRecord(value)) return fail('Recipe name is required')
  if (typeof value.name !== 'string' || value.name.trim() === '') {
    return fail('Recipe name is required')
  }
  if (!isMealSlot(value.slot))
    return fail('Recipe slot must be lunch or dinner')
  if (!Array.isArray(value.ingredients)) {
    return fail('Recipe ingredients must be a list')
  }

  const ingredients: RecipeIngredientInput[] = []

  for (const ingredient of value.ingredients) {
    const parsed = readIngredient(ingredient)
    if (!parsed.ok) return parsed
    ingredients.push(parsed.value)
  }

  return {
    ok: true,
    value: {
      name: value.name.trim(),
      slot: value.slot,
      ingredients,
    },
  }
}

export function readRecipeUpdate(value: unknown): ReadResult<RecipeUpdate> {
  const id = readRecipeId(value)
  if (!id.ok) return id
  const recipe = readRecipeInput(value)
  if (!recipe.ok) return recipe

  return { ok: true, value: { id: id.value.id, ...recipe.value } }
}

export function readRecipeId(value: unknown): ReadResult<{ id: string }> {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    value.id.trim() === ''
  ) {
    return fail('Recipe id is required')
  }

  return { ok: true, value: { id: value.id.trim() } }
}

export function parseRecipeInput(value: unknown): RecipeInput {
  const parsed = readRecipeInput(value)
  if (!parsed.ok) throw new RecipeInputError(parsed.error)
  return parsed.value
}

export function parseRecipeUpdate(value: unknown): RecipeUpdate {
  const parsed = readRecipeUpdate(value)
  if (!parsed.ok) throw new RecipeInputError(parsed.error)
  return parsed.value
}

export function parseRecipeId(value: unknown): { id: string } {
  const parsed = readRecipeId(value)
  if (!parsed.ok) throw new RecipeInputError(parsed.error)
  return parsed.value
}

export function readStoredMealSlot(value: string): MealSlot {
  if (isMealSlot(value)) return value
  throw new Error('Invalid recipe slot')
}

export function readStoredIngredientUnit(
  value: string | null,
): IngredientUnit | null {
  if (value === null) return null
  if (isIngredientUnit(value)) return value
  throw new Error('Invalid ingredient unit')
}

export function recipeToInput(recipe: Recipe): RecipeInput {
  return {
    name: recipe.name,
    slot: recipe.slot,
    ingredients: recipe.ingredients
      .slice()
      .sort((left, right) => left.position - right.position)
      .map(({ name, quantity, unit }) => ({ name, quantity, unit })),
  }
}

export function recipesMissingFromCatalog(
  catalog: readonly Recipe[],
  legacy: readonly RecipeInput[],
): RecipeInput[] {
  const unused = catalog.map(recipeToInput)
  const missing: RecipeInput[] = []

  for (const recipe of legacy) {
    const index = unused.findIndex((candidate) =>
      recipeInputsEqual(candidate, recipe),
    )

    if (index >= 0) {
      unused.splice(index, 1)
      continue
    }

    missing.push(recipe)
  }

  return missing
}

function readIngredient(value: unknown): ReadResult<RecipeIngredientInput> {
  if (
    !isRecord(value) ||
    typeof value.name !== 'string' ||
    value.name.trim() === ''
  ) {
    return fail('Ingredient name is required')
  }

  const quantity = readQuantity(value.quantity)
  if (!quantity.ok) return quantity
  const unit = readUnit(value.unit)
  if (!unit.ok) return unit

  return {
    ok: true,
    value: {
      name: value.name.trim(),
      quantity: quantity.value,
      unit: unit.value,
    },
  }
}

function readQuantity(value: unknown): ReadResult<number | null> {
  if (value === undefined || value === null) return { ok: true, value: null }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return fail(
      'Ingredient quantity must be a number greater than or equal to zero',
    )
  }

  return { ok: true, value }
}

function readUnit(value: unknown): ReadResult<IngredientUnit | null> {
  if (value === undefined || value === null) return { ok: true, value: null }
  if (!isIngredientUnit(value)) return fail('Ingredient unit is invalid')
  return { ok: true, value }
}

function recipeInputsEqual(left: RecipeInput, right: RecipeInput): boolean {
  if (left.name !== right.name || left.slot !== right.slot) return false
  if (left.ingredients.length !== right.ingredients.length) return false

  return left.ingredients.every((ingredient, index) => {
    const other = right.ingredients[index]
    return (
      ingredient.name === other.name &&
      ingredient.quantity === other.quantity &&
      ingredient.unit === other.unit
    )
  })
}

function fail(error: string): ReadResult<never> {
  return { ok: false, error }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isMealSlot(value: unknown): value is MealSlot {
  return (
    typeof value === 'string' &&
    (MEAL_SLOTS as readonly string[]).includes(value)
  )
}

function isIngredientUnit(value: unknown): value is IngredientUnit {
  return (
    typeof value === 'string' &&
    (INGREDIENT_UNITS as readonly string[]).includes(value)
  )
}
