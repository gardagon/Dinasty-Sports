import type { ReadContext } from './context';

/**
 * Lugares y desplazamientos. El mapa es un DATO por ciudad (como `CalendarioPais`): lugares y caminos con su
 * duración en minutos. El módulo `lugares` guarda dónde está el personaje y publica el servicio `lugares`;
 * quien quiera ligar una acción a un sitio usa `enLugar` en su `available`, sin importar ese módulo.
 */

export type LugarId = string;

export interface LugarDef {
  id: LugarId;
  name: string;
  /** Texto de la pantalla del lugar, visto desde fuera (antes de entrar). */
  descripcion: string;
  /** Agrupa los destinos en el menú de viaje ("Vivienda", "Estudios", "Ocio"...). */
  grupo: string;
}

/** Camino en ambos sentidos entre dos lugares. */
export interface CaminoDef {
  a: LugarId;
  b: LugarId;
  /** Minutos de juego andando. */
  minutos: number;
}

export interface MapaCiudad {
  nombre: string;
  /** Donde empieza el personaje (su casa). */
  inicio: LugarId;
  /** La casa del personaje: sitio donde dormir. */
  casa: LugarId;
  lugares: readonly LugarDef[];
  caminos: readonly CaminoDef[];
}

/** Ciudad de partida. Es un dato: crecerá con el estadio, el gimnasio, la tienda, el aeropuerto... */
export const CIUDAD_INICIAL: MapaCiudad = {
  nombre: 'Ciudad',
  inicio: 'casa',
  casa: 'casa',
  lugares: [
    { id: 'casa', name: 'Casa', descripcion: 'Tu edificio. Aquí vives con tu familia.', grupo: 'Vivienda' },
    { id: 'colegio', name: 'Colegio', descripcion: 'El colegio: aulas, patio y pistas.', grupo: 'Estudios' },
    { id: 'parque', name: 'Parque', descripcion: 'Un parque con árboles, bancos y espacio para correr.', grupo: 'Ocio' },
  ],
  caminos: [
    { a: 'casa', b: 'colegio', minutos: 10 },
    { a: 'casa', b: 'parque', minutos: 6 },
    { a: 'parque', b: 'colegio', minutos: 8 },
  ],
};

export interface Ruta {
  /** Lugares por los que se pasa, incluidos el de salida y el de llegada. */
  pasos: LugarId[];
  minutos: number;
}

/** Lugares a un solo camino de `desde`, con lo que cuesta llegar. */
export function vecinosDe(mapa: MapaCiudad, desde: LugarId): { lugar: LugarId; minutos: number }[] {
  const out: { lugar: LugarId; minutos: number }[] = [];
  for (const c of mapa.caminos) {
    if (c.a === desde) out.push({ lugar: c.b, minutos: c.minutos });
    else if (c.b === desde) out.push({ lugar: c.a, minutos: c.minutos });
  }
  return out;
}

/** Ruta más corta entre dos lugares (Dijkstra; el mapa es pequeño). `null` si no hay camino. */
export function rutaMasCorta(mapa: MapaCiudad, desde: LugarId, hasta: LugarId): Ruta | null {
  const coste = new Map<LugarId, number>([[desde, 0]]);
  const previo = new Map<LugarId, LugarId>();
  const pendientes = new Set<LugarId>([desde]);
  while (pendientes.size > 0) {
    let actual: LugarId | undefined;
    for (const p of pendientes) if (actual === undefined || coste.get(p)! < coste.get(actual)!) actual = p;
    if (actual === undefined) break;
    pendientes.delete(actual);
    if (actual === hasta) break;
    for (const v of vecinosDe(mapa, actual)) {
      const nuevo = coste.get(actual)! + v.minutos;
      if (nuevo < (coste.get(v.lugar) ?? Infinity)) {
        coste.set(v.lugar, nuevo);
        previo.set(v.lugar, actual);
        pendientes.add(v.lugar);
      }
    }
  }
  if (!coste.has(hasta)) return null;
  const pasos: LugarId[] = [hasta];
  while (pasos[0] !== desde) pasos.unshift(previo.get(pasos[0])!);
  return { pasos, minutos: coste.get(hasta)! };
}

export interface LugaresService {
  /** Dónde está el personaje. */
  actual(): LugarDef;
  /** Un lugar del mapa, o `undefined` si no existe. */
  lugar(id: LugarId): LugarDef | undefined;
  lugares(): readonly LugarDef[];
  /** Sitios a un camino del actual (la lista de "Viajar" de la pantalla del lugar). */
  vecinos(): { lugar: LugarDef; minutos: number }[];
  /** Ruta más corta desde donde está el personaje (el viaje rápido cuesta lo que ella). */
  ruta(hasta: LugarId): Ruta | null;
  /** La casa del personaje. */
  casa(): LugarDef;
}

/** Evento que emite `lugares` al llegar a un sitio. */
export const LUGARES_EVENTS = {
  /** data: LlegadaData */
  LLEGADA: 'lugares.llegada',
} as const;

export interface LlegadaData {
  desde: LugarId;
  hasta: LugarId;
  minutos: number;
}

/**
 * Para el `available` de una acción ligada a un sitio. Devuelve `true` o el motivo. Si el servicio `lugares` no está
 * cargado, no restringe nada: la acción vale en cualquier parte (un módulo debe funcionar solo con `gen`).
 */
export function enLugar(ctx: ReadContext, ...ids: LugarId[]): true | string {
  const svc = ctx.service<LugaresService>('lugares');
  if (!svc) return true;
  const actual = svc.actual();
  if (ids.includes(actual.id)) return true;
  const destino = svc.lugar(ids[0]);
  return `Tienes que estar en ${destino ? destino.name.toLowerCase() : ids[0]} (estás en ${actual.name.toLowerCase()})`;
}
