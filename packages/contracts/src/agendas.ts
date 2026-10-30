import type { JornadaDeCompeticion } from './deporte-datos';
import type { LugarId } from './lugares';
import type { NpcView } from './services';
import { HUECO_ENTRE_CLASES, JORNADA_ESCOLAR, MINUTOS_ANTES_DE_CLASE, type TimeView, type Weekday } from './time';

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

/** Cuánta gente ves a la vez en un lugar (como en el juego de referencia): con cientos en el colegio, solo estas son las que tienes cerca y con las que puedes hablar. */
export const GENTE_CERCANA = 40;
/** Cuánto varía la gente que ves a la vez: ±15 % (de 34 a 46 personas). Cambia con cada cambio de tramo, no a cada minuto. */
export const VARIACION_DE_GENTE_CERCANA = 0.15;

/** Cuánta gente tienes cerca en un lugar ahora: en torno a 40, entre un 15 % menos y un 15 % más, estable mientras no cambie la presencia (`clave`). */
export function aforoCercano(lugar: string, clave: string | number): number {
  return Math.round(GENTE_CERCANA * (1 - VARIACION_DE_GENTE_CERCANA + 2 * VARIACION_DE_GENTE_CERCANA * azarDe('aforo', lugar, clave)));
}

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

export type TipoDeAgenda = 'alumno' | 'profesor' | 'entrenador' | 'club' | 'rival' | 'amigo' | 'vecino' | 'hermano' | 'progenitor' | 'bibliotecario';

/** Un tipo asignado a una persona. */
export interface TipoAsignado {
  tipo: TipoDeAgenda;
  /** Club al que se refiere (`club`, `rival` y `entrenador`): un id del catálogo de clubes o el nombre de un club de fuera. */
  club?: string;
  /** Día absoluto hasta el que vale (los acontecimientos); sin él, para siempre. */
  hasta?: number;
  /** Cambia el nivel que le corresponde por defecto (para que un acontecimiento mande sobre el resto). */
  nivel?: number;
  /** `alumno`: es de tu clase (tus compañeros): está en tu aula desde 10 minutos antes de cada clase y se les puede hablar allí fuera de clase; los demás alumnos están en sus aulas (ocupados). */
  tuClase?: boolean;
  /** `hermano`: está en edad de colegio (va a clase como un alumno). */
  escolar?: boolean;
  /** `hermano`: practica atletismo (corre los sábados en el estadio). */
  deporte?: boolean;
  /** `bibliotecario`: el turno de mañana (hasta las 14:30, y los sábados) o el de tarde (desde las 14:30). */
  turno?: 'manana' | 'tarde';
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
  /**
   * Intervalos [desde, hasta) del tramo en los que la persona está **ocupada** (en clase, en una carrera o una sesión del club):
   * sigue en su agenda, pero no se puede hablar con ella, así que cuenta como fuera del mapa. El resto del tramo (llegar, el recreo,
   * quedarse un rato al acabar) está en el sitio y se le puede hablar.
   */
  ocupado?: readonly (readonly [number, number])[];
  /**
   * Por qué está ocupado («atendiendo en clase», «durmiendo»). Con esto, mientras está ocupado **sigue en el sitio** (el tramo debe tener un solo
   * destino): se le ve allí, con ese estado, pero no se puede hablar con él. Sin esto, ocupado es estar fuera del mapa.
   */
  motivoOcupado?: string;
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
  /** Cuándo y dónde se compite cada semana (la jornada que da el deporte, ver `JornadaDeCompeticion`); `undefined` si no hay ninguna (sin deportes). */
  jornada(): JornadaDeCompeticion | undefined;
}

const h = (horas: number, minutos = 0): number => horas * 60 + minutos;
const FUERA = null;
const SABADO: readonly Weekday[] = [5];

/** Lo que hace cualquiera que no esté en ningún otro tramo: estar fuera. */
const BASE: TramoDeAgenda = { dias: 'todos', desde: 0, hasta: 1440, destinos: [[FUERA, 1]], nivel: NIVEL_AGENDA.base, tipo: 'base' };

