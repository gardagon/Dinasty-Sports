import type { LecturaDePuesto, ConsejoDeDeporte, Gender } from './services';
import { familiaDePuesto, listaConY, valoresPorFamilia, type FamiliaDePuestos, type PistasDePuestos, type PuestosDeDeporte } from './deporte-datos';
import { componerTexto } from './sucesos/texto';

/**
 * Cómo se escriben las pistas sobre los puestos (el porqué del consejo, la respuesta a «Preguntar por un puesto» y la recomendación de entrenamientos). Las reglas de qué cualidades destacan las pone
 * quien mide (`npcs`); aquí solo se **monta el texto** con las plantillas del deporte (`PistasDePuestos`) y se concuerda con el género de quien habla (`{quien:o|a}`) y del personaje (`{yo:o|a}`).
 * Lo comparten el profesor (`estudios`) y el entrenador (kit): ningún módulo copia estas frases.
 */

/** Quien habla (el profesor o el entrenador): nombre y género para concordar. */
export interface QuienHabla {
  nombre: string;
  gender: Gender;
}

function componer(plantilla: string, quien: QuienHabla | undefined, señal: Record<string, unknown>): string {
  return componerTexto(plantilla, {
    // El personaje aún no tiene género en los textos de las acciones (`modules/sucesos`: «yo» es masculino): se usa lo mismo.
    yo: { nombre: 'tú', gender: 'm' },
    papeles: quien ? { quien: { nombre: quien.nombre, gender: quien.gender } } : {},
    señal,
  });
}

/** El porqué del consejo del profesor: «Me fijo en esto: eres de los más rápidos de tu edad y arrancas muy bien.» (sin cualidades, la frase de «aún no destacas»). `undefined` si el deporte no da pistas. */
export function fraseDelPorque(c: Pick<ConsejoDeDeporte, 'tiene' | 'pistas'>, quien?: QuienHabla): string | undefined {
  const p = c.pistas;
  if (!p) return undefined;
  return componer(c.tiene?.length ? p.porque.conMotivo : p.porque.sinMotivo, quien, { tiene: listaConY(c.tiene ?? []) });
}

/** La respuesta a «Preguntar por un puesto»: según lo cerca que estás (`ya`, `cerca`, `lejos`, `sinDatos`), lo que tienes y lo que te falta. */
export function fraseDeLectura(l: LecturaDePuesto, quien?: QuienHabla): string | undefined {
  const p = l.pistas;
  if (!p) return undefined;
  // Si no hay qué decir de lo que tienes o de lo que falta, se pasa a la frase de más cerca o más lejos que sí tenga con qué (`cerca` sin faltas ya es `ya`; `lejos` sin faltas, `sinDatos`).
  let nivel = l.nivel;
  if (nivel === 'cerca' && !l.falta.length) nivel = 'ya';
  if (nivel === 'cerca' && !l.tiene.length) nivel = 'lejos';
  if ((nivel === 'ya' && !l.tiene.length) || (nivel === 'lejos' && !l.falta.length)) nivel = 'sinDatos';
  return componer(p.lectura[nivel], quien, { puesto: l.familia.nombre.toLowerCase(), tiene: listaConY(l.tiene), falta: listaConY(l.falta) });
}

/**
 * La recomendación de un entrenamiento por su nombre para lo que más frena tu puesto (`falta`, ya escrito). Sin nada que te frene, `yaEntrenas`; si algo te frena pero ningún entrenamiento lo sube
 * (`entreno` vacío), `sinEntreno`.
 */
export function fraseDeEntrenamiento(p: PistasDePuestos, puesto: string, falta: readonly string[], entreno: string | undefined, quien?: QuienHabla, soloEnElClub = false): string {
  const plantilla = !falta.length ? p.entrenamiento.yaEntrenas : entreno ? (soloEnElClub && p.entrenamiento.recomiendaEnElClub ? p.entrenamiento.recomiendaEnElClub : p.entrenamiento.recomienda) : p.entrenamiento.sinEntreno;
  return componer(plantilla, quien, { puesto: puesto.toLowerCase(), falta: listaConY(falta), entreno: entreno ?? '' });
}

/** Cuántos puntos de valor por debajo de su puesto puede estar otra familia para que el entrenador diga «a lo mejor más adelante te pongo de…» (provisional). */
export const MARGEN_DE_OTRO_PUESTO = 4;

/** La otra familia de puestos en que también encaja (la que más vale, sin ser la suya, a no más de `MARGEN_DE_OTRO_PUESTO` puntos de la suya), o `undefined`. Como el consejo, habla de familias (sin lado). */
export function otraFamiliaDeEncaje(p: PuestosDeDeporte, puesto: string, valores: Readonly<Record<string, number>>): FamiliaDePuestos | undefined {
  const mia = familiaDePuesto(p, puesto);
  if (!mia) return undefined;
  const porFamilia = valoresPorFamilia(p, valores);
  const miValor = porFamilia[mia.id];
  if (miValor === undefined) return undefined;
  const mejor = Object.entries(porFamilia)
    .filter(([id, v]) => id !== mia.id && v >= miValor - MARGEN_DE_OTRO_PUESTO)
    .sort((a, b) => b[1] - a[1])[0];
  return mejor ? familiaDePuesto(p, mejor[0]) ?? p.familias?.find((f) => f.id === mejor[0]) : undefined;
}

/**
 * Lo que dice el entrenador en el primer entrenamiento: «De inicio vas a jugar de interior, pero a lo mejor más adelante te pongo de lateral.» Si el puesto pedido en la prueba es de otra familia, lo
 * cuenta («Me dijiste portero…»). Sin lado. `undefined` si el deporte no tiene el texto o no conoce el puesto. Deja `{yo:o|a}` sin componer: lo concuerda el suceso.
 */
export function fraseDelPuestoInicial(p: PuestosDeDeporte, puesto: string, valores: Readonly<Record<string, number>>, pedido?: string): string | undefined {
  const t = p.pistas?.primerEntrenamiento;
  const mia = familiaDePuesto(p, puesto);
  if (!t || !mia) return undefined;
  const poner = (plantilla: string, de: Record<string, string>): string => plantilla.replace(/\{señal\.(\w+)\}/g, (_t, k: string) => de[k] ?? '');
  const otra = otraFamiliaDeEncaje(p, puesto, valores);
  const pedida = pedido ? familiaDePuesto(p, pedido) : undefined;
  const otro = otra ? poner(t.otro, { otro: otra.nombre.toLowerCase() }) : '';
  const distinta = pedida && pedida.id !== mia.id;
  return poner(distinta ? t.pedido : t.vas, { puesto: mia.nombre.toLowerCase(), pedido: pedida?.nombre.toLowerCase() ?? '', otro });
}
