# FastAPI Backend Architecture Plan

## Decision

FastAPI will be the only backend for Remi. The frontend will not connect directly to PostgreSQL and will not own database models, migrations, or database access code.

```text
TanStack Start frontend
        |
        | HTTP API
        v
FastAPI backend
        |
        | SQLAlchemy / Alembic
        v
PostgreSQL
```

## Why

- Database credentials must never be exposed to the browser.
- User-owned data requires centralized authorization checks in the backend.
- Business rules such as shopping list consolidation should live close to the data.
- The schema and migrations should have one owner to avoid drift.
- FastAPI can validate inputs, enforce permissions, manage transactions, and return stable API contracts to the frontend.

## Backend Ownership

FastAPI owns:

- PostgreSQL connection configuration.
- SQLAlchemy models.
- Alembic migrations.
- Seed scripts.
- Authentication and authorization.
- Recipe, planning, preference, and shopping list business logic.
- Shopping list consolidation.

The frontend owns:

- UI state.
- Calls to the FastAPI HTTP API.
- Rendering loading, empty, and error states.
- Client-side form validation for user experience only.

## Recommended Backend Stack

- FastAPI for HTTP endpoints.
- SQLAlchemy 2 for database models and queries.
- Alembic for migrations.
- PostgreSQL for persistence.
- Pydantic for request and response schemas.
- `pydantic-settings` for configuration.
- `psycopg` or `asyncpg` for PostgreSQL connectivity.

## Authentication Direction

Because FastAPI is the only backend, authentication should also live in FastAPI.

Recommended approach:

- Use secure HTTP-only cookies or signed tokens issued by FastAPI.
- Keep user identity resolution in backend dependencies.
- Require backend authorization checks on every user-owned resource.

Better Auth is not needed in this architecture because it would introduce a second TypeScript backend owner for auth and persistence.

## Initial API Surface

Health:

- `GET /health`

Recipes:

- `GET /recipes`
- `POST /recipes`
- `GET /recipes/{recipe_id}`
- `PATCH /recipes/{recipe_id}`
- `DELETE /recipes/{recipe_id}`

Weekly plans:

- `GET /weekly-plans/{week_start_date}`
- `POST /weekly-plans`
- `PATCH /weekly-plans/{weekly_plan_id}`

Preferences:

- `GET /weekly-preferences`
- `PUT /weekly-preferences`

Shopping lists:

- `POST /weekly-plans/{weekly_plan_id}/shopping-list`
- `GET /shopping-lists/{shopping_list_id}`
- `PATCH /shopping-list-items/{shopping_list_item_id}`

## Database Model

The domain model from `docs/database-plan.md` remains valid, but should be implemented in Python with SQLAlchemy and Alembic instead of Prisma.

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

## Shopping List Consolidation

The backend should generate shopping lists inside a transaction:

1. Load planned meals for the weekly plan.
2. Load recipe ingredients for those meals.
3. Group ingredients by `ingredient_id` when available.
4. Fall back to `normalized_name` if an ingredient id is not available.
5. Create one `shopping_list_items` row per grouped ingredient.
6. Combine free-text quantities with ` + ` without unit math.
7. Create one `shopping_list_item_sources` row per recipe contribution.

## Frontend Integration

The frontend should use a single API base URL, configured through `VITE_API_URL`.

Example local value:

```text
VITE_API_URL=http://localhost:8000
```

Frontend code should call FastAPI through small API helper functions and should not import database clients or contain database migrations.

## Implementation Order

1. Keep the frontend as a pure HTTP client.
2. Create the FastAPI project in a future backend-specific change.
3. Implement SQLAlchemy models from `docs/database-plan.md`.
4. Generate the initial Alembic migration.
5. Add backend seed data.
6. Add backend tests for shopping list consolidation.
7. Replace frontend mock data route-by-route with calls to FastAPI.