const tramo = (tipo: TipoDeAgenda, nivel: number, dias: DiasDeTramo, desde: number, hasta: number, destinos: Destinos, asistencia?: number, ocupado?: TramoDeAgenda['ocupado'], motivoOcupado?: string): TramoDeAgenda => ({
  tipo,
  nivel,
  dias,
  desde,
  hasta,
  destinos,
  ...(asistencia === undefined ? {} : { asistencia }),
  ...(ocupado ? { ocupado } : {}),
  ...(motivoOcupado ? { motivoOcupado } : {}),
});

/** Minutos antes de empezar y después de acabar una sesión o una carrera en los que se está en el sitio sin estar ocupado. */
export const MARGEN_DE_SESION = 15;
/** Los miembros de un club ya están en su pista 10 minutos antes de la sesión (desde entonces se puede entrar a entrenar). */
export const MARGEN_ANTES_DE_SESION = 10;
/** Minutos antes de la primera clase que alumnos y profesores ya están en el colegio (desde las 7:30). */
export const LLEGADA_AL_COLEGIO = 30;
const [RECREO_DESDE, RECREO_HASTA] = JORNADA_ESCOLAR.recreo;
const PRIMERA_CLASE = JORNADA_ESCOLAR.clases[0][0];
/** Fin de la jornada (las 14:00): la última clase acaba 5 minutos antes. */
const FIN_DE_CLASES = JORNADA_ESCOLAR.clases[JORNADA_ESCOLAR.clases.length - 1][1] + HUECO_ENTRE_CLASES;
/** Minutos antes de cada clase en que los alumnos dejan el patio y se van a sus aulas (a las 7:50 la entrada se vacía; también a las 11:10 al volver del recreo). */
const ENTRADA_A_AULA = MINUTOS_ANTES_DE_CLASE;
/** Lo que se dice de quien está en el aula durante una clase: está, pero no se le puede hablar. */
const EN_CLASE_ATENDIENDO = 'atendiendo en clase';
/** Las clases una a una. */
const CLASES = JORNADA_ESCOLAR.clases as readonly (readonly [number, number])[];
/** Las horas en que alumnos y profesores no están en el patio: en el aula (de 7:50 al recreo y de 11:10 al final). */
const EN_CLASE = [[PRIMERA_CLASE - ENTRADA_A_AULA, RECREO_DESDE], [RECREO_HASTA - ENTRADA_A_AULA, FIN_DE_CLASES]] as const;
/**
 * El tramo de ir al colegio. Llegan a las 7:30 a la entrada (`colegio`); a las 7:50 se van a clase, y en el recreo (10:40–11:10) están
 * en el **patio** (zona `patio`); a las 11:10, al volver del recreo, se van otra vez a clase. Los de tu clase (`tuClase`) están en **el aula** (zona `aula`) y solo están ocupados en clase: en los 5 minutos de entre clase y
 * clase y antes de empezar se les puede hablar allí. Los de otras clases están en sus aulas (fuera del mapa) y no se les puede hablar.
 */
const colegio = (tipo: TipoDeAgenda, nivel: number, tuClase = false): TramoDeAgenda[] => {
  const [clase1, clase2, clase3, clase4] = CLASES;
  const llegada = PRIMERA_CLASE - LLEGADA_AL_COLEGIO;
  if (!tuClase) {
    // Los de otras clases: en la entrada al llegar y en el patio en el recreo; el resto del tiempo están en sus aulas (ocupados, fuera del mapa).
    return [
      tramo(tipo, nivel, 'lectivo', llegada, EN_CLASE[0][0], [['colegio', 1]]),
      tramo(tipo, nivel, 'lectivo', EN_CLASE[0][0], RECREO_DESDE, [['colegio', 1]], undefined, [[EN_CLASE[0][0], RECREO_DESDE]]),
      tramo(tipo, nivel, 'lectivo', RECREO_DESDE, EN_CLASE[1][0], [['patio', 1]]),
      tramo(tipo, nivel, 'lectivo', EN_CLASE[1][0], FIN_DE_CLASES, [['colegio', 1]], undefined, [[EN_CLASE[1][0], FIN_DE_CLASES]]),
    ];
  }
  return [
    tramo(tipo, nivel, 'lectivo', llegada, EN_CLASE[0][0], [['colegio', 1]]),
    tramo(tipo, nivel, 'lectivo', EN_CLASE[0][0], RECREO_DESDE, [['aula', 1]], undefined, [clase1, clase2], EN_CLASE_ATENDIENDO),
    tramo(tipo, nivel, 'lectivo', RECREO_DESDE, EN_CLASE[1][0], [['patio', 1]]),
    tramo(tipo, nivel, 'lectivo', EN_CLASE[1][0], FIN_DE_CLASES, [['aula', 1]], undefined, [clase3, clase4], EN_CLASE_ATENDIENDO),
  ];
};

