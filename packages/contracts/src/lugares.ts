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
  /** Es una zona dentro de otro lugar (el aula o la sala de profesores, dentro del colegio): se llega por su lugar, y entrar o salir cuesta unos minutos (`MINUTOS_ENTRE_ZONAS`). Nunca se llega a ella con el viaje rápido. */
  dentroDe?: LugarId;
  /** Es una calle: no se hace nada en ella; comunica con otras calles y da a sus lugares. */
  calle?: boolean;
  /** La calle a la que da este lugar (su entrada). */
  enCalle?: LugarId;
  /** Minutos entre su calle y su entrada (por defecto 1). */
  minutosDeCalle?: number;
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

/** Minutos que cuesta pasar de un lugar a una zona suya (o de una zona a su lugar). */
export const MINUTOS_ENTRE_ZONAS = 2;

/**
 * El mapa es un grafo: **calles** (no se hace nada en ellas: solo se va de una a otra y se entra en sus lugares), **lugares** (con su
 * entrada a una calle) y **zonas** dentro de los lugares (el aula, la sala de profesores...). Un lugar se alcanza desde su calle y una zona,
 * desde la entrada de su lugar. El viaje rápido salta a cualquier lugar (nunca a una zona ni a una calle) y cuesta lo mismo que el camino.
 */
export interface MapaCiudad {
  nombre: string;
  /** Donde empieza el personaje (su casa). */
  inicio: LugarId;
  /** La casa del personaje: sitio donde dormir. */
  casa: LugarId;
  /** Calles, lugares y zonas. */
  lugares: readonly LugarDef[];
  /** Minutos entre cada par de sitios: `tiempos[desde][hasta]`. Tabla completa (se calcula con los caminos del mapa), así no hay que buscar rutas al viajar. */
  tiempos: Readonly<Record<LugarId, Readonly<Record<LugarId, number>>>>;
  /** Calles que se comunican, con los minutos entre ellas. */
  entreCalles: readonly (readonly [LugarId, LugarId, number])[];
}

/** Qué es cada sitio del mapa. */
export type TipoDeSitio = 'calle' | 'lugar' | 'zona';
export const tipoDeSitio = (l: Pick<LugarDef, 'calle' | 'dentroDe'>): TipoDeSitio => (l.calle ? 'calle' : l.dentroDe ? 'zona' : 'lugar');

const CALLES: readonly LugarDef[] = [
  { id: 'calle_casa', name: 'Calle de tu casa', descripcion: 'Tu calle: da a tu casa, al supermercado y al restaurante. Desde aquí se va a otras calles.', grupo: 'Calles', calle: true },
  { id: 'calle_colegio', name: 'Calle del colegio', descripcion: 'La calle del colegio. Desde aquí se va a otras calles.', grupo: 'Calles', calle: true },
  { id: 'avenida_parque', name: 'Avenida del Parque', descripcion: 'Una avenida con el parque y el gimnasio municipal. Desde aquí se va a otras calles.', grupo: 'Calles', calle: true },
  { id: 'avenida_estadio', name: 'Avenida del Estadio', descripcion: 'La avenida del estadio de atletismo. Desde aquí se va a otras calles.', grupo: 'Calles', calle: true },
];

const LUGARES_DE_CALLE: readonly LugarDef[] = [
  { id: 'casa', name: 'Casa', descripcion: 'Tu edificio. Aquí vives con tu familia.', grupo: 'Vivienda', enCalle: 'calle_casa', minutosDeCalle: 1 },
  { id: 'colegio', name: 'Colegio', descripcion: 'La entrada del colegio: el patio y las pistas. Desde aquí se va a las aulas y a las salas.', grupo: 'Estudios', enCalle: 'calle_colegio', minutosDeCalle: 1 },
  { id: 'parque', name: 'Parque', descripcion: 'Un parque con árboles, bancos y espacio para correr.', grupo: 'Ocio', enCalle: 'avenida_parque', minutosDeCalle: 1 },
  { id: 'gimnasio', name: 'Gimnasio', descripcion: 'El gimnasio municipal: sala de pesas, máquinas y una zona de cardio.', grupo: 'Deporte', enCalle: 'avenida_parque', minutosDeCalle: 5 },
  { id: 'estadio', name: 'Estadio', descripcion: 'El estadio de atletismo: pista, graderías y vestuarios. Aquí compiten los clubes y se celebran las carreras.', grupo: 'Deporte', enCalle: 'avenida_estadio', minutosDeCalle: 3 },
  { id: 'supermercado', name: 'Supermercado', descripcion: 'El supermercado del barrio. Aquí se compra la comida (sin dinero todavía no se puede comprar nada).', grupo: 'Comercio', enCalle: 'calle_casa', minutosDeCalle: 4 },
  { id: 'restaurante', name: 'Restaurante', descripcion: 'Un restaurante cerca del supermercado. Por ahora no tienes dinero para comer fuera.', grupo: 'Comercio', enCalle: 'calle_casa', minutosDeCalle: 4 },
];

