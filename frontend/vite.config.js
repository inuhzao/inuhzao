import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/auth':    'http://localhost:3000',
      '/points':  'http://localhost:3000',
      '/shop':    'http://localhost:3000',
      '/coupons': 'http://localhost:3000',
      '/giveaway':'http://localhost:3000',
      '/game':    'http://localhost:3000',
      '/admin':   'http://localhost:3000'
    }
  }
})
