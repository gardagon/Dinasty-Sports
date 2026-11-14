import { FRACCION_EN_MOVIMIENTO_DE_EDUCACION_FISICA, CUERPO, type QuienEs, metabolismoZ, musculaturaZ, complexion, conFotoDelCumple, objetivoDeCuerpo, rngEstable, type HabitosDelCuerpo } from '@ds/contracts';
import type { Npc } from './index';

/**
 * El cuerpo de los PNJ: músculo y grasa reales para todos, con las mismas reglas que el personaje (`cuerpo.ts` de contracts; plan `docs/PLAN_CUERPO_Y_APARIENCIA.md` §4).
 * Aquí está lo que decide cuántos minutos de fuerza y de actividad hace cada uno a la semana. Cifras en `docs/ANEXO_CUERPO.md`.
 */

/** Minutos que cuenta cada sesión de club. La actividad incluye la fuerza (como en el personaje: toda acción de fuerza es también física). */
export const MINUTOS_DE_SESION = { activo: 90, fuerza: 30 } as const;
/** Sesiones de club por semana que se suponen a quien ya jugaba al crear la partida (su historia de peso no se simula). */
export const SESIONES_SUPUESTAS = 2;
/** Minutos extra de actividad por nivel de interés en el deporte (0 a 3: de 0 a 120) de quien es niño o joven y no juega con rutina. */
export const EXTRA_POR_NIVEL_DE_INTERES = 40;
/** Juego libre de fuera del colegio de un niño o joven (tardes, fines de semana y vacaciones; minutos por semana, estable por persona): `max × azar^potencia`. Calibrado con `npm run sim:cuerpo`. */
export const JUEGO_LIBRE = { max: 130, potencia: 0.5 };
/**
 * El recreo: cada día de clase, un niño en edad escolar juega con una probabilidad estable por persona (de `desde` a `hasta`, según su interés en el deporte y su sociabilidad) y
 * suma `minutos` si juega (la misma decisión que toma el personaje con «Jugar con otros niños»).
 */
export const RECREO = { desde: 0.4, hasta: 0.9, minutos: 30, pesoDelInteres: 0.7, pesoDeLaSociabilidad: 0.3 };
/** Edades (años cumplidos) en que se va al colegio y, por tanto, hay recreo. */
export const EDAD_DE_RECREO = { desde: 3, hasta: 17 } as const;
/** Curso 0 = 3.º de primaria = 8 años de edad de competición: el curso de un PNJ es su edad de competición menos esto. */
export const EDAD_DEL_CURSO_0 = 8;
/**
 * Al crear la partida (y cuando llega alguien nuevo al empezar un curso) se acaba de salir de las vacaciones: el cuerpo conserva parte de lo que ganó con el recreo y la Educación
 * física del curso. Se supone `peso` de lo que darían en una semana media del curso (la fracción `lectiva` de las semanas tiene clase), y de Educación física `educacionFisica`
 * minutos por semana lectiva (aún no se sabe lo que da la asignatura del país: la dan los estudios al jugar).
 */
export const ESCOLAR_AL_EMPEZAR = { peso: 0.5, educacionFisica: 150 };
/** Hasta qué edad (sin llegar a ella) se es «niño o joven» a efectos de hábitos. */
export const EDAD_ADULTA_DE_HABITOS = 18;

/** Hábitos de un adulto (minutos por semana): su actividad propia y su fuerza. Se guardan en la persona (`actividad`) y cambian un poco en cada cumpleaños. */
export const ACTIVIDAD_ADULTA = {
  /** Reparto de la actividad: `max × azar^potencia`, más `porInteres` por nivel de interés en el deporte. */
  activoMax: 800,
  activoPotencia: 1.3,
  porInteres: 50,
  /** La fuerza es esta fracción de la actividad por otro azar de la persona (`max × azar^potencia`), tope por su actividad. */
  fuerzaMax: 560,
  fuerzaPotencia: 2.5,
  mezclaFuerza: 0.7,
  /** Cambio anual: desviación normal (minutos) y probabilidad de un salto grande (empezar o dejar el deporte). */
  cambioAnual: 30,
  probSalto: 0.05,
  salto: 200,
  tope: 900,
};

