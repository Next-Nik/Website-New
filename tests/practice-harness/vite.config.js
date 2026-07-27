// Harness build: same plugins and package aliases as the real app, plus a
// resolve plugin that swaps the page's supabase/auth hook modules for the
// in-memory mocks. A plugin rather than resolve.alias because alias matches
// RAW import specifiers ('../hooks/useSupabase'), which vary by importer —
// intercepting on the specifier's tail is what actually catches them all.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import path from 'path'

const here = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: here,
  plugins: [
    {
      name: 'mock-hooks',
      enforce: 'pre',
      resolveId(source) {
        if (source.endsWith('hooks/useSupabase')) return path.join(here, 'mock-supabase.js')
        if (source.endsWith('hooks/useAuth')) return path.join(here, 'mock-useAuth.js')
        return null
      },
    },
    react(),
  ],
  build: { outDir: path.join(here, 'dist'), emptyOutDir: true },
  resolve: {
    alias: {
      'circular-natal-horoscope-js': 'circular-natal-horoscope-js/dist/index.js',
    },
  },
})
