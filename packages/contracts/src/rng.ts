/** Generador aleatorio determinista: misma semilla + mismas decisiones = misma partida. */
export interface Rng {
  /** Número en [0, 1). */
  next(): number;
  /** Entero en [min, max] (ambos incluidos). */
  int(min: number, max: number): number;
  /** Real en [min, max). */
  range(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** Aproximación normal (media 0, desviación 1). */
  normal(): number;
}

/**
 * Generador propio de algo concreto (una persona, un día...): sale solo de las partes que se le dan (FNV-1a), no del generador de la partida.
 * Así lo que se sortea para ello es siempre lo mismo y no cambia con lo que haga el jugador ni con cuántas cosas más se sorteen.
 * Es mulberry32, el mismo algoritmo que el del motor.
 */
export function rngEstable(...partes: (string | number)[]): Rng {
  let h = 0x811c9dc5;
  for (const p of partes) {
    const t = typeof p === 'number' ? String(p) : p;
    for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 0x01000193);
    h = Math.imul(h ^ 0x2f, 0x01000193); // separa las partes: («ab», «c») no es («a», «bc»)
  }
  // Mezcla final (murmur3): sin ella, dos textos que solo cambian en el último carácter dan sorteos parecidos.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  let estado = h | 0;
  const next = (): number => {
    estado = (estado + 0x6d2b79f5) | 0;
    let t = estado;
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
      let s = 0;
      for (let i = 0; i < 6; i++) s += next();
      return (s - 3) / Math.sqrt(0.5);
    },
  };
}
