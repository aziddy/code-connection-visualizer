import { defineConfig } from 'vite'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ],
  root: './src',
  build: {
    outDir: '../dist',
    rollupOptions: {
      input: {
        main: './src/index.html'
      }
    }
  },
  server: {
    open: true,
    port: 3000
  }
})