import { complexion, conFotoDelCumple, objetivoDeCuerpo, pasoDeSemanaDelCuerpo, rngEstable, type HabitosDelCuerpo } from '@ds/contracts';
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
/** Juego libre extra de un niño o joven (minutos por semana, estable por persona): `max × azar^potencia`. Calibrado con `npm run sim:cuerpo` frente a los objetivos del plan §7. */
export const JUEGO_LIBRE = { max: 340, potencia: 0.5 };
/** Hasta qué edad (sin llegar a ella) se es «niño o joven» a efectos de hábitos. */
export const EDAD_ADULTA_DE_HABITOS = 18;

/** Hábitos de un adulto (minutos por semana): su actividad propia y su fuerza. Se guardan en la persona (`actividad`) y cambian un poco en cada cumpleaños. */
export const ACTIVIDAD_ADULTA = {
  /** Reparto de la actividad: `max × azar^potencia`, más `porInteres` por nivel de interés en el deporte. */
  activoMax: 1100,
  activoPotencia: 1.6,
  porInteres: 50,
  /** La fuerza es esta fracción de la actividad por otro azar de la persona (`max × azar^potencia`), tope por su actividad. */
  fuerzaMax: 560,
  fuerzaPotencia: 3,
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
  const activo = redondea(a.activoMax * r.next() ** a.activoPotencia + a.porInteres * (n.rasgos?.intereses?.deporte ?? 0));
  const fuerza = redondea(Math.min(activo, a.fuerzaMax * r.next() ** a.fuerzaPotencia));
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

/** El juego libre de un niño o joven: estable por persona. */
export const juegoLibreDe = (n: Pick<Npc, 'id'>, semilla: number): number => Math.round(JUEGO_LIBRE.max * rngEstable('juego_libre', semilla, n.id).next() ** JUEGO_LIBRE.potencia);

/**
 * Los minutos de la semana de una persona: de base, si es niño o joven, su juego libre más un extra según su interés en el deporte; si es adulto, su actividad propia.
 * Si juega a un deporte con rutina, además los de sus sesiones de la semana (`sesiones`). (La actividad básica, 60 min de juego libre del personaje, la suma `objetivoDeCuerpo`.)
 * Quien deja el deporte o se lesiona se queda con la base.
 */
export function habitosDeNpc(n: Npc, edad: number, semilla: number, sesiones = 0): HabitosDelCuerpo {
  let activo: number;
  let fuerza: number;
  if (edad < EDAD_ADULTA_DE_HABITOS) {
    activo = juegoLibreDe(n, semilla) + EXTRA_POR_NIVEL_DE_INTERES * interesDeporte(n);
    fuerza = 0;
  } else {
    [activo, fuerza] = n.actividad ?? actividadDeAdulto(n, semilla);
  }
  return { activo: activo + sesiones * MINUTOS_DE_SESION.activo, fuerza: fuerza + sesiones * MINUTOS_DE_SESION.fuerza };
}

/** Si el PNJ puede tener cuerpo: hace falta su fecha de nacimiento (de ella salen su edad y su desarrollo). */
const tieneCuerpo = (n: Npc) => n.nacimiento !== undefined;

/**
 * Da su cuerpo a quien aún no lo tiene (al crear la partida, al llegar alguien nuevo): el equilibrio de su regla de hábitos a su edad, como si llevara años así, con un
 * pequeño ruido propio. Los que ya jugaban a un deporte con club se suponen `SESIONES_SUPUESTAS` sesiones por semana.
 */
export function conCuerpo(npcs: Npc[], dia: number, semilla: number): Npc[] {
  // Si nadie lo necesita se devuelve la misma lista (cambiarla invalida las cachés de presencia y de consultas).
  if (!npcs.some((n) => tieneCuerpo(n) && !n.cuerpo)) return npcs;
  return npcs.map((n) => {
    if (!tieneCuerpo(n) || n.cuerpo) return n;
    const edad = (dia - n.nacimiento!) / 365;
    const actividad = edad >= EDAD_ADULTA_DE_HABITOS ? (n.actividad ?? actividadDeAdulto(n, semilla)) : undefined;
    const sesiones = n.equipo && n.deporte ? SESIONES_SUPUESTAS : 0;
    const habitos = habitosDeNpc(actividad ? { ...n, actividad } : n, edad, semilla, sesiones);
    const obj = objetivoDeCuerpo(habitos, { edad, madurez: n.desfase ?? 0, sexo: n.gender });
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
export function semanaDelCuerpo(npcs: readonly Npc[], fin: number, sesiones: ReadonlyMap<string, number>, semilla: number): void {
  for (const n of npcs) {
    if (!n.cuerpo || n.nacimiento === undefined) continue;
    const edad = (fin - n.nacimiento) / 365;
    const edadCumplida = Math.floor(edad);
    if (edad >= EDAD_ADULTA_DE_HABITOS) {
      if (!n.actividad) n.actividad = actividadDeAdulto(n, semilla);
      else if (edadCumplida > Math.floor((fin - 7 - n.nacimiento) / 365)) n.actividad = actividadTrasElCumple(n.actividad, n, semilla, edadCumplida);
    }
    const { musculo, grasa } = pasoDeSemanaDelCuerpo({ musculo: n.cuerpo[0], grasa: n.cuerpo[1] }, habitosDeNpc(n, edad, semilla, sesiones.get(n.id) ?? 0), { edad, madurez: n.desfase ?? 0, sexo: n.gender });
    n.cuerpo = [redondea2(musculo), redondea2(grasa)];
    // En cada cumpleaños, una foto del cuerpo para el historial (la primera que haya es la de su primer cumpleaños de la partida).
    if (edadCumplida > Math.floor((fin - 7 - n.nacimiento) / 365)) n.hc = conFotoDelCumple(n.hc, edadCumplida, n.cuerpo[0], n.cuerpo[1]);
  }
}

/** Su complexión de hoy (`undefined` si aún no tiene cuerpo). */
export const complexionDe = (n: Pick<Npc, 'cuerpo'>) => (n.cuerpo ? complexion(n.cuerpo[0], n.cuerpo[1]) : undefined);
