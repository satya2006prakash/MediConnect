import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { mediConnectApiPlugin } from './src/server/apiPlugin.ts'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    mediConnectApiPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },

  },
})