const ENTRE_CALLES: MapaCiudad['entreCalles'] = [
  ['calle_casa', 'calle_colegio', 8],
  ['calle_casa', 'avenida_parque', 4],
  ['calle_colegio', 'avenida_parque', 6],
  ['calle_colegio', 'avenida_estadio', 6],
  ['avenida_parque', 'avenida_estadio', 6],
];

/**
 * Arma el mapa: calcula la tabla de tiempos (caminos más cortos entre todos los sitios) a partir de los caminos: lugar ↔ su calle,
 * calle ↔ calle y zona ↔ su lugar (2 minutos).
 */
export function construirMapa(base: Pick<MapaCiudad, 'nombre' | 'inicio' | 'casa'>, lugares: readonly LugarDef[], entreCalles: MapaCiudad['entreCalles']): MapaCiudad {
  const aristas: [LugarId, LugarId, number][] = [...entreCalles.map(([a, b, m]) => [a, b, m] as [LugarId, LugarId, number])];
  for (const l of lugares) {
    if (l.enCalle) aristas.push([l.id, l.enCalle, l.minutosDeCalle ?? 1]);
    if (l.dentroDe) aristas.push([l.id, l.dentroDe, MINUTOS_ENTRE_ZONAS]);
  }
  const ids = lugares.map((l) => l.id);
  const tiempos: Record<LugarId, Record<LugarId, number>> = {};
  for (const a of ids) {
    // Dijkstra sencillo (el mapa es pequeño).
    const dist: Record<LugarId, number> = Object.fromEntries(ids.map((i) => [i, Infinity]));
    dist[a] = 0;
    const pendientes = new Set(ids);
    while (pendientes.size) {
      let u: LugarId | undefined;
      for (const i of pendientes) if (u === undefined || dist[i] < dist[u]) u = i;
      pendientes.delete(u!);
      for (const [x, y, m] of aristas) {
        const v = x === u ? y : y === u ? x : undefined;
        if (v !== undefined && dist[u!] + m < dist[v]) dist[v] = dist[u!] + m;
      }
    }
    tiempos[a] = dist;
  }
  return { ...base, lugares, tiempos, entreCalles };
}

/** Horarios de las zonas con puerta: la administración del colegio y las salas de los clubes del estadio. */
const HORARIO_DE_ADMINISTRACION: HorarioDeLugar = {
  tramos: [
    { dias: 'lectivo', desde: 9 * 60, hasta: 13 * 60 + 30 },
    { dias: 'lectivo', desde: 15 * 60, hasta: 18 * 60 },
  ],
  texto: 'los días de clase, de 9:00 a 13:30 y de 15:00 a 18:00',
};
/** El aula está abierta desde 10 minutos antes de cada clase (7:50 y 11:10 al volver del recreo) hasta el recreo y hasta el final de la jornada. */
const HORARIO_DEL_AULA: HorarioDeLugar = {
  tramos: [
    { dias: 'lectivo', desde: 8 * 60 - 10, hasta: 10 * 60 + 40 },
    { dias: 'lectivo', desde: 11 * 60 + 20 - 10, hasta: 14 * 60 },
  ],
  texto: 'los días de clase, desde 10 minutos antes de cada clase (7:50 y 11:10) hasta el recreo y hasta las 14:00',
};
const HORARIO_DE_SALA_DE_CLUB: HorarioDeLugar = {
  tramos: [
    { dias: [0, 1, 2, 3, 4], desde: 16 * 60, hasta: 21 * 60 },
    { dias: [5], desde: 9 * 60, hasta: 14 * 60 },
  ],
  texto: 'de lunes a viernes de 16:00 a 21:00 y los sábados de 9:00 a 14:00',
};

const ZONAS: readonly LugarDef[] = [
  { id: 'pista_colegio', name: 'Pista de atletismo del colegio', descripcion: 'La pista de atletismo del colegio: aquí entrena el club del colegio y se puede correr por tu cuenta. Los miembros del club están 10 minutos antes de cada sesión.', grupo: 'Dentro del colegio', dentroDe: 'colegio' },
  { id: 'aula', name: 'Tu aula', descripcion: 'El aula de tu clase: aquí das clase con tus compañeros y el profesor. Se abre 10 minutos antes de cada clase.', grupo: 'Dentro del colegio', dentroDe: 'colegio', horario: HORARIO_DEL_AULA },
  { id: 'sala_profesores', name: 'Sala de profesores', descripcion: 'La sala de profesores, dentro del colegio: ahí están los profesores cuando no dan clase (salvo un par que salen al patio en el recreo).', grupo: 'Dentro del colegio', dentroDe: 'colegio' },
  { id: 'administracion', name: 'Administración del colegio', descripcion: 'La secretaría del colegio: aquí te apuntas (o te das de baja) del club del colegio y te cuentan cuándo entrenan y compiten.', grupo: 'Dentro del colegio', dentroDe: 'colegio', horario: HORARIO_DE_ADMINISTRACION },
  { id: 'sala_club_ciudad', name: 'Sala del Club Atletismo Ciudad', descripcion: 'La sala del Club Atletismo Ciudad, en el estadio: aquí pides la prueba de acceso y la inscripción de atletismo.', grupo: 'Dentro del estadio', dentroDe: 'estadio', horario: HORARIO_DE_SALA_DE_CLUB },
  { id: 'sala_club_alto_rendimiento', name: 'Sala del Club de Alto Rendimiento', descripcion: 'La sala del Club de Alto Rendimiento, en el estadio: aquí pides la prueba de acceso y la inscripción de atletismo.', grupo: 'Dentro del estadio', dentroDe: 'estadio', horario: HORARIO_DE_SALA_DE_CLUB },
];

