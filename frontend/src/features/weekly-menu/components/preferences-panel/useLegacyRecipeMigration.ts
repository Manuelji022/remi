import { useEffect, useState } from 'react'
import { importLegacyRecipes } from '#/features/recipes/migrate'
import type { RecipeInput } from '#/features/recipes/recipe'

/** Imports legacy local recipes for the signed-in user once the panel is open; re-runs when the account changes. */
export function useLegacyRecipeMigration({
  isActive,
  userId,
  legacyCustomRecipes,
  onMigrated,
}: {
  isActive: boolean
  userId: string | undefined
  legacyCustomRecipes: RecipeInput[]
  onMigrated: () => void
}) {
  const [migrationFailed, setMigrationFailed] = useState(false)

  useEffect(() => {
    if (!isActive || !userId || legacyCustomRecipes.length === 0) return

    const controller = { cancelled: false }

    void importLegacyRecipes(legacyCustomRecipes, () => controller.cancelled)
      .then((imported) => {
        if (!imported || controller.cancelled) return
        setMigrationFailed(false)
        onMigrated()
      })
      .catch(() => {
        if (controller.cancelled) return
        setMigrationFailed(true)
      })

    return () => {
      controller.cancelled = true
    }
  }, [isActive, userId, legacyCustomRecipes, onMigrated])

  return migrationFailed
}
