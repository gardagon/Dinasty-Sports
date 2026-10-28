/**
 * Una sola pestaña guarda la partida. Si hay dos abiertas, las dos escriben en el mismo almacén y la última en guardar machaca el
 * progreso de la otra. Con la API de bloqueos del navegador (`navigator.locks`) la primera pestaña se queda con el derecho de guardar
 * mientras esté abierta; la segunda juega en pantalla pero no guarda, avisa, y recarga sola cuando la primera se cierra.
 * Plan: `docs/ALMACENAMIENTO.md`.
 */

/** Lo que usamos de `navigator.locks` (se puede cambiar en los tests). */
export interface Bloqueos {
  request(name: string, options: { ifAvailable: true }, callback: (lock: unknown) => Promise<unknown>): Promise<unknown>;
  request(name: string, callback: (lock: unknown) => Promise<unknown>): Promise<unknown>;
}

export const NOMBRE_DEL_BLOQUEO = 'dinasty-sports-guardar';

/**
 * Intenta ser la pestaña que guarda. Devuelve `true` si lo es (o si el navegador no tiene bloqueos: entonces no se puede saber y se
 * guarda como siempre). Si no lo es, `cuandoSeLibere` se llama cuando la otra pestaña se cierre y esta pasa a poder guardar.
 */
export async function reclamarPestana(cuandoSeLibere: () => void, bloqueos: Bloqueos | undefined = typeof navigator === 'undefined' ? undefined : (navigator as { locks?: Bloqueos }).locks): Promise<boolean> {
  if (!bloqueos) return true;
  let conseguido = false;
  try {
    // El bloqueo se mantiene hasta que se cierra la pestaña: la promesa de la función no se resuelve nunca.
    await new Promise<void>((resolver) => {
      void bloqueos.request(NOMBRE_DEL_BLOQUEO, { ifAvailable: true }, (lock) => {
        conseguido = lock !== null;
        resolver();
        return conseguido ? new Promise(() => undefined) : Promise.resolve();
      });
    });
  } catch {
    return true; // si el navegador falla al pedirlo, no se impide guardar
  }
  if (conseguido) return true;
  // La otra pestaña lo tiene: se espera a que lo suelte.
  void bloqueos.request(NOMBRE_DEL_BLOQUEO, () => {
    cuandoSeLibere();
    return new Promise(() => undefined);
  });
  return false;
}
