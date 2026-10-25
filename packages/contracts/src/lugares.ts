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

export interface MapaCiudad {
  nombre: string;
  /** Donde empieza el personaje (su casa). */
  inicio: LugarId;
  /** La casa del personaje: sitio donde dormir. */
  casa: LugarId;
  lugares: readonly LugarDef[];
  /**
   * Minutos de juego entre cada par de lugares: `tiempos[desde][hasta]`. Es una tabla completa (todos con todos), así no hay
   * que calcular rutas: al añadir un lugar se añade su fila y su columna. Un test comprueba que está completa y es simétrica.
   */
  tiempos: Readonly<Record<LugarId, Readonly<Record<LugarId, number>>>>;
  /** Pares de lugares con camino directo: son los que salen en la lista de «Viajar» de la pantalla del lugar. */
  directos: readonly (readonly [LugarId, LugarId])[];
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
  tiempos: {
    casa: { casa: 0, colegio: 10, parque: 6 },
    colegio: { casa: 10, colegio: 0, parque: 8 },
    parque: { casa: 6, colegio: 8, parque: 0 },
  },
  directos: [
    ['casa', 'colegio'],
    ['casa', 'parque'],
    ['parque', 'colegio'],
  ],
};

/** Minutos de un lugar a otro, o `undefined` si el mapa no lo define. */
export const tiempoEntre = (mapa: MapaCiudad, desde: LugarId, hasta: LugarId): number | undefined => mapa.tiempos[desde]?.[hasta];

/** Lugares con camino directo desde `desde`, con lo que cuesta llegar. */
export function vecinosDe(mapa: MapaCiudad, desde: LugarId): { lugar: LugarId; minutos: number }[] {
  const out: { lugar: LugarId; minutos: number }[] = [];
  for (const [a, b] of mapa.directos) {
    const otro = a === desde ? b : b === desde ? a : undefined;
    const minutos = otro === undefined ? undefined : tiempoEntre(mapa, desde, otro);
    if (otro !== undefined && minutos !== undefined) out.push({ lugar: otro, minutos });
  }
  return out;
}

export interface LugaresService {
  /** Dónde está el personaje. */
  actual(): LugarDef;
  /** Un lugar del mapa, o `undefined` si no existe. */
  lugar(id: LugarId): LugarDef | undefined;
  lugares(): readonly LugarDef[];
  /** Sitios con camino directo desde el actual (la lista de "Viajar" de la pantalla del lugar). */
  vecinos(): { lugar: LugarDef; minutos: number }[];
  /** Minutos desde donde está el personaje hasta otro lugar (lo que cuesta el viaje rápido), o `undefined` si no hay dato. */
  minutosA(hasta: LugarId): number | undefined;
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
