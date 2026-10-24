// Dónde se publica este build. `npm run build` → 'web' (GitHub Pages y la app Android);
// `npm run build:crazygames` → 'crazygames' (portal CrazyGames: su SDK de anuncios, música sin
// derechos de terceros, sin Service Worker). Vite sustituye la constante al compilar, así que el
// código de la otra plataforma (y sus canciones) no entra en el build.
export const PLATAFORMA: 'web' | 'crazygames' = import.meta.env.VITE_PLATAFORMA === 'crazygames' ? 'crazygames' : 'web';
export const EN_CRAZYGAMES = PLATAFORMA === 'crazygames';
