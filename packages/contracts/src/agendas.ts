import type { LugarId } from './lugares';
import type { NpcView } from './services';
import type { TimeView, Weekday } from './time';

/**
 * Agendas de las personas: dónde está cada una según el día y la hora.
 *
 * Cada persona lleva una lista de TIPOS (alumno, profesor, miembro de un club...). Cada tipo aporta unos tramos de la semana
 * (de tal hora a tal hora, en tal lugar) y la agenda de la persona es la suma de los tramos de todos sus tipos. Si dos tramos
 * coinciden en el tiempo, manda el de mayor NIVEL (el tipo dominante): un compañero de clase que se apunta a tu club sigue
 * yendo a clase, pero en la tarde de entrenamiento está donde entrena el club. Fuera de todo tramo, la persona está «fuera»
 * (en su casa u otro sitio que no está en el mapa), que se escribe `null`.
 *
 * Lo que se guarda por persona es solo la lista de tipos; los tramos se calculan a partir de ellos (y de los datos de los clubes).
 * El azar (a cuál de varios sitios va, si falta ese día) sale de un hash de la persona y el día: no cambia dentro del tramo
 * y no hace falta guardarlo. Los horarios están en `docs/ANEXO_HORARIOS_PNJ.md`.
 */

/** Dónde se puede estar: un lugar del mapa o `null` (fuera del mapa: casa propia, trabajo, otro colegio...). */
export type Sitio = LugarId | null;

/** Quién manda cuando dos tramos coinciden. */
export const NIVEL_AGENDA = {
  /** Lo de siempre (estar fuera). */
  base: 1,
  /** Lo que se es: alumno, profesor, vecino. */
  rol: 2,
  /** Lo que se pertenece: un club, un grupo de amigos, las carreras. */
  pertenencia: 3,
  /** Un acontecimiento: sustituye a todo lo demás mientras dura. */
  evento: 4,
} as const;

export type TipoDeAgenda = 'alumno' | 'profesor' | 'entrenador' | 'club' | 'rival' | 'amigo' | 'vecino';

/** Un tipo asignado a una persona. */
export interface TipoAsignado {
  tipo: TipoDeAgenda;
  /** Club al que se refiere (`club`, `rival` y `entrenador`): un id del catálogo de clubes o el nombre de un club de fuera. */
  club?: string;
  /** Día absoluto hasta el que vale (los acontecimientos); sin él, para siempre. */
  hasta?: number;
  /** Cambia el nivel que le corresponde por defecto (para que un acontecimiento mande sobre el resto). */
  nivel?: number;
}

/** A qué días se aplica un tramo. `lectivo` y `libre` dependen del calendario (colegio abierto o no). */
export type DiasDeTramo = 'todos' | 'lectivo' | 'libre' | readonly Weekday[];

/** Destinos posibles de un tramo con su peso (se elige uno por persona y día). */
export type Destinos = readonly (readonly [Sitio, number])[];

export interface TramoDeAgenda {
  dias: DiasDeTramo;
  /** Minutos del día [desde, hasta). */
  desde: number;
  hasta: number;
  destinos: Destinos;
  /** Probabilidad de acudir ese día (por persona). Si no va, vale el tramo siguiente en nivel. Por defecto 1. */
  asistencia?: number;
  nivel: number;
  /** De qué tipo viene (para enseñarlo y depurarlo); `base` es estar fuera. */
  tipo: TipoDeAgenda | 'base';
}

/** Sesiones de un club: las da el catálogo de clubes (o una regla para los clubes de fuera). */
export interface SesionDeClub {
  weekdays: readonly number[];
  /** Horas del día. */
  desde: number;
  hasta: number;
  sede: Sitio;
}

/** Datos que hacen falta para montar una agenda y que no son de la persona. */
export interface DatosDeAgenda {
  /** Sesiones de un club por su id o nombre; `undefined` si no se conoce. */
  sesionDeClub(club: string): SesionDeClub | undefined;
}

