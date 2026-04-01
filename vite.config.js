import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// Vanilla HTML pages and JS files that live at repo root
// and must be copied verbatim into dist/ during build.
// These are NOT part of the React app — Vite ignores them
// during compilation and we copy them manually here.
const VANILLA_FILES = [
  'about.html',
  'appendix.html',
  'content-editor.html',
  'life-os.html',
  'login.html',
  'nextus.html',
  'podcast.html',
  'privacy.html',
  'profile.html',
  'terms.html',
  'work-with-nik.html',
  'auth-init.js',
  'auth-guard.js',
  'auth-link-helper.js',
]

function copyVanillaFiles() {
  return {
    name: 'copy-vanilla-files',
    closeBundle() {
      for (const file of VANILLA_FILES) {
        const src = resolve(__dirname, file)
        const dest = resolve(__dirname, 'dist', file)
        if (existsSync(src)) {
          copyFileSync(src, dest)
          console.log(`[copy-vanilla] ${file}`)
        } else {
          console.warn(`[copy-vanilla] NOT FOUND: ${file}`)
        }
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), copyVanillaFiles()],
  build: { outDir: 'dist' },
})
