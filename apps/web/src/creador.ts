import type { CreateOptions } from '@ds/core';

/**
 * Crear una partida **en segundo plano** (con la ciudad grande, unos 40 segundos): la página sigue viva y enseña «creando el mundo» con lo que se va haciendo. El trabajo lo hace `creador.worker.ts`; si el navegador no
 * tiene trabajadores, `crearEnSegundoPlano` devuelve `undefined` y la página crea la partida ella misma.
 */
export interface PeticionDeCreacion {
  opciones: CreateOptions & { deportes: readonly string[] };
  /** Los paquetes de país que importó el jugador (texto JSON). */
  paises: string[];
  /** Los deportes instalados (id → texto del paquete). */
  deportes: Record<string, string>;
}

export type MensajeDelCreador = { tipo: 'progreso'; texto: string; fraccion: number } | { tipo: 'listo'; estado: string } | { tipo: 'error'; mensaje: string };

/** Cómo cancelar el trabajo que está en marcha (si lo hay). */
let cancelacion: (() => void) | null = null;

/** Cancela la creación que esté en marcha (la partida no se crea y quien la esperaba recibe un error de cancelación). */
export function cancelarCreacion(): void {
  cancelacion?.();
}

/** Crea la partida en un trabajador y devuelve su estado en texto; `undefined` si no hay trabajadores. Rechaza con el motivo si falla o se cancela. */
export function crearEnSegundoPlano(peticion: PeticionDeCreacion, alAvanzar: (texto: string, fraccion: number) => void): Promise<string> | undefined {
  if (typeof Worker === 'undefined') return undefined;
  let w: Worker;
  try {
    w = new Worker(new URL('./creador.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return undefined;
  }
  return new Promise((resolver, rechazar) => {
    const acabar = (): void => {
      w.terminate();
      cancelacion = null;
    };
    cancelacion = () => {
      acabar();
      rechazar(new Error('Creación cancelada'));
    };
    w.onmessage = (e: MessageEvent<MensajeDelCreador>) => {
      const m = e.data;
      if (m.tipo === 'progreso') return alAvanzar(m.texto, m.fraccion);
      acabar();
      if (m.tipo === 'listo') resolver(m.estado);
      else rechazar(new Error(m.mensaje));
    };
    w.onerror = (e) => {
      acabar();
      rechazar(new Error(e.message || 'Falló la creación de la partida.'));
    };
    w.postMessage(peticion);
  });
}
