import { vigoresPorEdad } from './desarrollo-de-persona';
import type { BodyType } from './services';

/**
 * EL CUERPO DE UNA PERSONA, para todas: el personaje (`personaje`), los PNJ (`npcs`) y los padres (`familia`) siguen estas reglas, que son funciones puras
 * (plan `docs/PLAN_CUERPO_Y_APARIENCIA.md`, cifras en `docs/ANEXO_CUERPO.md`). Los módulos solo guardan su estado y llaman aquí.
 */

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Interpolación lineal sobre una tabla [x, y] ordenada por x (fuera de la tabla vale lo del extremo). */
export function interpola(tabla: readonly (readonly [number, number])[], x: number): number {
  if (x <= tabla[0][0]) return tabla[0][1];
  for (let i = 1; i < tabla.length; i++) {
    if (x <= tabla[i][0]) {
      const [x0, y0] = tabla[i - 1];
      const [x1, y1] = tabla[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return tabla[tabla.length - 1][1];
}

// ------------------------------------------------------------------------------------------------------------ altura

/** Fracción de la altura adulta a cada edad (media aproximada). */
export const CRECIMIENTO: readonly (readonly [number, number])[] = [[0, 0.3], [2, 0.5], [4, 0.58], [6, 0.66], [8, 0.73], [10, 0.8], [12, 0.87], [14, 0.94], [16, 0.98], [18, 1]];

/** Pérdida de estatura en la vejez (cm por año): nada hasta los 50, `hasta70` de 50 a 70 y `desde70` a partir de los 70. */
export const PERDIDA_DE_ALTURA = { desde: 50, hasta70: 0.15, desde70: 0.3 } as const;

/** Centímetros que se han perdido a una edad por la vejez (0 hasta los 50). */
export function perdidaDeAltura(edad: number): number {
  const { desde, hasta70, desde70 } = PERDIDA_DE_ALTURA;
  if (edad <= desde) return 0;
  return hasta70 * (Math.min(edad, 70) - desde) + desde70 * Math.max(0, edad - 70);
}

/**
 * Altura (cm) a una edad (años, con decimales). `madurez` son los años de adelanto (+) o retraso (−) del desarrollo (el `madurez` del personaje, el `desfase` de un
 * niño con genética; 0 si no tiene). Una sola curva para todos, con la pérdida de la vejez.
 */
export const alturaEn = (alturaAdulta: number, edad: number, madurez = 0): number => alturaAdulta * interpola(CRECIMIENTO, edad + madurez) - perdidaDeAltura(edad);

// ------------------------------------------------------------------------------------------------------------ peso

/** IMC de referencia sano a cada edad (también de adulto). */
export const IMC_DE_REFERENCIA: readonly (readonly [number, number])[] = [[6, 15.2], [10, 16.2], [12, 17.4], [14, 18.8], [16, 20.2], [18, 21.5], [30, 23], [50, 24.5], [70, 24.5], [90, 23]];

/** Peso (kg) con la altura (cm), la edad, el músculo y la grasa (0 a 100). */
export function pesoDe(alturaCm: number, edad: number, musculo: number, grasa: number): number {
  const m = alturaCm / 100;
  return (interpola(IMC_DE_REFERENCIA, edad) + 0.04 * (musculo - 30) + 0.09 * (grasa - 40)) * m * m;
}

// ------------------------------------------------------------------------------------------------------------ complexión

/** Complexión a partir de músculo y grasa. El orden importa: lo más marcado manda. */
export function complexion(musculo: number, grasa: number): BodyType {
  if (grasa >= 65) return 'con_sobrepeso';
  if (musculo >= 60) return 'musculado';
  if (musculo >= 35 && grasa <= 45) return 'atletico';
  if (grasa <= 25 && musculo <= 30) return 'delgado';
  return 'normal';
}

// ------------------------------------------------------------------------------------------------------------ músculo y grasa

/** Minutos de la semana que cuentan para el cuerpo: los de fuerza (levantar, trepar…) y los de actividad física en general (lo que no es fuerza). */
export interface HabitosDelCuerpo {
  fuerza: number;
  activo: number;
}

/** Quién es: la edad (años con decimales), el adelanto o retraso del desarrollo y el sexo (`m` o `f`). */
export interface QuienEs {
  edad: number;
  madurez: number;
  sexo: 'f' | 'm';
}

/** Cifras del músculo y la grasa. Ajustables con la simulación. */
export const CUERPO = {
  /** Ritmo semanal al que el cuerpo se acerca a su objetivo. */
  inercia: 0.08,
  grasaBase: 78,
  grasaPorMinutoActivo: 0.1,
  /** Juego libre y recreos: actividad mínima semanal aunque no se haga deporte. */
  actividadBasica: 60,
  musculoBase: 12,
  musculoPorMinutoFuerza: 0.1,
  /** El músculo no pasa de `topeBase + topePorFisico × fisico/100` (el desarrollo físico de su edad: `vigoresPorEdad`). */
  topeBase: 15,
  topePorFisico: 75,
  /** Mujeres: su objetivo de músculo se multiplica por `mujerMusculo` y su base de grasa sube `mujerGrasa`. */
  mujerMusculo: 0.75,
  mujerGrasa: 8,
  /** Desde esta edad el objetivo de músculo baja `sarcopeniaPorAnio` por año. */
  sarcopeniaDesde: 40,
  sarcopeniaPorAnio: 0.5,
  /** Desde esta edad la base de grasa sube `metabolismoPorAnio` por año hasta un máximo de `metabolismoMax`. */
  metabolismoDesde: 30,
  metabolismoPorAnio: 0.3,
  metabolismoMax: 12,
};

/** Hacia dónde tiende el cuerpo con unos hábitos semanales, a su edad y siendo quien es. */
export function objetivoDeCuerpo(h: HabitosDelCuerpo, q: QuienEs): { musculo: number; grasa: number } {
  const mujer = q.sexo === 'f';
  const metabolismo = clamp(CUERPO.metabolismoPorAnio * (q.edad - CUERPO.metabolismoDesde), 0, CUERPO.metabolismoMax);
  const grasaBase = CUERPO.grasaBase + (mujer ? CUERPO.mujerGrasa : 0) + metabolismo;
  const grasa = clamp(grasaBase - (h.activo + CUERPO.actividadBasica) * CUERPO.grasaPorMinutoActivo, 20, 80);
  let musculo = clamp(CUERPO.musculoBase + h.fuerza * CUERPO.musculoPorMinutoFuerza, 10, 90);
  if (mujer) musculo *= CUERPO.mujerMusculo;
  musculo -= CUERPO.sarcopeniaPorAnio * Math.max(0, q.edad - CUERPO.sarcopeniaDesde);
  // Tope por desarrollo físico: un niño no se pone musculado por mucho gimnasio que haga; con la pubertad sí puede.
  const tope = CUERPO.topeBase + (CUERPO.topePorFisico * vigoresPorEdad(q.edad, q.madurez).fisico) / 100;
  return { grasa, musculo: Math.max(5, Math.min(musculo, tope)) };
}

/** Paso semanal: el músculo y la grasa se acercan a su objetivo con la inercia de hoy (8 %). */
export function pasoDeSemanaDelCuerpo(c: { musculo: number; grasa: number }, h: HabitosDelCuerpo, q: QuienEs): { musculo: number; grasa: number } {
  const obj = objetivoDeCuerpo(h, q);
  return { musculo: c.musculo + (obj.musculo - c.musculo) * CUERPO.inercia, grasa: c.grasa + (obj.grasa - c.grasa) * CUERPO.inercia };
}
