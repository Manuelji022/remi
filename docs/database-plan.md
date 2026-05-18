# Database Construction Plan

## Confirmed Decisions

- Database engine: PostgreSQL.
- ORM: Prisma.
- Data ownership: per user.
- Households: not included for now.
- Shopping list behavior: repeated ingredients must be consolidated.
- Ingredients: global catalog recommended.
- Recipes, preferences, weekly plans, and shopping lists: user-owned.

## Goals

- Create a durable database model for meal planning.
- Persist users, recipes, weekly plans, preferences, and shopping lists.
- Support consolidated shopping lists generated from planned meals.
- Keep the first schema practical and avoid premature complexity around units, nutrition, pricing, inventory, or supermarkets.
- Preserve historical plans and shopping lists even if recipes change later.

## Recommended Stack

- PostgreSQL for storage.
- Prisma for schema definition, migrations, and TypeScript database access.
- UUID primary keys for main entities.
- `timestamptz`-equivalent timestamps through Prisma `DateTime` fields.
- `date`-like week fields represented as Prisma `DateTime` values normalized to week start dates.

## Domain Model

Initial tables:

- `users`
- `ingredient_categories`
- `ingredients`
- `recipes`
- `recipe_ingredients`
- `weekly_plans`
- `planned_meals`
- `weekly_preferences`
- `shopping_lists`
- `shopping_list_items`
- `shopping_list_item_sources`

## Enums

Recommended controlled values:

```text
meal_slot: lunch, dinner
planning_scope: lunch, dinner, both
day_context: office, eat_out
recipe_source: user, generated, seed
weekly_plan_status: draft, active, archived
shopping_list_status: active, completed, archived
```

## Tables

### users

Stores application users.

```text
id uuid primary key
email text unique not null
name text
created_at timestamptz not null
updated_at timestamptz not null
```

### ingredient_categories

Global ingredient categories used for grouping shopping list items.

```text
id uuid primary key
key text unique not null
label text not null
sort_order int not null
```

Initial categories:

```text
produce_fresh_herbs
meat_fish
dairy_eggs
pantry_dry_goods
condiments_sauces
```

### ingredients

Global ingredient catalog. This supports consolidation across recipes.

```text
id uuid primary key
name text not null
normalized_name text unique not null
category_id uuid references ingredient_categories(id)
created_at timestamptz not null
```

`normalized_name` should be used for deduplication and fallback consolidation. Example: `Cherry Tomatoes` becomes `cherry tomatoes`.

### recipes

User-owned recipes. Recipes may come from the user, generated content, or seed data copied for a user.

```text
id uuid primary key
user_id uuid references users(id) not null
name text not null
description text
source text not null
planning_scope text not null
created_at timestamptz not null
updated_at timestamptz not null
```

### recipe_ingredients

Ingredients required by a recipe.

```text
id uuid primary key
recipe_id uuid references recipes(id) not null
ingredient_id uuid references ingredients(id) not null
quantity_text text
sort_order int
```

Keep quantities as free text for the first version. Examples: `500g`, `1 large`, `2 heads`, `optional`.

### weekly_plans

One user-owned plan for a calendar week.

```text
id uuid primary key
user_id uuid references users(id) not null
week_start_date date not null
status text not null
generated_reasoning text
created_at timestamptz not null
updated_at timestamptz not null
```

Constraints:

```text
unique(user_id, week_start_date)
```

### planned_meals

Meals assigned to a weekly plan by day and meal slot.

```text
id uuid primary key
weekly_plan_id uuid references weekly_plans(id) not null
day_of_week int not null
meal_slot text not null
recipe_id uuid references recipes(id)
name_snapshot text not null
description_snapshot text
created_at timestamptz not null
```

Rules:

```text
day_of_week: 1 = Monday, 7 = Sunday
meal_slot: lunch or dinner
unique(weekly_plan_id, day_of_week, meal_slot)
```

Snapshots preserve historical menus if a recipe is edited later.

### weekly_preferences

User-owned planning preferences.

```text
id uuid primary key
user_id uuid references users(id) not null
week_start_date date nullable
day_context text nullable
planning_scope text not null
created_at timestamptz not null
updated_at timestamptz not null
```

Rules:

```text
week_start_date null = default preference
week_start_date set = override for that specific week
unique(user_id, week_start_date, day_of_week)
```

### shopping_lists

One shopping list generated from a weekly plan.

```text
id uuid primary key
user_id uuid references users(id) not null
weekly_plan_id uuid references weekly_plans(id) not null
status text not null
created_at timestamptz not null
updated_at timestamptz not null
```

