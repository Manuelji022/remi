import { z } from 'zod'

export const MEAL_SLOTS = ['lunch', 'dinner'] as const
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
] as const

export const mealSlotSchema = z.enum(MEAL_SLOTS)
export const ingredientUnitSchema = z.enum(INGREDIENT_UNITS)
const recipeIngredientInputSchema = z.object({
  name: z.string().trim().min(1, 'Ingredient name is required'),
  quantity: z.number().finite().min(0).nullable().optional().default(null),
  unit: ingredientUnitSchema.nullable().optional().default(null),
})
export const recipeInputSchema = z.object({
  name: z.string().trim().min(1, 'Recipe name is required'),
  slot: mealSlotSchema,
  ingredients: z.array(recipeIngredientInputSchema),
})
export const recipeQuantityDraftSchema = z
  .string()
  .trim()
  .refine((value) => {
    if (value === '') return true
    return z.number().finite().min(0).safeParse(Number(value)).success
  })
export const recipeIdSchema = z.object({
  id: z.string().trim().min(1, 'Recipe id is required'),
})
export const recipeUpdateSchema = recipeIdSchema.extend(recipeInputSchema.shape)

export type MealSlot = z.infer<typeof mealSlotSchema>
export type IngredientUnit = z.infer<typeof ingredientUnitSchema>
export type RecipeIngredientInput = z.infer<typeof recipeIngredientInputSchema>
export type RecipeInput = z.infer<typeof recipeInputSchema>

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
  { ok: true; value: T } | { ok: false; error: string }

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
  const parsed = recipeInputSchema.safeParse(value)
  if (parsed.success) return { ok: true, value: parsed.data }
  return fail(recipeValidationMessage(parsed.error))
}

export function readRecipeUpdate(value: unknown): ReadResult<RecipeUpdate> {
  const parsed = recipeUpdateSchema.safeParse(value)
  if (parsed.success) return { ok: true, value: parsed.data }
  return fail(recipeValidationMessage(parsed.error))
}

export function readRecipeId(value: unknown): ReadResult<{ id: string }> {
  const parsed = recipeIdSchema.safeParse(value)
  if (parsed.success) return { ok: true, value: parsed.data }
  return fail('Recipe id is required')
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
  const parsed = mealSlotSchema.safeParse(value)
  if (parsed.success) return parsed.data
  throw new Error('Invalid recipe slot')
}

export function readStoredIngredientUnit(
  value: string | null,
): IngredientUnit | null {
  if (value === null) return null
  const parsed = ingredientUnitSchema.safeParse(value)
  if (parsed.success) return parsed.data
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

function recipeValidationMessage(error: z.ZodError): string {
  const issue = error.issues[0]
  if (issue.path[0] === 'slot') return 'Recipe slot must be lunch or dinner'
  if (issue.path[0] === 'ingredients' && issue.path.length === 1) {
    return 'Recipe ingredients must be a list'
  }
  if (issue.path[0] === 'ingredients' && issue.path[2] === 'quantity') {
    return 'Ingredient quantity must be a number greater than or equal to zero'
  }
  if (issue.path[0] === 'ingredients' && issue.path[2] === 'unit') {
    return 'Ingredient unit is invalid'
  }
  if (issue.path[0] === 'ingredients') return 'Ingredient name is required'
  return issue.message
}
