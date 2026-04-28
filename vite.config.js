import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Default build is portable/local-download friendly.
// For GitHub Pages, build with:
// VITE_BASE=/publish-to-github/ npm run build

export default defineConfig({
  base: process.env.VITE_BASE || './',
  plugins: [react()],
})