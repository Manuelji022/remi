import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'
import { isLocale } from '#/shared/i18n'
import { messages } from '#/shared/i18n/messages'

export const Route = createFileRoute('/{-$locale}')({
  beforeLoad: ({ params }) => {
    if (params.locale !== undefined && !isLocale(params.locale)) {
      throw notFound()
    }
  },
  head: ({ params }) => {
    const locale =
      params.locale !== undefined && isLocale(params.locale)
        ? params.locale
        : 'en'

    return {
      meta: [
        {
          title: messages[locale]['app.title'],
        },
      ],
    }
  },
  component: LocaleLayout,
})

function LocaleLayout() {
  return <Outlet />
}
