import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // em `npm run dev`, as chamadas /api vão pro Worker rodando com `wrangler dev` (porta 8787)
    proxy: { '/api': `http://localhost:${process.env.API_PORT ?? 8787}` },
  },
})
