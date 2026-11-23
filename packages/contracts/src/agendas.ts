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

export type TipoDeAgenda = 'alumno' | 'profesor' | 'entrenador' | 'club' | 'rival' | 'amigo' | 'vecino' | 'hermano' | 'progenitor' | 'bibliotecario' | 'portero' | 'conserje' | 'repartidor';

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
  /**
   * `hermano`: está en edad de colegio (va a clase como un alumno). `vecino`: es un niño que va a un colegio de fuera (no es el del personaje, no sale en el mapa): de 7:30 a 14:30 los días lectivos
   * está en su colegio (fuera del mapa) y el resto del día sigue la agenda de un vecino.
   */
  escolar?: boolean;
  /** `vecino` adulto: recoge a un hijo a la salida del colegio los días lectivos (`RECOGIDA_DE_NINOS`): espera en la entrada del colegio (llega entre las 13:45 y las 14:00 y se va entre las 14:05 y las 14:30). Todavía no hay una relación con un hijo concreto: no se va con él. */
  recoge?: boolean;
  /** `hermano`: es pequeño (menos de 8 años) y duerme de 23:00 a 7:00 (se le ve en casa, pero no se le puede hablar). */
  duerme?: boolean;
  /**
   * El deporte al que se refiere (`rival`, `entrenador`, `club`): su id. Sin él, el primero de la partida. En `hermano` basta `true`: practica
   * ese deporte y compite en su jornada.
   */
  deporte?: boolean | string;
  /**
   * `bibliotecario`: el turno de mañana (hasta las 14:30, y los sábados) o el de tarde (desde las 14:30). `vecino` con `trabaja`: el turno de mañana (de que abre el sitio a las 15:00; la comida en el restaurante) o el de tarde
   * (de las 15:00 a que cierra; la cena en el restaurante).
   */
  turno?: 'manana' | 'tarde';
  /** `vecino` adulto: en qué calle vive (una de `CALLES_CON_VECINOS`). Pasa por ella al salir y volver a casa y a dar una vuelta (`VENTANAS_DE_CALLE`). */
  vive?: string;
  /**
   * `vecino` adulto: pasea a su perro (por la mañana temprano y por la noche, y más rato los fines de semana). De momento es una marca en el dueño; cuando existan las mascotas como tales (con los hogares), `perro` pasará a ser
   * la referencia a la mascota (un `string` con su id) sin cambiar lo demás, por eso admite las dos formas.
   */
  perro?: boolean | string;
  /** `vecino` adulto de `EDAD_DE_JUBILACION` años o más: un rato en un banco de la avenida o del parque por la mañana y por la tarde. */
  jubilado?: boolean;
  /** `alumno` o `vecino` menor de 12 años: no va solo al supermercado ni al restaurante (`EDAD_PARA_IR_SOLO`). */
  pequeno?: boolean;
  /** `vecino` adulto cuyo oficio es de un lugar (dependiente, camarero, cocinero, monitor): está allí en su horario (con su `turno`), a la vista. */
  trabaja?: 'supermercado' | 'restaurante' | 'gimnasio';
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
  /**
   * Varios tramos seguidos con el mismo grupo comparten el azar de cada persona (si va y a qué sitio): quien «sale» en uno ya no está en los siguientes, y quien se queda
   * se queda donde estaba. Así una salida se reparte en un rato: cada tramo con una `asistencia` menor que el anterior (ver `SALIDA_DEL_COLEGIO`).
   */
  grupoDeAzar?: string;
  /**
   * Cuántos días (de los que valdría el tramo) lo tiene la persona: sorteo estable por persona y día (`azarDe(persona, día, clave)`, sin gastar el azar de la partida), independiente del de `asistencia`.
   * Los tramos con la misma `clave` comparten el sorteo: o están todos ese día o no está ninguno (los padres que recogen van el 80 % de los días de clase). Si no lo tiene, vale el tramo siguiente en nivel.
   */
  delDia?: { clave: string; probabilidad: number };
  /** Solo vale los días lectivos (además de los `dias`): lo usa la espera en el colegio de quien tiene una actividad poco después de las clases, que solo se da si ese día hay colegio. */
  soloLectivo?: boolean;
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
  /** Sesiones de un club por su id o nombre en un deporte (por defecto, el primero de la partida); `undefined` si no se conoce. */
  sesionDeClub(club: string, deporte?: string): SesionDeClub | undefined;
  /** Cuándo y dónde se compite cada semana (la jornada que da el deporte, por defecto el primero de la partida, ver `JornadaDeCompeticion`); `undefined` si no hay ninguna (sin deportes). */
  jornada(deporte?: string): JornadaDeCompeticion | undefined;
}

