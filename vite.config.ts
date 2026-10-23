import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// Versión MAJOR.MINOR.PATCH de package.json (la skill `publicar` sube el PATCH en cada despliegue)
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  base: './',
  define: {
    'import.meta.env.VITE_VERSION': JSON.stringify(version),
  },
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
