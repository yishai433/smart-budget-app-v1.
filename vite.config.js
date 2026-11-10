import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/smart-budget-app-v1./',
  define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString()) },
})
