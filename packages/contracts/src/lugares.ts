import type { ActionDef } from './actions';
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
    { id: 'gimnasio', name: 'Gimnasio', descripcion: 'El gimnasio municipal: sala de pesas, máquinas y una zona de cardio.', grupo: 'Deporte' },
    { id: 'estadio', name: 'Estadio', descripcion: 'El estadio de atletismo: pista, graderías y vestuarios. Aquí compiten los clubes y se celebran las carreras.', grupo: 'Deporte' },
    { id: 'supermercado', name: 'Supermercado', descripcion: 'El supermercado del barrio. Aquí se compra la comida (sin dinero todavía no se puede comprar nada).', grupo: 'Comercio' },
    { id: 'restaurante', name: 'Restaurante', descripcion: 'Un restaurante cerca del supermercado. Por ahora no tienes dinero para comer fuera.', grupo: 'Comercio' },
  ],
  tiempos: {
    casa: { casa: 0, colegio: 10, parque: 6, gimnasio: 13, estadio: 20, supermercado: 8, restaurante: 13 },
    colegio: { casa: 10, colegio: 0, parque: 8, gimnasio: 15, estadio: 10, supermercado: 18, restaurante: 20 },
    parque: { casa: 6, colegio: 8, parque: 0, gimnasio: 7, estadio: 16, supermercado: 14, restaurante: 12 },
    gimnasio: { casa: 13, colegio: 15, parque: 7, gimnasio: 0, estadio: 9, supermercado: 21, restaurante: 19 },
    estadio: { casa: 20, colegio: 10, parque: 16, gimnasio: 9, estadio: 0, supermercado: 28, restaurante: 28 },
    supermercado: { casa: 8, colegio: 18, parque: 14, gimnasio: 21, estadio: 28, supermercado: 0, restaurante: 5 },
    restaurante: { casa: 13, colegio: 20, parque: 12, gimnasio: 19, estadio: 28, supermercado: 5, restaurante: 0 },
  },
  directos: [
    ['casa', 'colegio'],
    ['casa', 'parque'],
    ['parque', 'colegio'],
    ['parque', 'gimnasio'],
    ['colegio', 'estadio'],
    ['gimnasio', 'estadio'],
    ['casa', 'supermercado'],
    ['supermercado', 'restaurante'],
    ['parque', 'restaurante'],
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

/** Principio del motivo que devuelve `enLugar` cuando el personaje no está donde hace falta (los bots y la interfaz lo reconocen). */
export const MOTIVO_LUGAR = 'Tienes que estar en';

/**
 * Para el `available` de una acción ligada a un sitio. Devuelve `true` o el motivo. Si el servicio `lugares` no está
 * cargado, no restringe nada: la acción vale en cualquier parte (un módulo debe funcionar solo con `gen`).
 */
export function enLugar(ctx: ReadContext, ...ids: LugarId[]): true | string {
  const svc = ctx.service<LugaresService>('lugares');
  if (!svc) return true;
  const actual = svc.actual();
  if (ids.includes(actual.id)) return true;
  const nombres = ids.map((id) => svc.lugar(id)?.name.toLowerCase() ?? id);
  return `${MOTIVO_LUGAR} ${nombres.join(' o en ')} (estás en ${actual.name.toLowerCase()})`;
}

/**
 * Liga una acción a uno o varios sitios (el primero es el destino por defecto). Primero se comprueba lo demás (horario, requisitos
 * propios) y por último el lugar: así, si el único motivo de que no esté disponible es dónde estás, solo hace falta viajar.
 * El sitio puede depender del estado (p. ej. el club en el que entrena).
 */
export function conLugar<T extends ActionDef>(lugar: T['lugar'], def: T): T {
  const donde = (ctx: ReadContext): readonly string[] => (typeof lugar === 'function' ? lugar(ctx) : (lugar ?? []));
  return {
    ...def,
    lugar,
    available: (ctx: ReadContext) => {
      const otro = def.available?.(ctx) ?? true;
      return otro !== true ? otro : enLugar(ctx, ...donde(ctx));
    },
  };
}

/** ¿Lo único que impide hacer esta opción es no estar en el sitio? Entonces basta con viajar antes. */
export const faltaViajar = (o: { available: boolean; reason?: string; lugar?: readonly string[] }): boolean =>
  !o.available && !!o.lugar?.length && !!o.reason?.startsWith(MOTIVO_LUGAR);

/**
 * Liga varias acciones de un módulo a sus sitios de una vez: `{ 'gen.dormir': ['casa'] }`. Las que no salen en la tabla quedan
 * como estaban (valen en cualquier parte). Falla si la tabla nombra una acción que no existe, para que un cambio de id no la deje sin ligar.
 */
export function ligarALugares(acciones: readonly ActionDef[], donde: Readonly<Record<string, NonNullable<ActionDef['lugar']>>>): ActionDef[] {
  const ids = new Set(acciones.map((a) => a.id));
  for (const id of Object.keys(donde)) if (!ids.has(id)) throw new Error(`ligarALugares: no existe la acción ${id}`);
  return acciones.map((a) => (donde[a.id] ? conLugar(donde[a.id], a) : a));
}
