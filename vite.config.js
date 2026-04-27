import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** @param {string} raw */
function normalizeBase(raw) {
  const s = (raw || '/').trim()
  if (s === '' || s === '/') return '/'
  const withSlash = s.startsWith('/') ? s : `/${s}`
  return withSlash.endsWith('/') ? withSlash : `${withSlash}/`
}

// GitHub project pages live under /<repo>/ (e.g. https://user.github.io/publish-to-github/).
// Build with: VITE_BASE=/your-repo-name/ npm run build
const base = normalizeBase(process.env.VITE_BASE || '/')

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
})
