import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'
import { isLocale } from '#/shared/i18n'

export const Route = createFileRoute('/{-$locale}')({
  beforeLoad: ({ params }) => {
    if (params.locale !== undefined && !isLocale(params.locale)) {
      throw notFound()
    }
  },
  component: LocaleLayout,
})

function LocaleLayout() {
  return <Outlet />
}