const redondea = (v: number) => Math.round(v);
const redondea2 = (v: number) => Math.round(v * 100) / 100;
const interesDeporte = (n: Npc): number => n.rasgos?.intereses?.deporte ?? 0;

/** La actividad estable de un adulto, sacada de su semilla y de su interés en el deporte: [actividad, fuerza] en minutos por semana. */
export function actividadDeAdulto(n: Pick<Npc, 'id' | 'rasgos'>, semilla: number): [number, number] {
  const a = ACTIVIDAD_ADULTA;
  const r = rngEstable('actividad', semilla, n.id);
  const u = r.next();
  const activo = redondea(a.activoMax * u ** a.activoPotencia + a.porInteres * (n.rasgos?.intereses?.deporte ?? 0));
  // Quien se mueve mucho suele hacer también algo de fuerza: su fuerza mezcla otro azar suyo con lo activo que es (`mezclaFuerza`).
  const fuerza = redondea(Math.min(activo, a.fuerzaMax * ((1 - a.mezclaFuerza) * r.next() + a.mezclaFuerza * Math.min(1, activo / a.activoMax)) ** a.fuerzaPotencia));
  return [activo, fuerza];
}

/** Cada cumpleaños, un sorteo pequeño: casi todos cambian poco; hay quien empieza a correr y quien lo deja. */
export function actividadTrasElCumple(actual: readonly [number, number], n: Pick<Npc, 'id'>, semilla: number, edad: number): [number, number] {
  const a = ACTIVIDAD_ADULTA;
  const r = rngEstable('actividad_anual', semilla, n.id, edad);
  let activo = actual[0] + r.normal() * a.cambioAnual;
  if (r.chance(a.probSalto)) activo += (r.chance(0.5) ? 1 : -1) * a.salto;
  activo = Math.min(a.tope, Math.max(0, activo));
  const fuerza = Math.min(activo, Math.max(0, actual[1] + r.normal() * a.cambioAnual * 0.5));
  return [redondea(activo), redondea(fuerza)];
}

/** Lo de cada persona que no cambia: una semilla numérica para sus sorteos de cada semana, su juego libre y su probabilidad de jugar en el recreo. */
interface Propio { h: number; libre: number; pRecreo: number }
// Por persona (no por texto): se pide cada semana para todos y el texto con la semilla costaba más que el resto del paso.
const PROPIOS = new WeakMap<Npc, Propio>();
function propioDe(n: Npc, semilla: number): Propio {
  let p = PROPIOS.get(n);
  if (!p) {
    const clave = `${semilla}|${n.id}`;
    let h = 0x811c9dc5;
    for (let i = 0; i < clave.length; i++) h = Math.imul(h ^ clave.charCodeAt(i), 0x01000193);
    const soci = ((n.rasgos?.caracter?.sociabilidad ?? 0) + 50) / 100;
    const gana = Math.min(1, Math.max(0, (RECREO.pesoDelInteres * interesDeporte(n)) / 3 + RECREO.pesoDeLaSociabilidad * soci));
    PROPIOS.set(n, (p = { h, libre: Math.round(JUEGO_LIBRE.max * rngEstable('juego_libre', semilla, n.id).next() ** JUEGO_LIBRE.potencia), pRecreo: RECREO.desde + (RECREO.hasta - RECREO.desde) * gana }));
  }
  return p;
}
/** Un azar estable en [0, 1) por persona, semana y día (aritmética de enteros: se pide cada semana para todos). */
function azarDeLaSemana(h: number, semana: number, dia: number): number {
  let t = (h ^ Math.imul(semana + 1, 0x9e3779b1) ^ Math.imul(dia + 1, 0x85ebca6b)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), 0x85ebca6b);
  t = Math.imul(t ^ (t >>> 13), 0xc2b2ae35);
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
}

/** Lo que pasa en el colegio esa semana: los días de clase, los minutos de Educación física de cada curso (0 = 3.º de primaria) en una semana lectiva entera y cómo saber el curso de cada uno. */
export interface SemanaEscolar {
  diasDeClase: number;
  efPorCurso: readonly number[];
  /** Edad de competición de la persona (años), o `undefined` si no se sabe. */
  edadDeCurso(n: Npc): number | undefined;
}

