import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://bagietu.github.io/instrument-lessons/ on GitHub Pages.
  base: '/instrument-lessons/',
  plugins: [react()],
})