const h = (horas: number, minutos = 0): number => horas * 60 + minutos;
const FUERA = null;
const SABADO: readonly Weekday[] = [5];

/** Lo que hace cualquiera que no esté en ningún otro tramo: estar fuera. */
const BASE: TramoDeAgenda = { dias: 'todos', desde: 0, hasta: 1440, destinos: [[FUERA, 1]], nivel: NIVEL_AGENDA.base, tipo: 'base' };

const tramo = (tipo: TipoDeAgenda, nivel: number, dias: DiasDeTramo, desde: number, hasta: number, destinos: Destinos, asistencia?: number): TramoDeAgenda => ({
  tipo,
  nivel,
  dias,
  desde,
  hasta,
  destinos,
  ...(asistencia === undefined ? {} : { asistencia }),
});

/** Los tramos de las sesiones de un club. */
const sesiones = (tipo: TipoDeAgenda, nivel: number, s: SesionDeClub, asistencia?: number): TramoDeAgenda[] => [
  tramo(tipo, nivel, s.weekdays as readonly Weekday[], h(s.desde), h(s.hasta), [[s.sede, 1]], asistencia),
];

/** Las carreras: los sábados por la mañana, en el estadio. */
const carreras = (tipo: TipoDeAgenda, nivel: number, asistencia?: number): TramoDeAgenda => tramo(tipo, nivel, SABADO, h(9), h(13), [['estadio', 1]], asistencia);

/** Cuántos rivales corren un sábado cualquiera (los demás compiten en otras pruebas o en otros campeonatos) y cuántos van a una sesión de su club. */
export const ASISTENCIA_RIVAL = { carreras: 0.4, sesion: 0.85 };

/**
 * Tramos de un tipo. Es el dato de los horarios (ver el anexo). Los destinos con `FUERA` pesan lo que pesa quedarse en casa.
 */
export function tramosDe(t: TipoAsignado, datos: DatosDeAgenda): TramoDeAgenda[] {
  const nivel = (por: number) => t.nivel ?? por;
  const club = t.club ? datos.sesionDeClub(t.club) : undefined;
  switch (t.tipo) {
    case 'alumno': {
      const n = nivel(NIVEL_AGENDA.rol);
      return [
        // Llega diez minutos antes de que empiecen las clases y se va a las dos (las clases son de 8:00 a 14:00).
        tramo('alumno', n, 'lectivo', h(7, 50), h(14), [['colegio', 1]]),
        tramo('alumno', n, 'lectivo', h(15), h(19), [[FUERA, 60], ['parque', 25], ['supermercado', 10], ['gimnasio', 5]]),
        tramo('alumno', n, 'libre', h(10), h(14), [[FUERA, 50], ['parque', 40], ['supermercado', 10]]),
        tramo('alumno', n, 'libre', h(15), h(20), [[FUERA, 50], ['parque', 40], ['supermercado', 5], ['gimnasio', 5]]),
        tramo('alumno', n, SABADO, h(20), h(22, 30), [[FUERA, 80], ['restaurante', 20]]),
      ];
    }
    case 'profesor':
      // Clases de 8 a 14 y tutorías de 14 a 17.
      return [tramo('profesor', nivel(NIVEL_AGENDA.rol), 'lectivo', h(7, 30), h(17), [['colegio', 1]])];
    case 'entrenador':
      return [...(club ? sesiones('entrenador', nivel(NIVEL_AGENDA.pertenencia), club) : []), carreras('entrenador', nivel(NIVEL_AGENDA.pertenencia))];
    case 'club':
      return club ? sesiones('club', nivel(NIVEL_AGENDA.pertenencia), club) : [];
    case 'rival':
      return [
        ...(club ? sesiones('rival', nivel(NIVEL_AGENDA.pertenencia), club, ASISTENCIA_RIVAL.sesion) : []),
        carreras('rival', nivel(NIVEL_AGENDA.pertenencia), ASISTENCIA_RIVAL.carreras),
      ];
    case 'amigo': {
      const n = nivel(NIVEL_AGENDA.pertenencia);
      return [
        tramo('amigo', n, 'lectivo', h(15), h(19), [[FUERA, 60], ['parque', 40]]),
        tramo('amigo', n, 'libre', h(10), h(14), [[FUERA, 40], ['parque', 60]]),
        tramo('amigo', n, 'libre', h(15), h(20), [[FUERA, 40], ['parque', 60]]),
      ];
    }
    case 'vecino':
      return [tramo('vecino', nivel(NIVEL_AGENDA.rol), 'todos', h(9), h(21), [[FUERA, 50], ['parque', 30], ['supermercado', 15], ['restaurante', 5]])];
  }
}