/**
 * Los minutos de la semana de una persona: de base, si es niño o joven, su juego libre de fuera del colegio más un extra según su interés en el deporte; si es adulto, su actividad
 * propia. Si va al colegio (de 3 a 17 años), además: el recreo de cada día de clase que juega (`RECREO`) y, en los cursos que la tienen, los minutos reales de Educación física
 * de la semana (los de los días de clase). Si juega a un deporte con rutina, además los de sus sesiones de club (`sesiones`). (La actividad básica, 60 min, la suma `objetivoDeCuerpo`.)
 * `semana` es el número de semana (para los sorteos de cada recreo). Quien deja el deporte o se lesiona se queda sin las sesiones.
 */
export function habitosDeNpc(n: Npc, edad: number, semilla: number, sesiones = 0, escolar?: SemanaEscolar, semana = 0): HabitosDelCuerpo {
  let activo: number;
  let fuerza: number;
  if (edad < EDAD_ADULTA_DE_HABITOS) {
    const p = propioDe(n, semilla);
    activo = p.libre + EXTRA_POR_NIVEL_DE_INTERES * interesDeporte(n);
    fuerza = 0;
    if (escolar && edad >= EDAD_DE_RECREO.desde && escolar.diasDeClase > 0) {
      let jugados = 0;
      for (let d = 0; d < escolar.diasDeClase; d++) if (azarDeLaSemana(p.h, semana, d) < p.pRecreo) jugados++;
      activo += jugados * RECREO.minutos;
      const edadCurso = escolar.edadDeCurso(n);
      if (edadCurso !== undefined) activo += ((escolar.efPorCurso[edadCurso - EDAD_DEL_CURSO_0] ?? 0) * escolar.diasDeClase * FRACCION_EN_MOVIMIENTO_DE_EDUCACION_FISICA) / 5;
    }
  } else {
    [activo, fuerza] = n.actividad ?? actividadDeAdulto(n, semilla);
  }
  return { activo: activo + sesiones * MINUTOS_DE_SESION.activo, fuerza: fuerza + sesiones * MINUTOS_DE_SESION.fuerza };
}

/** Su genética del cuerpo (puntuaciones típicas): la heredada si la tiene guardada (padres y hermanos) y, si no, la estable por su id. */
const GENETICAS = new WeakMap<object, { metabolismo: number; musculatura: number }>();
export function geneticaDelCuerpo(n: Pick<Npc, 'id' | 'metabolismo' | 'musculatura'>): { metabolismo: number; musculatura: number } {
  // Por persona: dependen solo de lo que tiene guardado o de su id, y se piden cada semana para todos.
  let z = GENETICAS.get(n);
  if (!z) GENETICAS.set(n, (z = { metabolismo: n.metabolismo ?? metabolismoZ(n.id), musculatura: n.musculatura ?? musculaturaZ(n.id) }));
  return z;
}

/** Si el PNJ puede tener cuerpo: hace falta su fecha de nacimiento (de ella salen su edad y su desarrollo). */
const tieneCuerpo = (n: Npc) => n.nacimiento !== undefined;

/**
 * Da su cuerpo a quien aún no lo tiene (al crear la partida, al llegar alguien nuevo): el equilibrio de su regla de hábitos a su edad, como si llevara años así, con un
 * pequeño ruido propio. Los que ya jugaban a un deporte con club se suponen `SESIONES_SUPUESTAS` sesiones por semana.
 */
