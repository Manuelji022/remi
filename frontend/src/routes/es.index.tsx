import { createFileRoute } from '@tanstack/react-router'
import { IndexPage } from './index'

export const Route = createFileRoute('/es/')({
  component: IndexPage,
})

