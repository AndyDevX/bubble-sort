import { EN_CRAZYGAMES } from '../plataforma';

// Dónde se guarda el progreso del jugador (partida, nivel en curso, ajustes y estadísticas).
// En la web y la app, `localStorage`. En CrazyGames, el Data Module de su SDK, que funciona igual
// que `localStorage` pero guarda en la cuenta del jugador (si ha iniciado sesión) y lo recupera en
// otros dispositivos. El SDK debe estar iniciado antes de leer nada (main.ts espera a
// `iniciarAnuncios` en ese build). Si el SDK no está, se usa `localStorage`.
// Quien llama ya captura los errores (modo privado, almacenamiento lleno…).

interface Almacen {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
  removeItem(clave: string): void;
}

const dataModule = (): Almacen | undefined =>
  (window as unknown as { CrazyGames?: { SDK?: { data?: Almacen } } }).CrazyGames?.SDK?.data;

let almacenCrazyGames: Almacen | null = null;

/** Lo llama `iniciarAnuncios` cuando el SDK de CrazyGames está listo. */
export function usarDataModule(): void {
  if (EN_CRAZYGAMES) almacenCrazyGames = dataModule() ?? null;
}

export const almacen: Almacen = {
  getItem: (clave) => (almacenCrazyGames ?? localStorage).getItem(clave),
  setItem: (clave, valor) => (almacenCrazyGames ?? localStorage).setItem(clave, valor),
  removeItem: (clave) => (almacenCrazyGames ?? localStorage).removeItem(clave),
};
