import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/es')({
  component: EsLayout,
})

function EsLayout() {
  return <Outlet />
}