/** Los tramos de las sesiones de un club. */
const sesiones = (tipo: TipoDeAgenda, nivel: number, s: SesionDeClub, asistencia?: number): TramoDeAgenda[] => [
  tramo(tipo, nivel, s.weekdays as readonly Weekday[], h(s.desde) - MARGEN_ANTES_DE_SESION, h(s.hasta) + MARGEN_DE_SESION, [[s.sede, 1]], asistencia, [[h(s.desde), h(s.hasta)]]),
];

/** La jornada de competición de cada semana (en el atletismo, las carreras: los sábados por la mañana, en el estadio), si el deporte da una. */
const carreras = (tipo: TipoDeAgenda, nivel: number, datos: DatosDeAgenda, asistencia?: number): TramoDeAgenda[] => {
  const j = datos.jornada();
  return j ? [tramo(tipo, nivel, j.dias as readonly Weekday[], h(j.desde) - MARGEN_DE_SESION, h(j.hasta) + MARGEN_DE_SESION, [[j.lugar, 1]], asistencia, [[h(j.desde), h(j.hasta)]])] : [];
};

/** Cuántos rivales corren un sábado cualquiera (los demás compiten en otras pruebas o en otros campeonatos) y cuántos van a una sesión de su club. */
export const ASISTENCIA_RIVAL = { carreras: 0.4, sesion: 0.85 };

/** Cuándo se puede ir a cada sitio (de las 9:00 a las 21:00), con su peso. Todo cabe dentro de su horario de apertura (`lugares.ts`). */
const VISITAS_DE_VECINOS: readonly { sitio: string; peso: number; dias: readonly Weekday[]; desde: number; hasta: number }[] = [
  { sitio: 'parque', peso: 30, dias: [0, 1, 2, 3, 4, 5, 6], desde: h(9), hasta: h(21) },
  // El supermercado abre de lunes a sábado de 9:00 a 21:00 y el domingo de 10:00 a 15:00.
  { sitio: 'supermercado', peso: 20, dias: [0, 1, 2, 3, 4, 5], desde: h(9), hasta: h(21) },
  { sitio: 'supermercado', peso: 20, dias: [6], desde: h(10), hasta: h(15) },
  // El restaurante, a la hora de comer (13:00–15:00; abre hasta las 16:00) y al cenar (20:00–21:00).
  { sitio: 'restaurante', peso: 15, dias: [0, 1, 2, 3, 4, 5, 6], desde: h(13), hasta: h(15) },
  { sitio: 'restaurante', peso: 15, dias: [0, 1, 2, 3, 4, 5, 6], desde: h(20), hasta: h(21) },
  // La biblioteca abre de lunes a viernes de 9:00 a 20:00 y los sábados de 10:00 a 14:00.
  { sitio: 'biblioteca', peso: 8, dias: [0, 1, 2, 3, 4], desde: h(9), hasta: h(20) },
  { sitio: 'biblioteca', peso: 8, dias: [5], desde: h(10), hasta: h(14) },
];

