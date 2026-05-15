import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Mengizinkan akses dari URL tunnel Cloudflare (penting untuk Vite versi terbaru)
    allowedHosts: true, 
    // Memastikan server mendengarkan pada semua interface jika diperlukan
    host: true,
    // Agar Hot Module Replacement (HMR) berjalan lancar melalui tunnel
    hmr: {
      clientPort: 443,
    },
  },
})