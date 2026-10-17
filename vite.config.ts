import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import pkg from './package.json' with { type: 'json' }

// Shown at the bottom of every page, e.g. "v1.1.0 · build 12 · 3f2a9c1", so it's easy to tell
// whether the browser has the latest deploy. The build number comes from GitHub Actions.
const run = process.env.GITHUB_RUN_NUMBER
const sha = process.env.GITHUB_SHA?.slice(0, 7)
const version = [`v${pkg.version}`, run ? `build ${run}` : 'local', sha].filter(Boolean).join(' · ')

// https://vite.dev/config/
export default defineConfig({
  // Served from https://bagietu.github.io/instrument-lessons/ on GitHub Pages.
  base: '/instrument-lessons/',
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(version) },
})