/**
 * Lo que hace un vecino entre las 9:00 y las 21:00: se queda fuera (50) o va al parque, al supermercado, al restaurante o a la biblioteca solo
 * cuando están abiertos. Los tramos se parten donde empieza o acaba una visita (distintos de lunes a viernes, sábado y domingo).
 */
function vecino(nivel: number): TramoDeAgenda[] {
  const grupos: readonly (readonly Weekday[])[] = [[0, 1, 2, 3, 4], [5], [6]];
  return grupos.flatMap((dias) => {
    const visitas = VISITAS_DE_VECINOS.filter((v) => v.dias.includes(dias[0]));
    const cortes = [...new Set([h(9), h(21), ...visitas.flatMap((v) => [v.desde, v.hasta])])].sort((a, b) => a - b);
    return cortes.slice(0, -1).map((desde, i): TramoDeAgenda => {
      const hasta = cortes[i + 1];
      const abiertas = visitas.filter((v) => v.desde <= desde && v.hasta >= hasta);
      return tramo('vecino', nivel, dias, desde, hasta, [[FUERA, 50], ...abiertas.map((v): [string, number] => [v.sitio, v.peso])]);
    });
  });
}

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
        // Llega media hora antes de las clases (7:30) y se va a las dos; en clase no se le puede hablar, solo al llegar y en el recreo.
        ...colegio('alumno', n, t.tuClase),
        tramo('alumno', n, 'lectivo', h(15), h(19), [[FUERA, 55], ['parque', 22], ['supermercado', 8], ['gimnasio', 5], ['biblioteca', 10]]),
        tramo('alumno', n, 'libre', h(10), h(14), [[FUERA, 45], ['parque', 37], ['supermercado', 10], ['biblioteca', 8]]),
        // La biblioteca cierra los domingos: a igualdad de nivel gana el último tramo, así que este manda sobre el anterior ese día.
        tramo('alumno', n, [6], h(10), h(14), [[FUERA, 50], ['parque', 40], ['supermercado', 10]]),
        // El supermercado cierra los domingos a las 15:00: por la tarde de los días libres ya no se va (ver `HORARIO_DEL_SUPERMERCADO`).
        tramo('alumno', n, 'libre', h(15), h(20), [[FUERA, 55], ['parque', 40], ['gimnasio', 5]]),
        tramo('alumno', n, SABADO, h(20), h(22, 30), [[FUERA, 80], ['restaurante', 20]]),
      ];
    }
    case 'profesor':
      // Llega a las 7:30, da clase (ocupado) de 8 a 14 salvo el recreo y atiende tutorías de 14 a 17.
      // Fuera de clase está en la sala de profesores (salvo un par que salen a la entrada, o al patio en el recreo, al azar cada día).
      // La entrada (7:30) y las tutorías (14–17) las hace en la sala o en la entrada; en el recreo, la sala o el patio.
      return [
        tramo('profesor', nivel(NIVEL_AGENDA.rol), 'lectivo', h(7, 30), RECREO_DESDE, [['sala_profesores', 85], ['colegio', 15]], undefined, EN_CLASE),
        tramo('profesor', nivel(NIVEL_AGENDA.rol), 'lectivo', RECREO_DESDE, EN_CLASE[1][0], [['sala_profesores', 85], ['patio', 15]]),
        tramo('profesor', nivel(NIVEL_AGENDA.rol), 'lectivo', EN_CLASE[1][0], h(17), [['sala_profesores', 85], ['colegio', 15]], undefined, EN_CLASE),
      ];
    case 'entrenador':
      return [...(club ? sesiones('entrenador', nivel(NIVEL_AGENDA.pertenencia), club) : []), ...carreras('entrenador', nivel(NIVEL_AGENDA.pertenencia), datos)];
    case 'club':
      return club ? sesiones('club', nivel(NIVEL_AGENDA.pertenencia), club) : [];
    case 'rival':
      return [
        // Fuera de sus sesiones, el colegio y las carreras, algunos pasan por el parque: allí se les puede encontrar.
        tramo('rival', NIVEL_AGENDA.rol, 'lectivo', h(15), h(19), [[FUERA, 85], ['parque', 15]]),
        tramo('rival', NIVEL_AGENDA.rol, 'libre', h(10), h(20), [[FUERA, 75], ['parque', 25]]),
        ...(club ? sesiones('rival', nivel(NIVEL_AGENDA.pertenencia), club, ASISTENCIA_RIVAL.sesion) : []),
        ...carreras('rival', nivel(NIVEL_AGENDA.pertenencia), datos, ASISTENCIA_RIVAL.carreras),
      ];
    case 'amigo': {
      const n = nivel(NIVEL_AGENDA.pertenencia);
      return [
        tramo('amigo', n, 'lectivo', h(15), h(19), [[FUERA, 60], ['parque', 40]]),
        tramo('amigo', n, 'libre', h(10), h(14), [[FUERA, 40], ['parque', 60]]),
        tramo('amigo', n, 'libre', h(15), h(20), [[FUERA, 40], ['parque', 60]]),
      ];
    }
    case 'hermano':
      return [
        // Vive en casa: está allí salvo en el colegio (si tiene edad) y en su deporte, que mandan sobre la casa.
        tramo('hermano', nivel(NIVEL_AGENDA.base + 0.5), 'todos', 0, 1440, [['casa', 1]]),
        // Los menores de 8 años (aún sin deporte) duermen de 23:00 a 7:00: siguen en casa, pero no se puede hablar con ellos.
        ...(t.deporte ? [] : [tramo('hermano', nivel(NIVEL_AGENDA.base + 0.75), 'todos', 0, h(7), [['casa', 1]], undefined, [[0, h(7)]], 'durmiendo'), tramo('hermano', nivel(NIVEL_AGENDA.base + 0.75), 'todos', h(23), h(24), [['casa', 1]], undefined, [[h(23), h(24)]], 'durmiendo')]),
        ...(t.escolar ? colegio('hermano', NIVEL_AGENDA.rol) : []),
        ...(t.deporte ? carreras('hermano', NIVEL_AGENDA.pertenencia, datos, ASISTENCIA_RIVAL.carreras) : []),
      ];
    case 'progenitor':
      // Trabajan fuera: en casa antes de irse, por la tarde-noche y casi todo el fin de semana.
      return [
        tramo('progenitor', nivel(NIVEL_AGENDA.rol), 'lectivo', h(6, 30), h(8), [['casa', 1]]),
        tramo('progenitor', nivel(NIVEL_AGENDA.rol), 'lectivo', h(18, 30), h(24), [['casa', 1]]),
        tramo('progenitor', nivel(NIVEL_AGENDA.rol), 'libre', h(9), h(24), [['casa', 85], [FUERA, 15]]),
      ];
    case 'vecino':
      return vecino(nivel(NIVEL_AGENDA.rol));
    case 'bibliotecario': {
      // Turno de mañana: de lunes a viernes hasta las 14:30 y los sábados; turno de tarde: de lunes a viernes de 14:30 a 20:00.
      const n = nivel(NIVEL_AGENDA.rol);
      const entreSemana: readonly Weekday[] = [0, 1, 2, 3, 4];
      return t.turno === 'tarde'
        ? [tramo('bibliotecario', n, entreSemana, h(14, 30), h(20), [['biblioteca', 1]])]
        : [tramo('bibliotecario', n, entreSemana, h(9), h(14, 30), [['biblioteca', 1]]), tramo('bibliotecario', n, SABADO, h(10), h(14), [['biblioteca', 1]])];
    }
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
  for (const p of partes) {
    const t = typeof p === 'number' ? String(p) : p;
    for (let i = 0; i < t.length; i++) hash = Math.imul(hash ^ t.charCodeAt(i), 0x01000193);
    hash = Math.imul(hash ^ 124, 0x01000193); // separador entre partes
  }
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x2c1b3c6d);
  hash ^= hash >>> 12;
  return ((hash >>> 0) % 1_000_003) / 1_000_003;
}

