import { createFileRoute } from '@tanstack/react-router'
import { useI18n } from '#/i18n'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

export function AboutPage() {
  const { t } = useI18n()

  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell rounded-2xl p-6 sm:p-8">
        <p className="island-kicker mb-2">{t('about.kicker')}</p>
        <h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
          {t('about.title')}
        </h1>
        <p className="m-0 max-w-3xl text-base leading-8 text-[var(--sea-ink-soft)]">
          {t('about.body')}
        </p>
      </section>
    </main>
  )
}
