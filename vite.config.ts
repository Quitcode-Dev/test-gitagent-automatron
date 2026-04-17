import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'process.env': {},
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'next/link': path.resolve(__dirname, './src/lib/next/link.tsx'),
      'next/navigation': path.resolve(__dirname, './src/lib/next/navigation.ts'),
    },
  },
})
