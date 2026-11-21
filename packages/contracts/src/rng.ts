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
  return new GeneradorEstable(cierraElHash(mezclaPartes(0x811c9dc5, partes)));
}

const FNV = 0x01000193;

/** Mezcla partes en el hash FNV-1a (cada parte seguida de su separador) a partir de un estado dado. */
function mezclaPartes(h: number, partes: readonly (string | number)[]): number {
  for (let k = 0; k < partes.length; k++) {
    const p = partes[k];
    const t = typeof p === 'number' ? String(p) : p;
    for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), FNV);
    h = Math.imul(h ^ 0x2f, FNV); // separa las partes: («ab», «c») no es («a», «bc»)
  }
  return h;
}

/** Mezcla final (murmur3): sin ella, dos textos que solo cambian en el último carácter dan sorteos parecidos. */
function cierraElHash(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h | 0;
}

/**
 * El hash de las partes constantes de un sorteo, para no repetirlo millones de veces: `rngEstableDesde(prefijoEstable(a, b), c, d)` da exactamente lo mismo que
 * `rngEstable(a, b, c, d)` (el FNV-1a se calcula parte a parte, así que el estado tras `a` y `b` se puede guardar).
 */
export const prefijoEstable = (...partes: (string | number)[]): number => mezclaPartes(0x811c9dc5, partes);

/** Añade más partes a un prefijo ya calculado. */
export const prefijoEstableDesde = (prefijo: number, ...resto: (string | number)[]): number => mezclaPartes(prefijo, resto);

/** Un `rngEstable` cuyas primeras partes ya están mezcladas en `prefijo` (ver `prefijoEstable`). */
export function rngEstableDesde(prefijo: number, ...resto: (string | number)[]): Rng {
  return new GeneradorEstable(cierraElHash(mezclaPartes(prefijo, resto)));
}

/** Lo mismo que `rngEstableDesde` con una sola parte variable (sin crear la lista de «resto»). */
export function rngEstableDesde1(prefijo: number, parte: string | number): Rng {
  let h = prefijo;
  const t = typeof parte === 'number' ? String(parte) : parte;
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), FNV);
  h = Math.imul(h ^ 0x2f, FNV);
  return new GeneradorEstable(cierraElHash(h));
}

/**
 * El generador de `rngEstable` (mulberry32). Es una clase con sus métodos en el prototipo, no un objeto con funciones nuevas: se crea millones de veces al crear una partida
 * (cada sorteo de cada niño y de cada sesión) y crear ocho funciones por generador era lo que más costaba. Da exactamente los mismos números.
 */
class GeneradorEstable implements Rng {
  constructor(private estado: number) {}
  next(): number {
    this.estado = (this.estado + 0x6d2b79f5) | 0;
    let t = this.estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  range(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }
  normal(): number {
    let s = 0;
    for (let i = 0; i < 6; i++) s += this.next();
    return (s - 3) / Math.sqrt(0.5);
  }
}
