/**
 * **Cómo va la creación de una partida** (la pantalla de «creando el mundo»): crear una partida con la ciudad grande tarda unos 40 segundos (las personas, los clubes y su historia), y quien la crea puede pedir que se le avise de cada paso
 * para enseñarlo. Sin nadie escuchando (los tests, los bots), no hace nada. Quien escucha pone `PROGRESO_DE_CREACION.alAvanzar`.
 */
export const PROGRESO_DE_CREACION: { alAvanzar?: (texto: string, fraccion: number) => void } = {};

/** Avisa de un paso de la creación: lo que se está haciendo («Reclutando a los equipos…») y cuánto se lleva hecho (de 0 a 1). */
export function avisarDelProgreso(texto: string, fraccion: number): void {
  PROGRESO_DE_CREACION.alAvanzar?.(texto, Math.min(1, Math.max(0, fraccion)));
}
