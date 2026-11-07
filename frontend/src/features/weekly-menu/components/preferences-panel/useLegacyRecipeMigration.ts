import { useEffect, useState } from 'react'
import { importLegacyRecipes } from '#/features/recipes/migrate'
import type { RecipeInput } from '#/features/recipes/recipe'

/** Imports legacy local recipes once the panel is open and a user is signed in. */
export function useLegacyRecipeMigration({
  isActive,
  legacyCustomRecipes,
  onMigrated,
}: {
  isActive: boolean
  legacyCustomRecipes: RecipeInput[]
  onMigrated: () => void
}) {
  const [migrationFailed, setMigrationFailed] = useState(false)

  useEffect(() => {
    if (!isActive || legacyCustomRecipes.length === 0) return

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
  }, [isActive, legacyCustomRecipes, onMigrated])

  return migrationFailed
}
