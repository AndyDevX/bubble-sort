import { actualizarGuardado, getGuardado, type Articulo } from './guardado';

// Catálogo de la tienda. Los precios están pensados para que haya que jugar varios niveles
// por cada compra: un nivel bien resuelto da ~40 monedas al principio y ~100 a partir del 10.
export interface Oferta {
  id: string;
  articulo: Articulo;
  cantidad: number;
  precio: number;
}

export const CATALOGO: readonly Oferta[] = [
  { id: 'deshacer1', articulo: 'deshacer', cantidad: 1, precio: 150 },
  { id: 'deshacer5', articulo: 'deshacer', cantidad: 5, precio: 600 }, // 20 % más barato por unidad
  { id: 'tubo1', articulo: 'tuboExtra', cantidad: 1, precio: 500 },
];

export function cantidadDe(articulo: Articulo): number {
  return getGuardado().inventario[articulo];
}

// Cobra y añade al inventario. Devuelve false (sin cambiar nada) si no llegan las monedas.
export function comprar(oferta: Oferta): boolean {
  const { monedas, inventario } = getGuardado();
  if (monedas < oferta.precio) return false;
  actualizarGuardado({
    monedas: monedas - oferta.precio,
    inventario: { ...inventario, [oferta.articulo]: inventario[oferta.articulo] + oferta.cantidad },
  });
  return true;
}

// Gasta un uso; devuelve false si no quedaba ninguno
export function gastar(articulo: Articulo): boolean {
  const { inventario } = getGuardado();
  if (inventario[articulo] <= 0) return false;
  actualizarGuardado({ inventario: { ...inventario, [articulo]: inventario[articulo] - 1 } });
  return true;
}