const h = (horas: number, minutos = 0): number => horas * 60 + minutos;
const FUERA = null;
const SABADO: readonly Weekday[] = [5];

/** Lo que hace cualquiera que no esté en ningún otro tramo: estar fuera. */
const BASE: TramoDeAgenda = { dias: 'todos', desde: 0, hasta: 1440, destinos: [[FUERA, 1]], nivel: NIVEL_AGENDA.base, tipo: 'base' };

const tramo = (tipo: TipoDeAgenda, nivel: number, dias: DiasDeTramo, desde: number, hasta: number, destinos: Destinos, asistencia?: number, ocupado?: TramoDeAgenda['ocupado'], motivoOcupado?: string, grupoDeAzar?: string, delDia?: TramoDeAgenda['delDia']): TramoDeAgenda => ({
  tipo,
  nivel,
  dias,
  desde,
  hasta,
  destinos,
  ...(asistencia === undefined ? {} : { asistencia }),
  ...(ocupado ? { ocupado } : {}),
  ...(motivoOcupado ? { motivoOcupado } : {}),
  ...(grupoDeAzar ? { grupoDeAzar } : {}),
  ...(delDia ? { delDia } : {}),
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
/**
 * La salida del colegio no es instantánea (cifras provisionales, 17/11): al acabar las clases (14:00) los alumnos salen **repartidos en `minutos` minutos**, en pasos de `paso`: cada uno se va a su hora
 * (unos nada más sonar el timbre y otros 30 minutos después) y mientras no se va está en la entrada del colegio (`colegio`, 70 %) o en el patio (30 %), donde se le puede hablar.
 */
export const SALIDA_DEL_COLEGIO = {
  minutos: 30,
  paso: 5,
  entrada: 70,
  patio: 30,
  /**
   * Quien tiene un entrenamiento o una actividad que empieza como mucho `espera` minutos después de acabar las clases (el fútbol de las 15:00 empieza, con los 10 minutos de margen, a las 14:50) no se va
   * a casa: sigue en el colegio (en la entrada o en el patio) hasta ese momento y entonces va a su sitio.
   */
  espera: 60,
};
/**
 * Los padres que recogen a un hijo a la salida del colegio (17/11, cifras provisionales): `proporcion` de los vecinos adultos. Llegan a la entrada del colegio entre `llegada` minutos antes de las clases
 * (13:45) y el final de las clases (14:00), en pasos de `paso`, y se van entre 5 minutos y 30 minutos después de acabar las clases (de 14:05 a 14:30), también en pasos. Van `diasDeClase` (el 80 %) de los días lectivos
 * (sorteo estable por persona y día: unos días van y otros no). Solo los vecinos de `edadMinima` años o más: 25 de momento, **pendiente de revisar** (a veces pueden ser algo más jóvenes, y se quiere mezclar padres y abuelos).
 */
export const RECOGIDA_DE_NINOS = { proporcion: 0.15, llegada: 15, paso: 5, edadMinima: 25, diasDeClase: 0.8 };
/**
 * Moverse con el grupo (21/11, cifras provisionales). Al acabar una acción, si el personaje sigue donde estaba y la mayoría de la gente libre que había con él (los que
 * se podía hablar) se ha ido, a la vez, al mismo sitio (o fuera del mapa), `npcs` avisa con `GRUPO_SE_VA` y un suceso pregunta si les acompaña.
 * - `minimo`: personas que tienen que irse juntas (por debajo, es gente que se va, no un grupo).
 * - `proporcion`: parte de la gente que tenía cerca (la que se ve, `aforoCercano`) que tiene que ir al mismo sitio: la mayoría. Los que salen del mapa cuentan como gente que se queda
 *   o se va aparte: no se les puede seguir.
 * - `muestra`: cuántas personas se nombran en la señal.
 * - `mirarMinutos`: hasta cuántos minutos por delante se mira si se va el grupo para cortar una acción antes de que se vaya (`GameModule.obligaciones`).
 * - `despedidaHasta`: «Me voy» solo si la acción dura hasta tantos minutos: en una acción larga (descansar, estudiar) no estás pendiente de quien se va, y llenaría el registro.
 */
export const MOVERSE_CON_EL_GRUPO = { minimo: 3, proporcion: 0.5, muestra: 3, despedidaHasta: 30, mirarMinutos: 120 };
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
  // Tras la última clase, cada alumno se queda un rato distinto (el azar es el mismo en todos los pasos: quien se va no vuelve).
  const pasos = Math.round(SALIDA_DEL_COLEGIO.minutos / SALIDA_DEL_COLEGIO.paso);
  const salida = Array.from({ length: pasos }, (_, k) =>
    tramo(tipo, nivel, 'lectivo', FIN_DE_CLASES + k * SALIDA_DEL_COLEGIO.paso, FIN_DE_CLASES + (k + 1) * SALIDA_DEL_COLEGIO.paso, [['colegio', SALIDA_DEL_COLEGIO.entrada], ['patio', SALIDA_DEL_COLEGIO.patio]], (pasos - k) / (pasos + 1), undefined, undefined, `salida|${tipo}|${tuClase ? 'tu' : 'otra'}`),
  );
  if (!tuClase) {
    // Los de otras clases: en la entrada al llegar y en el patio en el recreo; el resto del tiempo están en sus aulas (ocupados, fuera del mapa).
    return [
      tramo(tipo, nivel, 'lectivo', llegada, EN_CLASE[0][0], [['colegio', 1]]),
      tramo(tipo, nivel, 'lectivo', EN_CLASE[0][0], RECREO_DESDE, [['colegio', 1]], undefined, [[EN_CLASE[0][0], RECREO_DESDE]]),
      tramo(tipo, nivel, 'lectivo', RECREO_DESDE, EN_CLASE[1][0], [['patio', 1]]),
      tramo(tipo, nivel, 'lectivo', EN_CLASE[1][0], FIN_DE_CLASES, [['colegio', 1]], undefined, [[EN_CLASE[1][0], FIN_DE_CLASES]]),
      ...salida,
    ];
  }
  return [
    tramo(tipo, nivel, 'lectivo', llegada, EN_CLASE[0][0], [['colegio', 1]]),
    tramo(tipo, nivel, 'lectivo', EN_CLASE[0][0], RECREO_DESDE, [['aula', 1]], undefined, [clase1, clase2], EN_CLASE_ATENDIENDO),
    tramo(tipo, nivel, 'lectivo', RECREO_DESDE, EN_CLASE[1][0], [['patio', 1]]),
    tramo(tipo, nivel, 'lectivo', EN_CLASE[1][0], FIN_DE_CLASES, [['aula', 1]], undefined, [clase3, clase4], EN_CLASE_ATENDIENDO),
    ...salida,
  ];
};

/** Los tramos de las sesiones de un club. */
const sesiones = (tipo: TipoDeAgenda, nivel: number, s: SesionDeClub, asistencia?: number): TramoDeAgenda[] => [
  tramo(tipo, nivel, s.weekdays as readonly Weekday[], h(s.desde) - MARGEN_ANTES_DE_SESION, h(s.hasta) + MARGEN_DE_SESION, [[s.sede, 1]], asistencia, [[h(s.desde), h(s.hasta)]]),
];

/** La jornada de competición de cada semana (en el atletismo, las carreras: los sábados por la mañana, en el estadio), si el deporte da una. */
const carreras = (tipo: TipoDeAgenda, nivel: number, datos: DatosDeAgenda, deporte: string | undefined, asistencia?: number): TramoDeAgenda[] => {
  const j = datos.jornada(deporte);
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

/** Las calles donde puede vivir un vecino (el `vive` de su tipo). La cuarta, la avenida del estadio, no tiene vecinos: solo se pasa por ella. */
export const CALLES_CON_VECINOS = ['calle_casa', 'calle_colegio', 'avenida_parque'] as const;
/** Menores de esta edad no van solos al supermercado ni al restaurante (23/11, decidido con el usuario). */
export const EDAD_PARA_IR_SOLO = 12;
/**
 * Gente por la calle (23/11, cifras provisionales; `docs/relevo/gente-por-la-calle.md`). La calle tiene gente de `desde` a `hasta` (de 6:30 a 23:59). Las visitas a la calle son **pasos de `paso` minutos** y en cada uno la persona
 * está en la calle con la probabilidad `p` (azar independiente por paso, estable por persona y día): en promedio pasa `pasos × p` pasos. Sale de las marcas del tipo `vecino` (`vive`, `perro`, `jubilado`).
 */
export const VENTANAS_DE_CALLE = {
  desde: h(6, 30),
  hasta: h(24),
  paso: 10,
  /** Salir de casa, volver y dar una vuelta (los que viven en esa calle). `p` por paso de 10 minutos. */
  residente: [
    { dias: 'lectivo', desde: h(6, 30), hasta: h(8, 30), p: 0.12 },
    { dias: 'lectivo', desde: h(17, 30), hasta: h(21), p: 0.06 },
    { dias: 'lectivo', desde: h(21), hasta: h(24), p: 0.03 },
    { dias: 'libre', desde: h(10), hasta: h(13), p: 0.07 },
    { dias: 'libre', desde: h(18), hasta: h(21), p: 0.05 },
    { dias: 'libre', desde: h(21), hasta: h(24), p: 0.03 },
  ],
  /** Pasear al perro: por su calle, la avenida o el parque. */
  perro: [
    { dias: 'lectivo', desde: h(6, 30), hasta: h(7, 40), p: 0.25 },
    { dias: 'lectivo', desde: h(19, 30), hasta: h(23, 30), p: 0.14 },
    { dias: 'libre', desde: h(8), hasta: h(12), p: 0.12 },
    { dias: 'libre', desde: h(19), hasta: h(23, 30), p: 0.11 },
  ],
  /** Un banco de la avenida o del parque. */
  banco: [
    { dias: 'todos', desde: h(10), hasta: h(13), p: 0.3 },
    { dias: 'todos', desde: h(17), hasta: h(19, 30), p: 0.3 },
  ],
  /** Un jubilado que vive en la calle, además, da un paseo corto por ella. */
  paseoDeJubilado: [
    { dias: 'todos', desde: h(9), hasta: h(11), p: 0.1 },
    { dias: 'todos', desde: h(16), hasta: h(18), p: 0.1 },
  ],
  /** Los demás adultos pasan algo por la calle del colegio (al ir y venir) y por la avenida los días libres. */
  depaso: [
    { dias: 'lectivo', desde: h(7, 10), hasta: h(8, 10), p: 0.04, sitio: 'calle_colegio' },
    { dias: 'lectivo', desde: h(14), hasta: h(15), p: 0.04, sitio: 'calle_colegio' },
    { dias: 'libre', desde: h(10), hasta: h(14), p: 0.025, sitio: 'avenida_parque' },
  ],
  /** Los niños pequeños que viven en esa calle juegan en ella o en el parque. */
  ninos: [
    { dias: 'lectivo', desde: h(16, 30), hasta: h(19, 30), p: 0.25 },
    { dias: 'libre', desde: h(11), hasta: h(13), p: 0.25 },
    { dias: 'libre', desde: h(17), hasta: h(20), p: 0.25 },
  ],
} as const;

type VentanaDeCalle = { dias: DiasDeTramo; desde: number; hasta: number; p: number };

/** Pasos de `VENTANAS_DE_CALLE.paso` minutos de `v.desde` a `v.hasta`, cada uno con probabilidad `v.p` de que la persona esté en uno de `sitios`. */
function pasosDeCalle(v: VentanaDeCalle, sitios: Destinos, nivel: number): TramoDeAgenda[] {
  const { paso } = VENTANAS_DE_CALLE;
  return Array.from({ length: Math.round((v.hasta - v.desde) / paso) }, (_, k) => tramo('vecino', nivel, v.dias, v.desde + k * paso, v.desde + (k + 1) * paso, sitios, v.p));
}

/** Las visitas de un vecino a la calle según sus marcas. Va antes que el colegio de fuera y la recogida: las clases y esperar a un hijo mandan sobre pasear. */
function vecinoEnLaCalle(nivel: number, t: TipoAsignado): TramoDeAgenda[] {
  const calle = t.vive;
  const propia: Destinos = calle ? [[calle, 1]] : [];
  const tramos: TramoDeAgenda[] = [];
  const adulto = !t.escolar && !t.pequeno;
  if (t.pequeno) {
    // Los niños pequeños: solo juegan fuera los que viven en una calle (y en el parque).
    if (calle) for (const v of VENTANAS_DE_CALLE.ninos) tramos.push(...pasosDeCalle(v, [[calle, 1], ['parque', 1]], nivel));
    return tramos;
  }
  if (!adulto) return tramos;
  if (t.jubilado) {
    for (const v of VENTANAS_DE_CALLE.banco) tramos.push(...pasosDeCalle(v, [['avenida_parque', 1], ['parque', 1]], nivel));
    if (calle) for (const v of VENTANAS_DE_CALLE.paseoDeJubilado) tramos.push(...pasosDeCalle(v, propia, nivel));
  } else {
    if (calle) for (const v of VENTANAS_DE_CALLE.residente) tramos.push(...pasosDeCalle(v, propia, nivel));
    for (const v of VENTANAS_DE_CALLE.depaso) tramos.push(...pasosDeCalle(v, [[v.sitio, 1]], nivel));
  }
  if (t.perro) for (const v of VENTANAS_DE_CALLE.perro) tramos.push(...pasosDeCalle(v, [...propia, ['avenida_parque', 1], ['parque', 1]], nivel));
  return tramos;
}

/** Quien trabaja en un lugar (dependiente, camarero, cocinero, monitor) está allí en su horario: dos turnos que parten el horario del sitio (`lugares.ts`) y, algún día, libra (`delDia`). */
const TURNOS_DE_TRABAJO: Readonly<Record<NonNullable<TipoAsignado['trabaja']>, readonly { turno: 'manana' | 'tarde'; dias: DiasDeTramo; desde: number; hasta: number }[]>> = {
  // Abre de lunes a sábado de 9:00 a 21:00 y el domingo de 10:00 a 15:00 (solo el turno de mañana trabaja el domingo).
  supermercado: [
    { turno: 'manana', dias: [0, 1, 2, 3, 4, 5], desde: h(9), hasta: h(15) },
    { turno: 'manana', dias: [6], desde: h(10), hasta: h(15) },
    { turno: 'tarde', dias: [0, 1, 2, 3, 4, 5], desde: h(15), hasta: h(21) },
  ],
  // Comida de 13:00 a 16:00 y cena de 20:00 a 23:00.
  restaurante: [
    { turno: 'manana', dias: 'todos', desde: h(13), hasta: h(16) },
    { turno: 'tarde', dias: 'todos', desde: h(20), hasta: h(23) },
  ],
  // Abre todos los días de 8:00 a 22:00.
  gimnasio: [
    { turno: 'manana', dias: 'todos', desde: h(8), hasta: h(15) },
    { turno: 'tarde', dias: 'todos', desde: h(15), hasta: h(22) },
  ],
};
/** Los días que trabaja quien trabaja en un lugar (el resto libra, por persona y día). */
export const DIAS_DE_TRABAJO = 0.85;

/** El oficio manda más que ser vecino (nivel de pertenencia): así quien trabaja en el lugar se ve antes que los clientes en «gente cerca». */
function trabajoEnUnLugar(t: TipoAsignado): TramoDeAgenda[] {
  if (!t.trabaja) return [];
  const delDia = { clave: 'trabaja|dia', probabilidad: DIAS_DE_TRABAJO };
  return TURNOS_DE_TRABAJO[t.trabaja].filter((x) => x.turno === (t.turno ?? 'manana')).map((x) => tramo('vecino', NIVEL_AGENDA.pertenencia, x.dias, x.desde, x.hasta, [[t.trabaja!, 1]], undefined, undefined, undefined, undefined, delDia));
}

/**
 * Lo que hace un vecino entre las 9:00 y las 21:00: se queda fuera (50) o va al parque, al supermercado, al restaurante o a la biblioteca solo
 * cuando están abiertos (los menores de `EDAD_PARA_IR_SOLO` años, ni al supermercado ni al restaurante). Los tramos se parten donde empieza o acaba una visita (distintos de lunes a viernes, sábado y domingo).
 * Además, de 6:30 a 23:59, pasa por la calle según sus marcas (`vecinoEnLaCalle`) y, si trabaja en un lugar, está allí en su horario.
 */
function vecino(nivel: number, t: TipoAsignado): TramoDeAgenda[] {
  const { escolar = false, recoge = false, pequeno = false } = t;
  const grupos: readonly (readonly Weekday[])[] = [[0, 1, 2, 3, 4], [5], [6]];
  const delBarrio = grupos.flatMap((dias) => {
    const visitas = VISITAS_DE_VECINOS.filter((v) => v.dias.includes(dias[0]) && !(pequeno && SOLO_PARA_MAYORES.includes(v.sitio)));
    const cortes = [...new Set([h(9), h(21), ...visitas.flatMap((v) => [v.desde, v.hasta])])].sort((a, b) => a - b);
    return cortes.slice(0, -1).map((desde, i): TramoDeAgenda => {
      const hasta = cortes[i + 1];
      const abiertas = visitas.filter((v) => v.desde <= desde && v.hasta >= hasta);
      return tramo('vecino', nivel, dias, desde, hasta, [[FUERA, 50], ...abiertas.map((v): [string, number] => [v.sitio, v.peso])]);
    });
  });
  // Los niños que van a un colegio de fuera: en clase (fuera del mapa) de 7:30 a la salida, que acaba a las 14:30. Va después de lo del barrio y de la calle: a igualdad de nivel gana el último.
  const colegioDeFuera = escolar ? [tramo('vecino', nivel, 'lectivo', PRIMERA_CLASE - LLEGADA_AL_COLEGIO, FIN_DE_CLASES + SALIDA_DEL_COLEGIO.minutos, [[FUERA, 1]])] : [];
  return [...delBarrio, ...vecinoEnLaCalle(nivel, t), ...colegioDeFuera, ...(recoge ? recogerANinos(nivel) : []), ...trabajoEnUnLugar(t)];
}

/** Los sitios a los que un niño pequeño no va solo. */
const SOLO_PARA_MAYORES: readonly string[] = ['supermercado', 'restaurante'];

/**
 * Un padre o una madre que recoge a su hijo: llega a la entrada del colegio entre las 13:45 y las 14:00 (cada uno a su hora, fija ese día) y se va entre las 14:05 y las 14:30. Como la salida de los alumnos,
 * se hace con tramos de 5 minutos que comparten el azar de la persona (`grupoDeAzar`): quien ha llegado se queda hasta su hora de irse y quien se ha ido no vuelve.
 */
function recogerANinos(nivel: number): TramoDeAgenda[] {
  const { llegada, paso } = RECOGIDA_DE_NINOS;
  const llegadas = Math.round(llegada / paso);
  const salidas = Math.round(SALIDA_DEL_COLEGIO.minutos / paso);
  const delDia = { clave: 'recoge|dia', probabilidad: RECOGIDA_DE_NINOS.diasDeClase };
  return [
    // Llegada: a las 13:45 está el primer tercio, a las 13:50 dos tercios y a las 13:55 todos (el azar de la llegada es independiente del de la salida).
    ...Array.from({ length: llegadas }, (_, k) => tramo('vecino', nivel, 'lectivo', FIN_DE_CLASES - llegada + k * paso, FIN_DE_CLASES - llegada + (k + 1) * paso, [['colegio', 1]], (k + 1) / llegadas, undefined, undefined, 'recoge|llegada', delDia)),
    // Espera y salida: a las 14:00 siguen todos; a las 14:05 se ha ido 1/6, y así hasta las 14:30, en que ya no queda nadie.
    ...Array.from({ length: salidas }, (_, k) => tramo('vecino', nivel, 'lectivo', FIN_DE_CLASES + k * paso, FIN_DE_CLASES + (k + 1) * paso, [['colegio', 1]], (salidas - k) / salidas, undefined, undefined, 'recoge|salida', delDia)),
  ];
}

/**
 * Tramos de un tipo. Es el dato de los horarios (ver el anexo). Los destinos con `FUERA` pesan lo que pesa quedarse en casa.
 */
export function tramosDe(t: TipoAsignado, datos: DatosDeAgenda): TramoDeAgenda[] {
  const nivel = (por: number) => t.nivel ?? por;
  // El deporte de un tipo: el suyo si lo dice (un `hermano` solo dice `true`: el primero de la partida).
  const deporte = typeof t.deporte === 'string' ? t.deporte : undefined;
  const club = t.club ? datos.sesionDeClub(t.club, deporte) : undefined;
  switch (t.tipo) {
    case 'alumno': {
      const n = nivel(NIVEL_AGENDA.rol);
      // Los menores de `EDAD_PARA_IR_SOLO` años no van solos al supermercado ni al restaurante.
      const solo = (d: Destinos): Destinos => (t.pequeno ? d.filter(([sitio]) => sitio === null || !SOLO_PARA_MAYORES.includes(sitio)) : d);
      return [
        // Llega media hora antes de las clases (7:30) y se va a las dos; en clase no se le puede hablar, solo al llegar y en el recreo.
        ...colegio('alumno', n, t.tuClase),
        tramo('alumno', n, 'lectivo', h(15), h(19), solo([[FUERA, 55], ['parque', 22], ['supermercado', 8], ['gimnasio', 5], ['biblioteca', 10]])),
        tramo('alumno', n, 'libre', h(10), h(14), solo([[FUERA, 45], ['parque', 37], ['supermercado', 10], ['biblioteca', 8]])),
        // La biblioteca cierra los domingos: a igualdad de nivel gana el último tramo, así que este manda sobre el anterior ese día.
        tramo('alumno', n, [6], h(10), h(14), solo([[FUERA, 50], ['parque', 40], ['supermercado', 10]])),
        // El supermercado cierra los domingos a las 15:00: por la tarde de los días libres ya no se va (ver `HORARIO_DEL_SUPERMERCADO`).
        tramo('alumno', n, 'libre', h(15), h(20), [[FUERA, 55], ['parque', 40], ['gimnasio', 5]]),
        tramo('alumno', n, SABADO, h(20), h(22, 30), solo([[FUERA, 80], ['restaurante', 20]])),
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
      return [...(club ? sesiones('entrenador', nivel(NIVEL_AGENDA.pertenencia), club) : []), ...carreras('entrenador', nivel(NIVEL_AGENDA.pertenencia), datos, deporte)];
    case 'club':
      return club ? sesiones('club', nivel(NIVEL_AGENDA.pertenencia), club) : [];
    case 'rival':
      return [
        // Fuera de sus sesiones, el colegio y las carreras, algunos pasan por el parque: allí se les puede encontrar.
        tramo('rival', NIVEL_AGENDA.rol, 'lectivo', h(15), h(19), [[FUERA, 85], ['parque', 15]]),
        tramo('rival', NIVEL_AGENDA.rol, 'libre', h(10), h(20), [[FUERA, 75], ['parque', 25]]),
        ...(club ? sesiones('rival', nivel(NIVEL_AGENDA.pertenencia), club, ASISTENCIA_RIVAL.sesion) : []),
        ...carreras('rival', nivel(NIVEL_AGENDA.pertenencia), datos, deporte, ASISTENCIA_RIVAL.carreras),
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
        // Los menores de 8 años duermen de 23:00 a 7:00: siguen en casa, pero no se puede hablar con ellos.
        ...(!t.duerme ? [] : [tramo('hermano', nivel(NIVEL_AGENDA.base + 0.75), 'todos', 0, h(7), [['casa', 1]], undefined, [[0, h(7)]], 'durmiendo'), tramo('hermano', nivel(NIVEL_AGENDA.base + 0.75), 'todos', h(23), h(24), [['casa', 1]], undefined, [[h(23), h(24)]], 'durmiendo')]),
        ...(t.escolar ? colegio('hermano', NIVEL_AGENDA.rol) : []),
        ...(t.deporte ? carreras('hermano', NIVEL_AGENDA.pertenencia, datos, deporte, ASISTENCIA_RIVAL.carreras) : []),
      ];
    case 'progenitor':
      // Trabajan fuera: en casa antes de irse, por la tarde-noche y casi todo el fin de semana.
      return [
        tramo('progenitor', nivel(NIVEL_AGENDA.rol), 'lectivo', h(6, 30), h(8), [['casa', 1]]),
        tramo('progenitor', nivel(NIVEL_AGENDA.rol), 'lectivo', h(18, 30), h(24), [['casa', 1]]),
        tramo('progenitor', nivel(NIVEL_AGENDA.rol), 'libre', h(9), h(24), [['casa', 85], [FUERA, 15]]),
      ];
    case 'vecino':
      return vecino(nivel(NIVEL_AGENDA.rol), t);
    case 'portero': {
      // El portero de tu portal: en la calle de tu casa de lunes a sábado por la mañana y por la tarde, y el domingo por la mañana. Libra algún día.
      const n = nivel(NIVEL_AGENDA.pertenencia);
      const delDia = { clave: 'portero|dia', probabilidad: DIAS_DE_TRABAJO };
      return [
        tramo('portero', n, [0, 1, 2, 3, 4, 5], h(7), h(14), [['calle_casa', 1]], undefined, undefined, undefined, undefined, delDia),
        tramo('portero', n, [0, 1, 2, 3, 4, 5], h(16), h(20), [['calle_casa', 1]], undefined, undefined, undefined, undefined, delDia),
        tramo('portero', n, [6], h(9), h(13), [['calle_casa', 1]], undefined, undefined, undefined, undefined, delDia),
      ];
    }
    case 'conserje': {
      // El conserje del colegio: en la entrada mientras está abierto (los días de clase de 7:00 a 19:00 y, en vacaciones, en el horario de la academia y del club).
      const n = nivel(NIVEL_AGENDA.pertenencia);
      return [
        tramo('conserje', n, 'lectivo', h(7), h(19), [['colegio', 1]]),
        tramo('conserje', n, [0, 1, 2, 3, 4], h(10), h(13), [['colegio', 1]]),
        tramo('conserje', n, [0, 2], h(14, 30), h(17, 30), [['colegio', 1]]),
      ];
    }
    case 'repartidor': {
      // Los repartos: paradas cortas en la calle de tu casa y en la del colegio por la mañana y por la tarde, de lunes a sábado.
      const n = nivel(NIVEL_AGENDA.pertenencia);
      const reparto: readonly Weekday[] = [0, 1, 2, 3, 4, 5];
      return [
        ...pasosDeCalle({ dias: reparto, desde: h(10), hasta: h(13), p: 0.12 }, [['calle_casa', 1], ['calle_colegio', 1]], n),
        ...pasosDeCalle({ dias: reparto, desde: h(17), hasta: h(20), p: 0.12 }, [['calle_casa', 1], ['calle_colegio', 1]], n),
      ].map((x) => ({ ...x, tipo: 'repartidor' as const }));
    }
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
  return conEsperaTrasElColegio([BASE, ...vigentes.flatMap((t) => tramosDe(t, datos))]);
}

/**
 * Quien va al colegio del personaje y tiene un entrenamiento o una actividad (un tramo con `ocupado`, de más nivel que el colegio) que empieza como mucho `SALIDA_DEL_COLEGIO.espera` minutos después de las clases
 * no se va a casa entre una cosa y otra: se queda en el colegio (en la entrada o en el patio) hasta que empieza su tramo (10 minutos antes de la sesión), y entonces va a su sitio. Solo vale los días lectivos y
 * los días y la asistencia del tramo: si ese día no va a la actividad, se va como los demás.
 */
function conEsperaTrasElColegio(agenda: TramoDeAgenda[]): TramoDeAgenda[] {
  const salida = agenda.find((x) => x.grupoDeAzar?.startsWith('salida|'));
  if (!salida) return agenda;
  const resultado = [...agenda];
  const esperas: TramoDeAgenda[] = [];
  agenda.forEach((x, i) => {
    if (!x.ocupado || x.nivel <= salida.nivel || x.dias === 'libre' || x.desde < FIN_DE_CLASES || x.desde > FIN_DE_CLASES + SALIDA_DEL_COLEGIO.espera) return;
    // Si no va siempre, el tramo y la espera comparten el azar de la persona: va a las dos cosas o a ninguna.
    const grupo = x.asistencia === undefined ? undefined : (x.grupoDeAzar ?? `espera|${i}`);
    if (grupo !== undefined) resultado[i] = { ...x, grupoDeAzar: grupo };
    esperas.push({
      tipo: salida.tipo,
      nivel: salida.nivel,
      dias: x.dias,
      soloLectivo: true,
      desde: FIN_DE_CLASES,
      hasta: x.desde,
      destinos: [['colegio', SALIDA_DEL_COLEGIO.entrada], ['patio', SALIDA_DEL_COLEGIO.patio]],
      ...(x.asistencia === undefined ? {} : { asistencia: x.asistencia }),
      ...(grupo === undefined ? {} : { grupoDeAzar: grupo }),
    });
  });
  // Al final: a igualdad de nivel gana el último, y la espera manda sobre la salida.
  return [...resultado, ...esperas];
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
    if (t.minuteOfDay >= x.desde && t.minuteOfDay < x.hasta && vale(x.dias, t) && (!x.soloLectivo || t.isSchoolDay)) indices.push(i);
  }
  VIGENTES.set(agenda, { clave, indices });
  return indices;
}

/** Dónde está una persona a una hora: el tramo de mayor nivel que vale ahora (a igualdad, el último) y, dentro de él, su destino del día. */
export function ubicacionEn(agenda: readonly TramoDeAgenda[], t: TimeView, persona: string): Ubicacion {
  let mejor = -1;
  for (const i of tramosVigentes(agenda, t)) {
    const x = agenda[i];
    if (x.asistencia !== undefined && azarDe(persona, t.day, x.grupoDeAzar ?? i, 'va') >= x.asistencia) continue;
    if (x.delDia && azarDe(persona, t.day, x.delDia.clave, 'dia') >= x.delDia.probabilidad) continue;
    if (mejor < 0 || x.nivel >= agenda[mejor].nivel) mejor = i;
  }
  const x = agenda[mejor];
  if (x.ocupado?.some(([a, b]) => t.minuteOfDay >= a && t.minuteOfDay < b)) {
    const aqui = x.motivoOcupado && x.destinos.length === 1 ? x.destinos[0][0] : null;
    return { sitio: FUERA, ocupado: true, ...(aqui ? { atendiendo: { sitio: aqui, motivo: x.motivoOcupado! } } : {}), nivel: x.nivel, tipo: x.tipo };
  }
  if (x.destinos.length === 1) return { sitio: x.destinos[0][0], nivel: x.nivel, tipo: x.tipo };
  const total = x.destinos.reduce((s, [, peso]) => s + peso, 0);
  let tirada = azarDe(persona, t.day, x.grupoDeAzar ?? mejor, 'donde') * total;
  for (const [sitio, peso] of x.destinos) {
    tirada -= peso;
    if (tirada < 0) return { sitio, nivel: x.nivel, tipo: x.tipo };
  }
  return { sitio: x.destinos[x.destinos.length - 1][0], nivel: x.nivel, tipo: x.tipo };
}

export interface PresenciaService {
  /**
   * Cambia cuando cambia quién hay dónde (un cambio de tramo, de día o de personas) y no antes: sirve para recordar lo que se calcula
   * a partir de la presencia sin recalcularlo en cada acción. Es un contador del proceso (distinto en cada índice construido, de cualquier partida):
   * sirve de clave de caché, no de azar ni de dato de la partida (no se guarda ni se repite al cargar).
   */
  readonly version: number;
  /**
   * Cuánta gente tienes cerca en un lugar ahora (`aforoCercano`): su azar es el día y el intervalo de presencia, es decir, solo el mundo y la hora, nunca el orden
   * en que se pidió ni lo que se jugó antes. Pásalo a `en(lugar, max)` para ver a los que tienes cerca.
   */
  aforo(lugar: string): number;
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
