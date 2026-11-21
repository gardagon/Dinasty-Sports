import type { LecturaDePuesto, ConsejoDeDeporte, Gender } from './services';
import { listaConY, type PistasDePuestos } from './deporte-datos';
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
export function fraseDeEntrenamiento(p: PistasDePuestos, puesto: string, falta: readonly string[], entreno: string | undefined, quien?: QuienHabla): string {
  const plantilla = !falta.length ? p.entrenamiento.yaEntrenas : entreno ? p.entrenamiento.recomienda : p.entrenamiento.sinEntreno;
  return componer(plantilla, quien, { puesto: puesto.toLowerCase(), falta: listaConY(falta), entreno: entreno ?? '' });
}