export function conCuerpo(npcs: Npc[], dia: number, semilla: number, lectiva = 0.7): Npc[] {
  // Si nadie lo necesita se devuelve la misma lista (cambiarla invalida las cachés de presencia y de consultas).
  if (!npcs.some((n) => tieneCuerpo(n) && !n.cuerpo)) return npcs;
  return npcs.map((n) => {
    if (!tieneCuerpo(n) || n.cuerpo) return n;
    const edad = (dia - n.nacimiento!) / 365;
    const actividad = edad >= EDAD_ADULTA_DE_HABITOS ? (n.actividad ?? actividadDeAdulto(n, semilla)) : undefined;
    const sesiones = n.equipo && n.deporte ? SESIONES_SUPUESTAS : 0;
    const base = habitosDeNpc(actividad ? { ...n, actividad } : n, edad, semilla, sesiones);
    const escolar = edad >= EDAD_DE_RECREO.desde && edad < EDAD_ADULTA_DE_HABITOS;
    const deColegio = escolar ? lectiva * ESCOLAR_AL_EMPEZAR.peso * (5 * propioDe(n, semilla).pRecreo * RECREO.minutos + (edad >= EDAD_DEL_CURSO_0 ? ESCOLAR_AL_EMPEZAR.educacionFisica * FRACCION_EN_MOVIMIENTO_DE_EDUCACION_FISICA : 0)) : 0;
    const habitos = { ...base, activo: base.activo + deColegio };
    const obj = objetivoDeCuerpo(habitos, { edad, madurez: n.desfase ?? 0, sexo: n.gender, ...geneticaDelCuerpo(n) });
    const r = rngEstable('cuerpo', semilla, n.id);
    const musculo = Math.max(5, obj.musculo + r.normal() * 2);
    const grasa = Math.min(80, Math.max(20, obj.grasa + r.normal() * 4));
    return { ...n, cuerpo: [redondea2(musculo), redondea2(grasa)], ...(actividad ? { actividad } : {}) };
  });
}

/**
 * Una semana del cuerpo de todos, **en el sitio** (no cambia la lista de personas: ver `avanzarCapacidadesEnSitio`). `fin` es el día en que acaba la semana; `sesiones` dice
 * cuántas sesiones de club hizo cada jugador de un deporte con rutina esa semana. En cada cumpleaños de un adulto su actividad cambia un poco, y de todos se guarda una foto del cuerpo.
 */
export function semanaDelCuerpo(npcs: readonly Npc[], fin: number, sesiones: ReadonlyMap<string, number>, semilla: number, escolar?: SemanaEscolar): void {
  // Se hace cada semana para todos (más de mil personas): un solo `QuienEs` que se reutiliza y el paso semanal (`pasoDeSemanaDelCuerpo`) hecho en el sitio.
  const q: QuienEs = { edad: 0, madurez: 0, sexo: 'm' };
  const semana = Math.round(fin / 7);
  const haySesiones = sesiones.size > 0;
  for (const n of npcs) {
    const c = n.cuerpo;
    if (!c || n.nacimiento === undefined) continue;
    const edad = (fin - n.nacimiento) / 365;
    const edadCumplida = Math.floor(edad);
    const cumple = edadCumplida > Math.floor(edad - 7 / 365);
    if (edad >= EDAD_ADULTA_DE_HABITOS) {
      if (!n.actividad) n.actividad = actividadDeAdulto(n, semilla);
      else if (cumple) n.actividad = actividadTrasElCumple(n.actividad, n, semilla, edadCumplida);
    }
    const z = geneticaDelCuerpo(n);
    q.edad = edad;
    q.madurez = n.desfase ?? 0;
    q.sexo = n.gender;
    q.metabolismo = z.metabolismo;
    q.musculatura = z.musculatura;
    const obj = objetivoDeCuerpo(habitosDeNpc(n, edad, semilla, haySesiones ? (sesiones.get(n.id) ?? 0) : 0, escolar, semana), q);
    c[0] = redondea2(c[0] + (obj.musculo - c[0]) * CUERPO.inercia);
    c[1] = redondea2(c[1] + (obj.grasa - c[1]) * CUERPO.inercia);
    // En cada cumpleaños, una foto del cuerpo para el historial (la primera que haya es la de su primer cumpleaños de la partida).
    if (cumple) n.hc = conFotoDelCumple(n.hc, edadCumplida, c[0], c[1]);
  }
}

/** Su complexión de hoy (`undefined` si aún no tiene cuerpo). */
export const complexionDe = (n: Pick<Npc, 'cuerpo'>) => (n.cuerpo ? complexion(n.cuerpo[0], n.cuerpo[1]) : undefined);
