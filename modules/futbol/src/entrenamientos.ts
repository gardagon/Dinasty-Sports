import { GEN, type Entrenamiento } from '@ds/contracts';
import type { Ejercicio } from '@ds/kit-deporte';

/**
 * LOS 22 ENTRENAMIENTOS DEL FÚTBOL (decisión del 21/11/2026; informe `docs/relevo/futbol-puestos-entrenos.md` §2.3, tabla final en `docs/ANEXO_DEPORTE.md`).
 *
 * Un solo catálogo de datos, de donde salen las tres formas de entrenar:
 * - **por tu cuenta** (el desplegable «Entrenar…», agrupado en Portería, Físico, Mental y Técnico): los que se pueden hacer solo (`quien` incluye `solo`); los demás salen
 *   en el desplegable pero no disponibles, con el motivo (hace falta compañía: se hacen en el club);
 * - **con el club**: los que llevan `club` son ejercicios de la sesión del entrenador (`EJERCICIOS_DE_FUTBOL`), con las mismas cifras;
 * - **con amigos**: no es un entrenamiento, es quedar a jugar al fútbol (`quedadas.ts`, una actividad más de «Proponer quedar para…»).
 *
 * Las cifras de `entrena` son «puntos de entrenamiento por sesión» a la escala del informe; `ESCALA_DE_ENTRENAMIENTO` las lleva a la del juego (el balance, en un solo sitio).
 */

export type GrupoDeEntrenamiento = 'porteria' | 'fisico' | 'mental' | 'tecnico';
export type QuienEntrena = 'solo' | 'club';

/** Cuánto cansa: ligero, medio o fuerte (la energía exacta es `energia`). */
export interface EntrenamientoDeFutbol {
  id: string;
  /** «P1»…«T8»: la clave del informe. */
  clave: string;
  nombre: string;
  grupo: GrupoDeEntrenamiento;
  descripcion: string;
  /** Lo que sube (habilidades y capacidades), a la escala del informe. */
  entrena: readonly [string, number][];
  /** Dónde se hace por tu cuenta (ids de lugar). Con el club, en su sede. */
  lugares: readonly string[];
  /** Con quién: solo (por tu cuenta, ×0,85) y/o club (ejercicio de la sesión del entrenador). Con amigos se juega (ver `quedadas.ts`). */
  quien: readonly QuienEntrena[];
  /** Minutos que dura por tu cuenta. */
  minutos: number;
  /** Energía que cuesta (positivo) y estrés que cambia (negativo = quita). */
  energia: number;
  estres?: number;
  /** Tipo de ejercicio para el sesgo del carácter del entrenador (`sesgoDelEntrenador`) y para no repetir tipo en una sesión. */
  foco: string;
  /** Lo hace quien juega de portero (los de portería: solo ellos) o no lo hace (los de campo: el portero tiene los suyos). */
  soloPuesto?: string;
  noPara?: string;
}

export const GRUPOS_DE_ENTRENAMIENTO: Readonly<Record<GrupoDeEntrenamiento, string>> = { porteria: 'Portería', fisico: 'Físico', mental: 'Mental', tecnico: 'Técnico' };

/** El puesto del portero (id en `PUESTOS_DE_FUTBOL`). */
export const PUESTO_DE_PORTERO = 'GK';

/**
 * Lleva las cifras del informe (pensadas con ~6,5 puntos de habilidad por hora) a las del juego. Se midió con `npm run sim:futbol -- 365 3` (un deportista de campo, un curso): con 0,55 el curso salía en
 * 80 puntos de habilidad, con 0,9 en 104, con 1,2 en 119 y con 1,4 en 127, frente a los 154 de antes, **de los que ~43 eran habilidades de portería que un jugador de campo subía con «Entrenar de
 * portero»**; sin ellos, el curso de antes era ~111. Con 1 el curso sale en ~108 (el 97 %) y las capacidades del cuerpo, como antes (35). La subida se frena sola (el tope por edad): el doble de escala no da el doble.
 */
export const ESCALA_DE_ENTRENAMIENTO = 1;

/** Lo que sube el conocimiento en un entrenamiento por tu cuenta (de 0,5 a 0,8 en técnica y portería; 0,3 en el físico) y el que hay siempre. */
const CONOC = 'futbol.conocimiento';

const a = (clave: string, id: string, nombre: string, grupo: GrupoDeEntrenamiento, foco: string, descripcion: string, entrena: [string, number][], dondeYQuien: { lugares: string[]; quien: QuienEntrena[]; minutos: number; energia: number; estres?: number }, puesto?: { soloPuesto?: string; noPara?: string }): EntrenamientoDeFutbol => ({
  clave, id, nombre, grupo, foco, descripcion, entrena, ...dondeYQuien, ...puesto,
});

