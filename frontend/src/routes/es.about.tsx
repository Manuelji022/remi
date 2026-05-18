import { createFileRoute } from '@tanstack/react-router'
import { AboutPage } from './about'

export const Route = createFileRoute('/es/about')({
  component: AboutPage,
})

