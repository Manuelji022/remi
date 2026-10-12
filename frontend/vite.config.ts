import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import postcssCustomMedia from 'postcss-custom-media'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import containerCustomMedia from './postcss/container-custom-media.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const config = defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      '@components': path.resolve(__dirname, './src/components'),
      '@data': path.resolve(__dirname, './src/data'),
      '@routes': path.resolve(__dirname, './src/routes'),
    },
  },
  css: {
    postcss: {
      plugins: [containerCustomMedia(), postcssCustomMedia()],
    },
  },
  plugins: [
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