/** La agenda de una persona: la base más los tramos de sus tipos que siguen valiendo el día `dia`. */
export function construirAgenda(tipos: readonly TipoAsignado[], datos: DatosDeAgenda, dia = 0): TramoDeAgenda[] {
  const vigentes = tipos.filter((t) => t.hasta === undefined || t.hasta >= dia);
  return [BASE, ...vigentes.flatMap((t) => tramosDe(t, datos))];
}

/** Número entre 0 y 1 que sale de las partes dadas y siempre es el mismo para ellas (FNV-1a). Es el azar de las agendas. */
export function azarDe(...partes: (string | number)[]): number {
  let hash = 0x811c9dc5;
  for (const c of partes.join('|')) hash = Math.imul(hash ^ c.charCodeAt(0), 0x01000193);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x2c1b3c6d);
  hash ^= hash >>> 12;
  return ((hash >>> 0) % 1_000_003) / 1_000_003;
}

const vale = (dias: DiasDeTramo, t: TimeView): boolean => (dias === 'todos' ? true : dias === 'lectivo' ? t.isSchoolDay : dias === 'libre' ? !t.isSchoolDay : dias.includes(t.weekday));

export interface Ubicacion {
  sitio: Sitio;
  /** Nivel del tramo que manda ahora. */
  nivel: number;
  tipo: TipoDeAgenda | 'base';
}

/** Dónde está una persona a una hora: el tramo de mayor nivel que vale ahora (a igualdad, el último) y, dentro de él, su destino del día. */
export function ubicacionEn(agenda: readonly TramoDeAgenda[], t: TimeView, persona: string): Ubicacion {
  let mejor = -1;
  for (let i = 0; i < agenda.length; i++) {
    const x = agenda[i];
    if (t.minuteOfDay < x.desde || t.minuteOfDay >= x.hasta || !vale(x.dias, t)) continue;
    if (x.asistencia !== undefined && azarDe(persona, t.day, i, 'va') >= x.asistencia) continue;
    if (mejor < 0 || x.nivel >= agenda[mejor].nivel) mejor = i;
  }
  const x = agenda[mejor];
  const total = x.destinos.reduce((s, [, peso]) => s + peso, 0);
  let tirada = azarDe(persona, t.day, mejor, 'donde') * total;
  for (const [sitio, peso] of x.destinos) {
    tirada -= peso;
    if (tirada < 0) return { sitio, nivel: x.nivel, tipo: x.tipo };
  }
  return { sitio: x.destinos[x.destinos.length - 1][0], nivel: x.nivel, tipo: x.tipo };
}

export interface PresenciaService {
  /**
   * Personas que hay ahora en un lugar. Primero las de mayor nivel (profesores, el club, los amigos) y después las demás en
   * un orden que no cambia mientras dure el tramo; como mucho `max` (por defecto, todas).
   */
  en(lugar: LugarId, max?: number): NpcView[];
  /** Dónde está una persona ahora (`null`: fuera del mapa) o `undefined` si no existe. */
  donde(npcId: string): Sitio | undefined;
  /** Tramos de la semana de una persona. */
  agenda(npcId: string): TramoDeAgenda[];
}