const vale = (dias: DiasDeTramo, t: TimeView): boolean => (dias === 'todos' ? true : dias === 'lectivo' ? t.isSchoolDay : dias === 'libre' ? !t.isSchoolDay : dias.includes(t.weekday));

export interface Ubicacion {
  sitio: Sitio;
  /** Está en su agenda pero ocupado (en clase, corriendo...): cuenta como fuera del mapa y no se le puede hablar. */
  ocupado?: boolean;
  /** Si está ocupado pero se le ve en el sitio (`TramoDeAgenda.motivoOcupado`): dónde está y qué hace. */
  atendiendo?: { sitio: string; motivo: string };
  /** Nivel del tramo que manda ahora. */
  nivel: number;
  tipo: TipoDeAgenda | 'base';
}

/**
 * Qué tramos valen en un momento (por día y hora, sin contar el azar de cada persona). Solo depende de la agenda y del momento, así que
 * se recuerda por agenda: las personas con los mismos tipos comparten agenda y, al ubicar a toda la población, esto se calcula una vez por
 * agenda y no una vez por persona.
 */
const VIGENTES = new WeakMap<readonly TramoDeAgenda[], { clave: number; indices: number[] }>();

function tramosVigentes(agenda: readonly TramoDeAgenda[], t: TimeView): number[] {
  const clave = t.minute;
  const guardado = VIGENTES.get(agenda);
  if (guardado?.clave === clave) return guardado.indices;
  const indices: number[] = [];
  for (let i = 0; i < agenda.length; i++) {
    const x = agenda[i];
    if (t.minuteOfDay >= x.desde && t.minuteOfDay < x.hasta && vale(x.dias, t)) indices.push(i);
  }
  VIGENTES.set(agenda, { clave, indices });
  return indices;
}

