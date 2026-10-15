import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served by GitHub Pages at https://nknysh.github.io/cmc-tests/app/.
export default defineConfig({
  base: '/cmc-tests/app/',
  plugins: [react()],
})
