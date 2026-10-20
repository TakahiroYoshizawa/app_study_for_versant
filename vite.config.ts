import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Actions が VITE_BASE を /リポジトリ名/ にする。手元の npm run dev は / のまま。
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
})