/** Dónde está una persona a una hora: el tramo de mayor nivel que vale ahora (a igualdad, el último) y, dentro de él, su destino del día. */
export function ubicacionEn(agenda: readonly TramoDeAgenda[], t: TimeView, persona: string): Ubicacion {
  let mejor = -1;
  for (const i of tramosVigentes(agenda, t)) {
    const x = agenda[i];
    if (x.asistencia !== undefined && azarDe(persona, t.day, i, 'va') >= x.asistencia) continue;
    if (mejor < 0 || x.nivel >= agenda[mejor].nivel) mejor = i;
  }
  const x = agenda[mejor];
  if (x.ocupado?.some(([a, b]) => t.minuteOfDay >= a && t.minuteOfDay < b)) {
    const aqui = x.motivoOcupado && x.destinos.length === 1 ? x.destinos[0][0] : null;
    return { sitio: FUERA, ocupado: true, ...(aqui ? { atendiendo: { sitio: aqui, motivo: x.motivoOcupado! } } : {}), nivel: x.nivel, tipo: x.tipo };
  }
  if (x.destinos.length === 1) return { sitio: x.destinos[0][0], nivel: x.nivel, tipo: x.tipo };
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
   * Cambia cuando cambia quién hay dónde (un cambio de tramo, de día o de personas) y no antes: sirve para recordar lo que se calcula
   * a partir de la presencia sin recalcularlo en cada acción.
   */
  readonly version: number;
  /**
   * Personas que hay ahora en un lugar. Primero las de mayor nivel (profesores, el club, los amigos) y después las demás en
   * un orden que no cambia mientras dure el tramo; como mucho `max` (por defecto, todas).
   */
  en(lugar: LugarId, max?: number): NpcView[];
  /**
   * Personas que están en un lugar pero ocupadas (atendiendo en clase, durmiendo): se las ve, con su estado, pero no se puede hablar con ellas
   * (no salen en `en`). Son pocas: no hace falta limitar.
   */
  ocupadosEn(lugar: LugarId): { persona: NpcView; motivo: string }[];
  /** Dónde está una persona ahora (`null`: fuera del mapa) o `undefined` si no existe. */
  donde(npcId: string): Sitio | undefined;
  /** Tramos de la semana de una persona. */
  agenda(npcId: string): TramoDeAgenda[];
}
