import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173,
    strictPort: true, // siempre 5173: así el túnel de `npm run compartir` no se queda apuntando a otro puerto
    allowedHosts: ['.trycloudflare.com'], // permite abrir el juego por el túnel de Cloudflare
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: ['.trycloudflare.com'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
  },
});
