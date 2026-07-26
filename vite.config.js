import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist' },
  resolve: {
    alias: {
      // circular-natal-horoscope-js ships a broken manifest: its "module"
      // field points at src/index.js, but the published tarball's "files"
      // list contains only dist/, so that path does not exist. Vite prefers
      // "module" for browser builds and the build dies on resolution. Its
      // "main" (dist/index) is fine, which is why Node and esbuild are happy
      // and only the Vite build fails. Pin the alias to the file that is
      // actually shipped.
      'circular-natal-horoscope-js': 'circular-natal-horoscope-js/dist/index.js',
    },
  },
})
