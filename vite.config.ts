import { readFileSync, readdirSync, rmSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

// Versión MAJOR.MINOR.PATCH de package.json (la skill `publicar` sube el PATCH en cada despliegue)
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// Build para CrazyGames (`npm run build:crazygames` → dist-crazygames/): carga su SDK de anuncios y
// quita el manifiesto y el Service Worker de la app web instalable (el juego vive en un iframe del portal)
const SDK_CRAZYGAMES = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
const htmlCrazyGames = (): Plugin => ({
  name: 'html-crazygames',
  transformIndexHtml: (html) =>
    html
      .replace(/\s*<link rel="manifest"[^>]*>/, '')
      .replace('</head>', `    <script src="${SDK_CRAZYGAMES}"></script>\n  </head>`),
  // Service Worker y manifiesto (de public/) no sirven en el portal: fuera del paquete
  closeBundle() {
    for (const f of ['sw.js', 'manifest.webmanifest']) rmSync(new URL(`./dist-crazygames/${f}`, import.meta.url), { force: true });
  },
});

// Canciones de las partidas (`virtual:musica`): solo las de la carpeta de la plataforma. Con
// import.meta.glob Vite empaquetaba las dos carpetas aunque el código de una no se usara.
const musica = (carpeta: string): Plugin => ({
  name: 'musica-plataforma',
  resolveId: (id) => (id === 'virtual:musica' ? '\0virtual:musica' : null),
  load(id) {
    if (id !== '\0virtual:musica') return null;
    const dir = new URL(`./src/assets/${carpeta}/`, import.meta.url);
    const archivos = readdirSync(dir).filter((f) => /\.(mp3|ogg|m4a)$/i.test(f)).sort();
    const imports = archivos.map((f, i) => `import p${i} from ${JSON.stringify(new URL(f, dir).pathname + '?url')};`);
    return `${imports.join('\n')}\nexport default [${archivos.map((_, i) => `p${i}`).join(', ')}];\n`;
  },
});

export default defineConfig(({ mode }) => ({
  base: './',
  define: {
    'import.meta.env.VITE_VERSION': JSON.stringify(version),
    'import.meta.env.VITE_PLATAFORMA': JSON.stringify(mode === 'crazygames' ? 'crazygames' : 'web'),
  },
  plugins: mode === 'crazygames' ? [musica('musica-crazygames'), htmlCrazyGames()] : [musica('musica')],
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
    outDir: mode === 'crazygames' ? 'dist-crazygames' : 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
  },
}));
