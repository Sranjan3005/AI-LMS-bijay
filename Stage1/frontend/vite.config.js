import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Pin the dev port so the origin never changes on restart — a moving port
    // is a new origin, which drops the localStorage auth token and kicks you
    // back to the login page. strictPort fails loudly instead of hopping.
    port: 5174,
    strictPort: true,
  },
})
