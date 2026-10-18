import { relations } from 'drizzle-orm'
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  integer,
  doublePrecision,
  date,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  twoFactorEnabled: boolean('two_factor_enabled').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
})

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('session_userId_idx').on(table.userId)],
)

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index('account_userId_idx').on(table.userId)],
)

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
)

export const twoFactor = pgTable(
  'two_factor',
  {
    id: text('id').primaryKey(),
    secret: text('secret').notNull(),
    backupCodes: text('backup_codes').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    verified: boolean('verified').default(true),
  },
  (table) => [
    index('twoFactor_secret_idx').on(table.secret),
    index('twoFactor_userId_idx').on(table.userId),
  ],
)

export const recipe = pgTable(
  'recipe',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slot: text('slot').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index('recipe_userId_idx').on(table.userId)],
)

export const recipeIngredient = pgTable(
  'recipe_ingredient',
  {
    id: text('id').primaryKey(),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipe.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    quantity: doublePrecision('quantity'),
    unit: text('unit'),
    position: integer('position').notNull(),
  },
  (table) => [index('recipeIngredient_recipeId_idx').on(table.recipeId)],
)

export const weeklyMenu = pgTable(
  'weekly_menu',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    weekStart: date('week_start', { mode: 'string' }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('weeklyMenu_userId_weekStart_uidx').on(
      table.userId,
      table.weekStart,
    ),
  ],
)

export const weeklyMenuDay = pgTable(
  'weekly_menu_day',
  {
    id: text('id').primaryKey(),
    weeklyMenuId: text('weekly_menu_id')
      .notNull()
      .references(() => weeklyMenu.id, { onDelete: 'cascade' }),
    day: text('day').notNull(),
    context: text('context'),
    scope: text('scope').notNull(),
    lunchRecipeId: text('lunch_recipe_id').references(() => recipe.id, {
      onDelete: 'set null',
    }),
    dinnerRecipeId: text('dinner_recipe_id').references(() => recipe.id, {
      onDelete: 'set null',
    }),
  },
  (table) => [
    uniqueIndex('weeklyMenuDay_menuId_day_uidx').on(
      table.weeklyMenuId,
      table.day,
    ),
  ],
)

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  twoFactors: many(twoFactor),
  recipes: many(recipe),
  weeklyMenus: many(weeklyMenu),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))

export const twoFactorRelations = relations(twoFactor, ({ one }) => ({
  user: one(user, {
    fields: [twoFactor.userId],
    references: [user.id],
  }),
}))

export const recipeRelations = relations(recipe, ({ one, many }) => ({
  user: one(user, {
    fields: [recipe.userId],
    references: [user.id],
  }),
  ingredients: many(recipeIngredient),
}))

export const recipeIngredientRelations = relations(
  recipeIngredient,
  ({ one }) => ({
    recipe: one(recipe, {
      fields: [recipeIngredient.recipeId],
      references: [recipe.id],
    }),
  }),
)

export const weeklyMenuRelations = relations(weeklyMenu, ({ one, many }) => ({
  user: one(user, {
    fields: [weeklyMenu.userId],
    references: [user.id],
  }),
  days: many(weeklyMenuDay),
}))

export const weeklyMenuDayRelations = relations(weeklyMenuDay, ({ one }) => ({
  weeklyMenu: one(weeklyMenu, {
    fields: [weeklyMenuDay.weeklyMenuId],
    references: [weeklyMenu.id],
  }),
}))
