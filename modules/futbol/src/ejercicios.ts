import { GEN } from '@ds/contracts';
import type { Ejercicio } from '@ds/kit-deporte';

/**
 * Los ejercicios de las sesiones del club de fútbol. En cada sesión el entrenador elige dos (de tipos distintos) y solo sube lo que entrenan: cada ejercicio
 * sube unas pocas habilidades, **unos 3 puntos de habilidad en total** (dos ejercicios = 6, como las tres habilidades del atletismo a 2 cada una) más un poco de
 * lo genérico que los apoya. El conocimiento y el juego colectivo suben siempre (ver `SIEMPRE`).
 */

const e = (id: string, nombre: string, foco: string, entrena: [string, number][], soloPuesto?: string): Ejercicio => ({
  id,
  nombre,
  foco,
  entrena: entrena.map(([stat, amount]) => ({ stat, amount })),
  ...(soloPuesto ? { soloPuesto } : {}),
});

export const EJERCICIOS_DE_FUTBOL: readonly Ejercicio[] = [
  e('rondos', 'rondos', 'tecnica', [['futbol.pase', 1.2], ['futbol.control', 1.2], ['futbol.juego_colectivo', 0.8], [GEN.cooperacion, 0.2]]),
  e('conduccion', 'conducción y regate', 'tecnica', [['futbol.regate', 1.4], ['futbol.tecnica', 1], ['futbol.control', 0.6], [GEN.agilidad, 0.2]]),
  e('finalizacion', 'finalización', 'ataque', [['futbol.definicion', 1.6], ['futbol.disparo_lejano', 1], ['futbol.cabeza', 0.4], [GEN.fuerza, 0.2]]),
  e('centros', 'centros y remates', 'ataque', [['futbol.centros', 1.4], ['futbol.cabeza', 1], ['futbol.desmarque', 0.6], [GEN.coordinacion, 0.2]]),
  e('defensa', 'defensa', 'defensa', [['futbol.marcaje', 1.2], ['futbol.entrada', 1.2], ['futbol.posicionamiento', 0.6], [GEN.fuerza, 0.2]]),
  e('presion', 'presión tras pérdida', 'defensa', [['futbol.anticipacion', 1.2], ['futbol.entrada', 0.8], ['futbol.juego_colectivo', 1], [GEN.resistencia, 0.3]]),
  e('balon_parado', 'balón parado', 'balon_parado', [['futbol.faltas', 1], ['futbol.corners', 0.8], ['futbol.penaltis', 0.8], ['futbol.saque_banda', 0.4]]),
  e('tactica', 'táctica', 'tactica', [['futbol.vision', 1], ['futbol.decisiones', 1], ['futbol.posicionamiento', 1], [GEN.inteligencia, 0.2]]),
  e('posesion', 'juego de posición', 'tactica', [['futbol.pase', 0.8], ['futbol.vision', 0.8], ['futbol.desmarque', 0.8], ['futbol.sangre_fria', 0.6]]),
  e('fisico', 'preparación física', 'fisico', [['futbol.arrancada', 1.6], ['futbol.salto', 1.2], [GEN.velocidad, 0.4], [GEN.resistencia, 0.4]]),
  e('porteros', 'trabajo de porteros', 'porteros', [['futbol.reflejos', 0.8], ['futbol.blocaje', 0.6], ['futbol.mano_a_mano', 0.5], ['futbol.despeje', 0.4], ['futbol.alcance_aereo', 0.4], ['futbol.dominio_area', 0.3]], 'portero'),
];

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