const COLEGIO_Y_MUNICIPAL = ['campo_colegio', 'campo_municipal'];
const TODOS_LOS_CAMPOS = ['campo_colegio', 'campo_municipal', 'parque'];
const SOLO_PORTERO = { soloPuesto: PUESTO_DE_PORTERO };
const NO_PORTERO = { noPara: PUESTO_DE_PORTERO };

export const ENTRENAMIENTOS_DE_FUTBOL: readonly EntrenamientoDeFutbol[] = [
  // ---------------------------------------------------------------------------------------------------- Portería
  a('P1', 'reflejos', 'Reflejos y paradas', 'porteria', 'porteros', 'Paradas a bocajarro, desvíos y blocajes: que te tiren y reaccionar.',
    [['futbol.reflejos', 3.5], ['futbol.blocaje', 2], ['futbol.mano_a_mano', 1], [GEN.coordinacion, 0.5], [CONOC, 0.7]], { lugares: COLEGIO_Y_MUNICIPAL, quien: ['solo', 'club'], minutos: 60, energia: 14 }, SOLO_PORTERO),
  a('P2', 'balones_aereos', 'Centros y balones aéreos', 'porteria', 'porteros', 'Salir a por los centros, atrapar los balones por alto y dominar el área pequeña.',
    [['futbol.alcance_aereo', 2.5], ['futbol.dominio_area', 2], ['futbol.blocaje', 1.5], ['futbol.salto', 0.5], [CONOC, 0.7]], { lugares: COLEGIO_Y_MUNICIPAL, quien: ['club'], minutos: 60, energia: 14 }, SOLO_PORTERO),
  a('P3', 'mano_a_mano', 'Mano a mano y salidas', 'porteria', 'porteros', 'Salir al cruce del delantero que se planta solo y decidir rápido: cerrar el ángulo, tirarse o esperar.',
    [['futbol.mano_a_mano', 3], ['futbol.dominio_area', 1.5], ['futbol.anticipacion', 1], ['futbol.sangre_fria', 1], [CONOC, 0.7]], { lugares: COLEGIO_Y_MUNICIPAL, quien: ['club'], minutos: 45, energia: 12 }, SOLO_PORTERO),
  a('P4', 'pies_de_portero', 'Pies de portero', 'porteria', 'porteros', 'Despejes y saques con el pie, pases cortos y largos, control con los pies: jugar con la defensa.',
    [['futbol.despeje', 3], ['futbol.pase', 1.5], ['futbol.control', 1], ['futbol.vision', 1], [CONOC, 0.6]], { lugares: TODOS_LOS_CAMPOS, quien: ['solo', 'club'], minutos: 60, energia: 10 }, SOLO_PORTERO),
  a('P5', 'mando_del_area', 'Mando del área', 'porteria', 'porteros', 'Colocar a la defensa, dar voces y leer el juego desde atrás.',
    [['futbol.dominio_area', 2.5], ['futbol.posicionamiento', 2], ['futbol.decisiones', 1], ['futbol.juego_colectivo', 1], [GEN.comunicacion, 0.3], [CONOC, 0.7]], { lugares: ['campo_municipal'], quien: ['club'], minutos: 60, energia: 8 }, SOLO_PORTERO),

  // ---------------------------------------------------------------------------------------------------- Físico
  a('F1', 'velocidad', 'Velocidad y arrancadas', 'fisico', 'fisico', 'Series cortas, salidas explosivas y cambios de ritmo.',
    [['futbol.arrancada', 3.5], [GEN.velocidad, 1.2], [GEN.agilidad, 0.4], [CONOC, 0.3]], { lugares: TODOS_LOS_CAMPOS, quien: ['solo', 'club'], minutos: 45, energia: 18 }),
  a('F2', 'carrera_continua', 'Carrera continua', 'fisico', 'fisico', 'Rodar a un ritmo suave para ganar fondo: aguantar un partido entero.',
    [[GEN.resistencia, 2.5], [CONOC, 0.3]], { lugares: ['parque', 'campo_colegio'], quien: ['solo'], minutos: 60, energia: 16, estres: -4 }),
  a('F3', 'fuerza_y_saltos', 'Fuerza y saltos', 'fisico', 'fisico', 'Pesas ligeras, sentadillas y saltos en el gimnasio.',
    [['futbol.salto', 2], ['futbol.entrada', 0.5], [GEN.fuerza, 1.5], [CONOC, 0.3]], { lugares: ['gimnasio'], quien: ['solo', 'club'], minutos: 60, energia: 18 }),
  a('F4', 'agilidad', 'Agilidad y coordinación', 'fisico', 'fisico', 'Escaleras, conos, vallas y cambios de dirección.',
    [['futbol.arrancada', 1.5], ['futbol.control', 0.5], [GEN.agilidad, 1.2], [GEN.coordinacion, 1.2], [CONOC, 0.3]], { lugares: ['campo_colegio', 'parque'], quien: ['solo', 'club'], minutos: 45, energia: 10 }),
  a('F5', 'saltos_y_cabeceo', 'Saltos y cabeceo', 'fisico', 'fisico', 'Ganar los balones por alto: salto, tiempo y cabezazo.',
    [['futbol.salto', 2.5], ['futbol.cabeza', 2], [GEN.fuerza, 0.3], [CONOC, 0.3]], { lugares: COLEGIO_Y_MUNICIPAL, quien: ['club'], minutos: 45, energia: 14 }, NO_PORTERO),

  // ---------------------------------------------------------------------------------------------------- Mental
  a('M1', 'pizarra_y_video', 'Pizarra y vídeo de jugadas', 'mental', 'tactica', 'Estudiar jugadas en la pizarra y en vídeo: dónde estaba cada uno y por qué.',
    [['futbol.vision', 2], ['futbol.decisiones', 1.5], ['futbol.posicionamiento', 1.5], [CONOC, 1]], { lugares: ['casa', 'biblioteca'], quien: ['solo'], minutos: 45, energia: 3, estres: 2 }),
  a('M2', 'posicionamiento_y_anticipacion', 'Posicionamiento y anticipación', 'mental', 'tactica', 'Moverse con la línea, cerrar espacios y llegar antes que el rival a la jugada.',
    [['futbol.posicionamiento', 2.5], ['futbol.anticipacion', 2.5], ['futbol.desmarque', 1], [CONOC, 0.6]], { lugares: COLEGIO_Y_MUNICIPAL, quien: ['club'], minutos: 60, energia: 14 }),
  a('M3', 'juegos_reducidos', 'Juegos reducidos (3 contra 3)', 'mental', 'tactica', 'Partidillos en poco espacio, con pocos toques: obligan a decidir rápido.',
    [['futbol.decisiones', 2.5], ['futbol.vision', 1.5], ['futbol.juego_colectivo', 1.5], ['futbol.sangre_fria', 0.5], [CONOC, 0.6]], { lugares: TODOS_LOS_CAMPOS, quien: ['club'], minutos: 60, energia: 16 }, NO_PORTERO),
  a('M4', 'bajo_presion', 'Bajo presión (marcador, penaltis)', 'mental', 'tactica', 'Competir contra el reloj y el marcador: tandas de penaltis y finales inventadas.',
    [['futbol.sangre_fria', 3], ['futbol.penaltis', 1], [GEN.concentracion, 0.5], [CONOC, 0.6]], { lugares: COLEGIO_Y_MUNICIPAL, quien: ['club'], minutos: 45, energia: 10 }),

  // ---------------------------------------------------------------------------------------------------- Técnico (de campo: el portero tiene los suyos)
  a('T1', 'toques_y_pared', 'Toques y pared', 'tecnico', 'tecnica', 'Controles, toques y pases contra la pared por tu cuenta.',
    [['futbol.control', 3], ['futbol.pase', 2], ['futbol.tecnica', 1.5], [CONOC, 0.8]], { lugares: TODOS_LOS_CAMPOS, quien: ['solo', 'club'], minutos: 60, energia: 14 }, NO_PORTERO),
  a('T2', 'regate', 'Regate y conducción', 'tecnico', 'tecnica', 'Conducir el balón entre conos y regatear en espacios cortos.',
    [['futbol.regate', 3.5], ['futbol.control', 1.5], ['futbol.tecnica', 1.5], [CONOC, 0.8]], { lugares: TODOS_LOS_CAMPOS, quien: ['solo', 'club'], minutos: 60, energia: 14 }, NO_PORTERO),
  a('T3', 'rondos_y_pase', 'Rondos y pase', 'tecnico', 'tecnica', 'Rondos a un toque: pasar, moverse y volver a recibir.',
    [['futbol.pase', 3], ['futbol.juego_colectivo', 1.5], ['futbol.vision', 1], ['futbol.control', 1], [CONOC, 0.8]], { lugares: TODOS_LOS_CAMPOS, quien: ['club'], minutos: 60, energia: 14 }, NO_PORTERO),
  a('T4', 'tiro_a_puerta', 'Tiro a puerta', 'tecnico', 'ataque', 'Tiros a puerta desde dentro y fuera del área, de primeras y con el balón controlado.',
    [['futbol.definicion', 3.5], ['futbol.disparo_lejano', 2], ['futbol.sangre_fria', 1], [GEN.fuerza, 0.3], [CONOC, 0.8]], { lugares: COLEGIO_Y_MUNICIPAL, quien: ['solo', 'club'], minutos: 60, energia: 14 }, NO_PORTERO),
  a('T5', 'centros_y_remates', 'Centros y remates', 'tecnico', 'ataque', 'Centros desde la banda y rematar de cabeza o a media altura.',
    [['futbol.centros', 3], ['futbol.cabeza', 2], ['futbol.desmarque', 1.5], [CONOC, 0.8]], { lugares: COLEGIO_Y_MUNICIPAL, quien: ['club'], minutos: 60, energia: 14 }, NO_PORTERO),
  a('T6', 'uno_contra_uno', 'Defensa uno contra uno', 'tecnico', 'defensa', 'Frenar al regateador, seguirle y quitarle el balón sin hacer falta.',
    [['futbol.marcaje', 2.5], ['futbol.entrada', 2.5], ['futbol.anticipacion', 1], ['futbol.posicionamiento', 0.5], [CONOC, 0.8]], { lugares: COLEGIO_Y_MUNICIPAL, quien: ['club'], minutos: 60, energia: 16 }, NO_PORTERO),
  a('T7', 'balon_parado', 'Balón parado', 'tecnico', 'balon_parado', 'Faltas, penaltis, córners y saques de banda largos.',
    [['futbol.faltas', 2], ['futbol.penaltis', 2], ['futbol.corners', 1.5], ['futbol.saque_banda', 1], [CONOC, 0.6]], { lugares: COLEGIO_Y_MUNICIPAL, quien: ['solo', 'club'], minutos: 60, energia: 8 }, NO_PORTERO),
  a('T8', 'malabares', 'Malabares y técnica individual', 'tecnico', 'tecnica', 'Malabares, toques de cabeza y de muslo y jugar con el balón en cualquier sitio.',
    [['futbol.tecnica', 3.5], ['futbol.control', 2], [GEN.coordinacion, 0.5], [CONOC, 0.6]], { lugares: ['casa', 'parque'], quien: ['solo'], minutos: 45, energia: 8 }, NO_PORTERO),
];

