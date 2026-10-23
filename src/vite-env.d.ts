// Variables que Vite inyecta al compilar (las pone el workflow de GitHub Pages)
declare global {
  interface ImportMetaEnv {
    readonly VITE_NUMERO_BUILD?: string; // número de despliegue (github.run_number)
    readonly VITE_COMMIT?: string; // commit desplegado (github.sha)
  }
}

export {};
