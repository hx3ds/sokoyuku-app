import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  server: {
    host: 'localhost',
    allowedHosts: ['app.sokoyuku.com', 'appd.sokoyuku.com', 'apps.sokoyuku.com'],
//  port: 28880,
    port: 8880, // Specify your desired port here
    strictPort: true, // Optional: Exit if the port is already in use
  },
})