/** Las cifras a la escala del juego (`ESCALA_DE_ENTRENAMIENTO`) y, si hace falta, llevadas a otra duración (60 minutos para el club). */
export function aEscala(entrena: readonly [string, number][], factor = 1): Entrenamiento[] {
  return entrena.map(([stat, amount]) => ({ stat, amount: Math.round(amount * factor * ESCALA_DE_ENTRENAMIENTO * 1000) / 1000 }));
}

/** Lo que sube un entrenamiento por tu cuenta (antes del ×0,85 del kit). */
export const entrenaPorLibre = (e: EntrenamientoDeFutbol): Entrenamiento[] => aEscala(e.entrena);

/**
 * El mismo entrenamiento como ejercicio de la sesión del club: una hora de trabajo con el entrenador (los de 45 minutos se llevan a 60, porque la sesión reparte las dos horas en dos ejercicios),
 * así que **por hora el club rinde más que por libre** (sin el ×0,85 de entrenar solo, y con el conocimiento que sube siempre).
 */
export const ejercicioDelClub = (e: EntrenamientoDeFutbol): Ejercicio => ({
  id: e.id,
  nombre: e.nombre.toLowerCase(),
  foco: e.foco,
  entrena: aEscala(e.entrena.filter(([stat]) => stat !== CONOC), 60 / e.minutos),
  ...(e.soloPuesto ? { soloPuesto: e.soloPuesto } : {}),
  ...(e.noPara ? { noPara: e.noPara } : {}),
});

export const entrenamientosPorLibre = ENTRENAMIENTOS_DE_FUTBOL.filter((e) => e.quien.includes('solo'));
export const entrenamientosDelClub = ENTRENAMIENTOS_DE_FUTBOL.filter((e) => e.quien.includes('club'));
export const entrenamientoPorId = (id: string): EntrenamientoDeFutbol | undefined => ENTRENAMIENTOS_DE_FUTBOL.find((e) => e.id === id);
