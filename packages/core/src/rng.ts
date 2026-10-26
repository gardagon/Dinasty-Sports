import type { Rng } from '@ds/contracts';

/** Contenedor del estado del generador, para poder guardarlo en la partida. */
export interface RngHolder {
  state: number;
}

/** mulberry32: rápido, determinista y con estado de 32 bits (fácil de guardar). */
export function createRng(holder: RngHolder): Rng {
  const next = (): number => {
    holder.state = (holder.state + 0x6d2b79f5) | 0;
    let t = holder.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    range: (min, max) => next() * (max - min) + min,
    chance: (p) => next() < p,
    pick: (items) => items[Math.floor(next() * items.length)],
    normal: () => {
      // Suma de 6 uniformes: suficiente para el juego y sin trigonometría.
      let s = 0;
      for (let i = 0; i < 6; i++) s += next();
      return (s - 3) / Math.sqrt(0.5);
    },
  };
}

/** Rng independiente a partir de una semilla (útil en tests y en la inicialización). */
export function seededRng(seed: number): Rng {
  return createRng({ state: seed | 0 });
}

/**
 * Rng propio de un elemento (p. ej. una stat) a partir de la semilla de la partida y su id. Así lo que se sortea para él
 * no depende de qué otros elementos existan: añadir una stat nueva no cambia a las que ya estaban (FNV-1a sobre el id).
 */
export function seededRngDe(seed: number, id: string): Rng {
  let h = 0x811c9dc5 ^ seed;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193);
  return seededRng(h);
}
