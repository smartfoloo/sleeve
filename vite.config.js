import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    host: true,          // allows external access
    port: 5173,          // or your desired port
    strictPort: true     // optional, prevents port switching
  }
});