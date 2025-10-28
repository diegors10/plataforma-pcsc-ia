import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,          // ✅ permite acesso via IP (ex: 192.168.x.x)
    port: 5173,          // opcional — você pode mudar, se quiser
    strictPort: true,    // opcional — evita mudar de porta automaticamente
  },
})
