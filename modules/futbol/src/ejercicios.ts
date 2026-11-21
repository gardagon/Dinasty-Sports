import { GEN } from '@ds/contracts';
import type { Ejercicio } from '@ds/kit-deporte';
import { ejercicioDelClub, entrenamientosDelClub } from './entrenamientos';

/**
 * Los ejercicios de las sesiones del club de fútbol: **los entrenamientos del catálogo de 22 que llevan `club`** (`entrenamientos.ts`), con las mismas cifras llevadas a una hora de trabajo.
 * En cada sesión el entrenador elige dos (de tipos distintos) y solo sube lo que entrenan; el conocimiento y el juego colectivo suben siempre (ver `SIEMPRE`). Los de portería los hace solo
 * quien juega de portero, y los de campo no (el portero entrena lo suyo, con los físicos y mentales que son de todos).
 */
export const EJERCICIOS_DE_FUTBOL: readonly Ejercicio[] = entrenamientosDelClub.map(ejercicioDelClub);

/** Lo que sube siempre en una sesión del club, hagan los ejercicios que hagan: entender el juego y algo de trabajo en equipo. */
export const SIEMPRE = [
  { stat: 'futbol.conocimiento', amount: 1.6 },
  { stat: GEN.cooperacion, amount: 0.3 },
  { stat: GEN.resistencia, amount: 0.3 },
];

/**
 * Cuánto le gusta cada tipo de ejercicio a un entrenador según su carácter (ejes de −50 a +50): el disciplinado y el sacrificado, el físico y la defensa;
 * el ambicioso, el ataque y la técnica. De ×0,8 a ×1,2: inclina, no manda.
 */
export function sesgoDelEntrenador(caracter: Readonly<Record<string, number>> | undefined): Record<string, number> {
  const eje = (id: string) => Math.max(-1, Math.min(1, (caracter?.[id] ?? 0) / 50));
  const f = (x: number) => 1 + 0.2 * x;
  return {
    fisico: f(eje('disciplina') + eje('sacrificio')),
    defensa: f(eje('sacrificio') + eje('disciplina') / 2),
    tactica: f(eje('disciplina')),
    ataque: f(eje('ambicion')),
    tecnica: f(eje('ambicion') / 2),
    balon_parado: 1,
    porteros: 1,
  };
}

/** Practicar con los amigos (juego informal): sienta bien, pero no se mejora igual que entrenando. Lo usan la acción del personaje y la rutina de los PNJ. */
export const JUEGO_INFORMAL = [
  { stat: 'futbol.control', amount: 0.3 },
  { stat: 'futbol.regate', amount: 0.4 },
  { stat: 'futbol.definicion', amount: 0.3 },
  { stat: 'futbol.juego_colectivo', amount: 0.4 },
  { stat: GEN.carisma, amount: 0.4 },
  { stat: GEN.cooperacion, amount: 0.4 },
] as const;