/** Ciudad de partida. Es un dato: crecerá con la tienda, el aeropuerto... */
export const CIUDAD_INICIAL: MapaCiudad = construirMapa({ nombre: 'Ciudad', inicio: 'casa', casa: 'casa' }, [...CALLES, ...LUGARES_DE_CALLE, ...ZONAS], ENTRE_CALLES);

/** Minutos de un lugar a otro, o `undefined` si el mapa no lo define. */
export const tiempoEntre = (mapa: MapaCiudad, desde: LugarId, hasta: LugarId): number | undefined => mapa.tiempos[desde]?.[hasta];

/** Qué clase de paso es: entrar en una zona, volver a la entrada del lugar, salir a la calle, ir a otra calle o entrar en un lugar de la calle. */
export type TipoDePaso = 'dentro' | 'entrada' | 'calle' | 'otra_calle' | 'lugar';
export interface Paso {
  lugar: LugarId;
  minutos: number;
  tipo: TipoDePaso;
}

/** Los pasos que se dan desde `desde` sin viaje rápido: según dónde estés, las zonas, la calle, los lugares de la calle o las calles vecinas. */
export function pasosDesde(mapa: MapaCiudad, desde: LugarId): Paso[] {
  const aqui = mapa.lugares.find((l) => l.id === desde);
  if (!aqui) return [];
  const minutos = (a: LugarId) => tiempoEntre(mapa, desde, a) ?? 1;
  if (aqui.calle) {
    return [
      ...mapa.lugares.filter((l) => l.enCalle === desde).map((l): Paso => ({ lugar: l.id, minutos: minutos(l.id), tipo: 'lugar' })),
      ...mapa.entreCalles.flatMap(([a, b]) => (a === desde ? [b] : b === desde ? [a] : [])).map((c): Paso => ({ lugar: c, minutos: minutos(c), tipo: 'otra_calle' })),
    ];
  }
  if (aqui.dentroDe) return [{ lugar: aqui.dentroDe, minutos: minutos(aqui.dentroDe), tipo: 'entrada' }];
  return [
    ...mapa.lugares.filter((l) => l.dentroDe === desde).map((l): Paso => ({ lugar: l.id, minutos: minutos(l.id), tipo: 'dentro' })),
    ...(aqui.enCalle ? [{ lugar: aqui.enCalle, minutos: minutos(aqui.enCalle), tipo: 'calle' as const }] : []),
  ];
}

/**
 * ¿Se puede ir de `desde` a `hasta` ahora mismo? Los lugares, desde cualquier parte (viaje rápido); las zonas, solo desde la entrada
 * de su lugar; las calles, solo desde sus lugares o desde una calle vecina.
 */
export const sePuedeIr = (mapa: MapaCiudad, desde: LugarId, hasta: LugarId): boolean => {
  const destino = mapa.lugares.find((l) => l.id === hasta);
  if (!destino || desde === hasta) return false;
  return tipoDeSitio(destino) === 'lugar' || pasosDesde(mapa, desde).some((p) => p.lugar === hasta);
};

/**
 * Los destinos (en orden) que hay que pisar para llegar a `hasta` sin saltarse las reglas del mapa: un lugar, directo (viaje rápido); una
 * zona, primero la entrada de su lugar (si no se está ya en él o en otra zona suya) y luego la zona; una calle, desde un lugar suyo o vecino.
 * Para los bots y los tests, que no piensan en el mapa; el jugador va paso a paso.
 */
export function rutaA(mapa: MapaCiudad, desde: LugarId, hasta: LugarId): LugarId[] {
  const destino = mapa.lugares.find((l) => l.id === hasta);
  if (!destino || desde === hasta) return [];
  if (sePuedeIr(mapa, desde, hasta)) return [hasta];
  if (destino.dentroDe) return [destino.dentroDe, hasta];
  if (destino.calle) {
    // Primero a un lugar de esa calle (así queda a un paso) y luego a la calle.
    const lugar = mapa.lugares.find((l) => l.enCalle === hasta);
    return lugar ? [lugar.id, hasta] : [];
  }
  return [hasta];
}

export interface LugaresService {
  /** Dónde está el personaje. */
  actual(): LugarDef;
  /** Un lugar del mapa, o `undefined` si no existe. */
  lugar(id: LugarId): LugarDef | undefined;
  lugares(): readonly LugarDef[];
  /** Los pasos que se pueden dar desde el sitio actual (la lista de «Viajar» de la pantalla del lugar): zonas, calle, lugares de la calle o calles vecinas. */
  pasos(): { lugar: LugarDef; minutos: number; tipo: TipoDePaso }[];
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
