import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'
import { isLocale } from '#/shared/i18n'
import { messages } from '#/shared/i18n/messages'

export const Route = createFileRoute('/{-$locale}')({
  beforeLoad: ({ params }) => {
    if (params.locale !== undefined && !isLocale(params.locale)) {
      throw notFound()
    }
  },
  head: ({ params }) => ({
    meta: [
      {
        title: messages[params.locale === 'es' ? 'es' : 'en']['app.title'],
      },
    ],
  }),
  component: LocaleLayout,
})

function LocaleLayout() {
  return <Outlet />
}
