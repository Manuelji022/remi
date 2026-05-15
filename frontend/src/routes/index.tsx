import { createFileRoute } from '@tanstack/react-router'
import { useI18n } from '#/i18n'

export const Route = createFileRoute('/')({ component: IndexPage })

export function IndexPage() {
  const { t } = useI18n()

  return (
    <main>
      <p>{t('home.copy')}</p>
    </main>
  )
}
