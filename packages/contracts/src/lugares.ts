import type { ActionDef } from './actions';
import type { ReadContext } from './context';
import { timeView, type TimeView } from './time';

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
  /** Es una zona dentro de otro lugar (la sala de profesores, dentro del colegio): se llega por su lugar, y entrar o salir cuesta unos minutos (`MINUTOS_ENTRE_ZONAS`). */
  dentroDe?: LugarId;
  /**
   * Cuándo está abierto. Sin horario, siempre. Fuera de horario el lugar no desaparece: sale en gris con su horario, y no se puede ir (ni
   * hacer nada que se haga allí).
   */
  horario?: HorarioDeLugar;
}

/** Tramo de apertura: días (`lectivo`: días de clase; `libre`: el resto; `todos`; o días de la semana, 0 = lunes) y minutos del día [desde, hasta). */
export interface TramoDeApertura {
  dias: 'todos' | 'lectivo' | 'libre' | readonly number[];
  desde: number;
  hasta: number;
}

export interface HorarioDeLugar {
  tramos: readonly TramoDeApertura[];
  /** El horario en palabras, para decirlo cuando está cerrado. */
  texto: string;
}

const vale = (dias: TramoDeApertura['dias'], t: TimeView): boolean =>
  dias === 'todos' ? true : dias === 'lectivo' ? t.isSchoolDay : dias === 'libre' ? !t.isSchoolDay : dias.includes(t.weekday);

/** ¿Está abierto el lugar en ese momento? (Sin horario, siempre.) */
export const abiertoEn = (lugar: Pick<LugarDef, 'horario'>, t: TimeView): boolean =>
  !lugar.horario || lugar.horario.tramos.some((x) => vale(x.dias, t) && t.minuteOfDay >= x.desde && t.minuteOfDay < x.hasta);

/** Minutos que cuesta pasar de un lugar a una zona suya (o de una zona a otra de la misma). */
export const MINUTOS_ENTRE_ZONAS = 2;

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

const CIUDAD_BASE: MapaCiudad = {
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

/**
 * Añade zonas dentro de lugares del mapa (la tabla de tiempos se completa sola: de una zona a su lugar, 2 minutos; a cualquier otro sitio, lo
 * que cuesta desde su lugar más los 2 minutos de salir; entre dos zonas del mismo lugar, 4). Cada zona se enlaza solo con su lugar.
 */
export function conZonas(base: MapaCiudad, zonas: readonly LugarDef[]): MapaCiudad {
  const lugares = [...base.lugares, ...zonas];
  const raiz = (id: LugarId): LugarId => zonas.find((z) => z.id === id)?.dentroDe ?? id;
  const tiempos: Record<LugarId, Record<LugarId, number>> = {};
  for (const a of lugares) {
    tiempos[a.id] = {};
    for (const b of lugares) {
      if (a.id === b.id) tiempos[a.id][b.id] = 0;
      else {
        const salidaA = raiz(a.id) === a.id ? 0 : MINUTOS_ENTRE_ZONAS;
        const salidaB = raiz(b.id) === b.id ? 0 : MINUTOS_ENTRE_ZONAS;
        // Una zona y su propio lugar: solo los minutos de entrar; dos zonas del mismo lugar: entrar y salir.
        tiempos[a.id][b.id] = raiz(a.id) === raiz(b.id) ? salidaA + salidaB : (base.tiempos[raiz(a.id)][raiz(b.id)] ?? 0) + salidaA + salidaB;
      }
    }
  }
  return { ...base, lugares, tiempos, directos: [...base.directos, ...zonas.map((z) => [z.dentroDe!, z.id] as const)] };
}

/** Horarios de las zonas con puerta: la administración del colegio y las salas de los clubes del estadio. */
const HORARIO_DE_ADMINISTRACION: HorarioDeLugar = {
  tramos: [
    { dias: 'lectivo', desde: 9 * 60, hasta: 13 * 60 + 30 },
    { dias: 'lectivo', desde: 15 * 60, hasta: 18 * 60 },
  ],
  texto: 'los días de clase, de 9:00 a 13:30 y de 15:00 a 18:00',
};
const HORARIO_DE_SALA_DE_CLUB: HorarioDeLugar = {
  tramos: [
    { dias: [0, 1, 2, 3, 4], desde: 16 * 60, hasta: 21 * 60 },
    { dias: [5], desde: 9 * 60, hasta: 14 * 60 },
  ],
  texto: 'de lunes a viernes de 16:00 a 21:00 y los sábados de 9:00 a 14:00',
};

/** Ciudad de partida. Es un dato: crecerá con la tienda, el aeropuerto... */
export const CIUDAD_INICIAL: MapaCiudad = conZonas(CIUDAD_BASE, [
  { id: 'sala_profesores', name: 'Sala de profesores', descripcion: 'La sala de profesores, dentro del colegio: ahí están los profesores cuando no dan clase (salvo un par que salen al patio en el recreo).', grupo: 'Dentro del colegio', dentroDe: 'colegio' },
  { id: 'administracion', name: 'Administración del colegio', descripcion: 'La secretaría del colegio: aquí te apuntas (o te das de baja) del club del colegio y te cuentan cuándo entrenan y compiten.', grupo: 'Dentro del colegio', dentroDe: 'colegio', horario: HORARIO_DE_ADMINISTRACION },
  { id: 'sala_club_ciudad', name: 'Sala del Club Atletismo Ciudad', descripcion: 'La sala del Club Atletismo Ciudad, en el estadio: aquí pides la prueba de acceso y la inscripción de atletismo.', grupo: 'Dentro del estadio', dentroDe: 'estadio', horario: HORARIO_DE_SALA_DE_CLUB },
  { id: 'sala_club_alto_rendimiento', name: 'Sala del Club de Alto Rendimiento', descripcion: 'La sala del Club de Alto Rendimiento, en el estadio: aquí pides la prueba de acceso y la inscripción de atletismo.', grupo: 'Dentro del estadio', dentroDe: 'estadio', horario: HORARIO_DE_SALA_DE_CLUB },
]);

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

/** Si el lugar está cerrado ahora, el motivo (con su horario); si no, `undefined`. */
export function cerradoAhora(ctx: ReadContext, lugar: Pick<LugarDef, 'name' | 'horario'>): string | undefined {
  return abiertoEn(lugar, ctx.time) ? undefined : `${lugar.name} está cerrado (abre ${lugar.horario!.texto})`;
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
  if (ids.includes(actual.id)) return cerradoAhora(ctx, actual) ?? true;
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
      if (otro !== true) return otro;
      // Si todos los sitios donde se puede hacer están cerrados, no es cuestión de ir: se dice el horario.
      const svc = ctx.service<LugaresService>('lugares');
      const sitios = donde(ctx);
      // Cerrado al llegar: si estás allí, ahora; si no, a la hora a la que llegarías (el viaje también cuesta tiempo).
      const cerradoAlLlegar = (l: LugarDef): string | undefined => {
        const minutos = svc!.actual().id === l.id ? 0 : (svc!.minutosA(l.id) ?? 0);
        return abiertoEn(l, timeView(ctx.time.minute + minutos)) ? undefined : `${l.name} ${minutos ? 'estará cerrado cuando llegues' : 'está cerrado'} (abre ${l.horario!.texto})`;
      };
      const cerrados = svc ? sitios.map((id) => svc.lugar(id)).filter((l): l is LugarDef => !!l).map(cerradoAlLlegar) : [];
      if (sitios.length && cerrados.length === sitios.length && cerrados.every((c) => c !== undefined)) return cerrados[0]!;
      return enLugar(ctx, ...sitios);
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
