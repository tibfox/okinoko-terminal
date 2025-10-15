import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [preact()],
  server: {
    port: 8082,
 
  allowedHosts: ['.okinoko.io'],

  } 
})