Constraints:

```text
unique(weekly_plan_id)
```

### shopping_list_items

Consolidated shopping list rows.

```text
id uuid primary key
shopping_list_id uuid references shopping_lists(id) not null
ingredient_id uuid references ingredients(id)
category_id uuid references ingredient_categories(id)
name_snapshot text not null
normalized_name_snapshot text not null
quantity_text text
checked boolean not null default false
in_fridge boolean not null default false
created_at timestamptz not null
updated_at timestamptz not null
```

Each row should represent one consolidated ingredient in the shopping list.

### shopping_list_item_sources

Tracks which recipes contributed to a consolidated shopping list item.

```text
id uuid primary key
shopping_list_item_id uuid references shopping_list_items(id) not null
recipe_id uuid references recipes(id)
quantity_text text
```

This enables later UI such as:

```text
Garlic
Used in:
- Tomato soup: 2 cloves
- Roast chicken: 1 head
```

## Shopping List Consolidation Rules

When generating a shopping list from a weekly plan:

1. Load all planned meals for the weekly plan.
2. Load all recipe ingredients for those meals.
3. Group ingredients by `ingredient_id` when available.
4. If `ingredient_id` is unavailable, group by `normalized_name`.
5. Create one `shopping_list_items` row per grouped ingredient.
6. Combine quantities into `quantity_text` without trying to mathematically sum units yet.
7. Create one `shopping_list_item_sources` row per recipe contribution.

Example:

```text
Recipe A: Garlic - 2 cloves
Recipe B: Garlic - 1 head
```

Consolidated result:

```text
Garlic - 2 cloves + 1 head
```

Automatic unit math is intentionally deferred. Later, the model can evolve toward structured quantities with amount and unit fields.

## Migration Plan

### Migration 001: Users

Create:

- `users`

Add:

- unique index on `email`

### Migration 002: Ingredient Catalog

Create:

- `ingredient_categories`
- `ingredients`

Add:

- unique index on `ingredient_categories.key`
- unique index on `ingredients.normalized_name`
- index on `ingredients.category_id`

### Migration 003: Recipes

Create:

- `recipes`
- `recipe_ingredients`

Add:

- index on `recipes.user_id`
- index on `recipe_ingredients.recipe_id`
- index on `recipe_ingredients.ingredient_id`

### Migration 004: Weekly Planning

Create:

- `weekly_plans`
- `planned_meals`
- `weekly_preferences`

Add:

- unique index on `weekly_plans(user_id, week_start_date)`
- unique index on `planned_meals(weekly_plan_id, day_of_week, meal_slot)`
- unique index on `weekly_preferences(user_id, week_start_date, day_of_week)`

### Migration 005: Shopping Lists

Create:

- `shopping_lists`
- `shopping_list_items`
- `shopping_list_item_sources`

Add:

- unique index on `shopping_lists.weekly_plan_id`
- index on `shopping_lists.user_id`
- index on `shopping_list_items.shopping_list_id`
- index on `shopping_list_items.ingredient_id`
- index on `shopping_list_item_sources.shopping_list_item_id`

## Seed Plan

Seed initial data in this order:

1. Ingredient categories.
2. Development user.
3. Initial global ingredients from current mock data.
4. Optional user-owned seed recipes copied from current mock meals.
5. Optional sample weekly plan for development.

## Validation Checklist

Validate the schema with these scenarios:

1. Create a user.
2. Create ingredient categories.
3. Create global ingredients.
4. Create a user recipe with ingredients.
5. Create default weekly preferences.
6. Create a weekly plan.
7. Add planned meals for lunch and dinner.
8. Generate a consolidated shopping list.
9. Confirm repeated ingredients become one shopping list item.
10. Confirm source recipes are preserved in `shopping_list_item_sources`.
11. Mark items as checked or in fridge.
12. Edit a recipe and confirm existing planned meal snapshots remain unchanged.

## Implementation Order

1. Add Prisma dependencies.
2. Configure PostgreSQL connection and environment variables.
3. Create `schema.prisma` with enums and models.
4. Create initial migrations in the order described above.
5. Add seed script for categories and development data.
6. Add database reset command for local development.
7. Add tests for shopping list consolidation.
8. Document how to migrate, seed, and reset the database.

## Deferred Features

These are intentionally outside the first database build:

- Households or shared family planning.
- Real pantry/fridge inventory.
- Nutritional data.
- Supermarket prices.
- Store-specific shopping sections.
- Automatic unit conversion.
- Advanced ingredient aliasing beyond `normalized_name`.
- Recipe versioning.
