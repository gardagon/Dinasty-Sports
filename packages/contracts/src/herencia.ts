import type { Rng } from './rng';

/**
 * Herencia genética. Compartida porque la usan el motor (topes del personaje a partir de los de sus padres) y
 * los módulos (rivales con padres, altura, práctica deportiva de la familia).
 *
 * - Cada padre tiene un tope por capacidad con perfil: unas fuertes, otras débiles, el resto normales (bandas).
 * - El hijo hereda cada capacidad de UN solo padre, sin punto intermedio: la mitad exacta de las capacidades del
 *   padre y la otra mitad de la madre, al azar cuáles. Al tope del padre elegido se le aplica una variación de ±20 %.
 * - Se hereda el TOPE de los padres, no su nivel.
 */

export const HERENCIA = {
  /** Variación sobre el tope del progenitor elegido (±20 %). */
  variacion: 0.2,
  /** Límites de cualquier tope genético. */
  min: 10,
  max: 95,
  /** Variación de la estatura heredada, en puntuación típica (la estatura sí se promedia: media de los dos padres). */
  variacionZ: 0.4,
  /** Nivel inicial: factor de herencia (aleatorio por hijo) y variación sobre el tope del progenitor. */
  nivelInicial: { factorMin: 0.7, factorMax: 0.9, variacion: 0.2 },
} as const;

export type Dificultad = 'facil' | 'normal' | 'dificil';

/** Cuatro bandas fijas en todas las dificultades; la dificultad solo cambia cuántas capacidades caen en cada una. */
export const BANDAS = {
  debil: [35, 49.9],
  normal: [50, 69.9],
  fuerte: [70, 84.9],
  destacado: [85, 95],
} as const;

/** Capacidades por banda (mínimo y máximo) en un progenitor con 18 capacidades; el resto cae en "normal". */
export const RECUENTOS: Record<Dificultad, { debil: readonly [number, number]; fuerte: readonly [number, number]; destacado: readonly [number, number] }> = {
  facil: { debil: [0, 0], fuerte: [2, 3], destacado: [1, 3] },
  normal: { debil: [0, 1], fuerte: [1, 2], destacado: [0, 1] },
  dificil: { debil: [1, 2], fuerte: [1, 2], destacado: [0, 0] },
};

/** Número de capacidades para el que están pensados los recuentos. Con menos, se reducen en proporción. */
const CAPACIDADES_DE_REFERENCIA = 18;

const entre = (rng: Rng, [a, b]: readonly [number, number]) => rng.range(a, b);

/** Mezcla de barajado (Fisher-Yates) con el generador de la partida. */
export function barajar<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Sesgo de un progenitor: hacia qué categorías (grupos de capacidades) se concentran sus puntos fuertes.
 * - Dominante: una categoría reúne las capacidades altas y las débiles caen en las otras dos.
 * - Parcial: dos categorías reúnen las altas y la que queda fuera tiene las más bajas en general.
 * - Equilibrado: sin sesgo, las bandas caen al azar.
 */
export type TipoSesgo = 'equilibrado' | 'dominante' | 'parcial';

export interface Sesgo {
  tipo: TipoSesgo;
  /** Categorías favorecidas (vacío si es equilibrado). */
  grupos: readonly string[];
  /** Probabilidad de elegir este sesgo (se renormaliza con los grupos que existan). */
  peso: number;
}

/** Tabla de sesgos. Es un dato: otro juego tendría otras categorías. */
export const SESGOS: readonly Sesgo[] = [
  { tipo: 'equilibrado', grupos: [], peso: 0.4 },
  { tipo: 'dominante', grupos: ['fisico'], peso: 0.1 },
  { tipo: 'dominante', grupos: ['mental'], peso: 0.1 },
  { tipo: 'dominante', grupos: ['social'], peso: 0.1 },
  { tipo: 'parcial', grupos: ['fisico', 'mental'], peso: 0.1 },
  { tipo: 'parcial', grupos: ['fisico', 'social'], peso: 0.1 },
  { tipo: 'parcial', grupos: ['mental', 'social'], peso: 0.1 },
];

const NOMBRE_GRUPO: Record<string, string> = { fisico: 'físico', mental: 'mental', social: 'social' };

export const nombreSesgo = (s: Pick<Sesgo, 'tipo' | 'grupos'>): string =>
  s.tipo === 'equilibrado' ? 'Equilibrado' : `${s.tipo === 'dominante' ? 'Dominante' : 'Parcial'} ${s.grupos.map((g) => NOMBRE_GRUPO[g] ?? g).join('-')}`;

/** Probabilidad de que una capacidad alta caiga fuera del sesgo (o una débil dentro de él). */
export const FUGA_DE_SESGO = 0.15;
/** Las normales se inclinan hacia arriba en las categorías favorecidas y hacia abajo en las demás (sesgo suave). */
const NORMAL_FAVORECIDA = [55, 69.9] as const;
const NORMAL_NO_FAVORECIDA = [50, 64.9] as const;
/** Una capacidad débil que cae dentro del sesgo no es de las peores. */
const DEBIL_ALTA = [42.5, 49.9] as const;

function elegirSesgo(grupos: ReadonlySet<string>, rng: Rng): Sesgo {
  const posibles = SESGOS.filter((s) => s.grupos.every((g) => grupos.has(g)));
  const total = posibles.reduce((a, s) => a + s.peso, 0);
  let u = rng.next() * total;
  for (const s of posibles) {
    u -= s.peso;
    if (u < 0) return s;
  }
  return posibles[0];
}

/**
 * Perfil de un progenitor: un tope por capacidad, repartido en bandas según la dificultad y concentrado según su sesgo.
 * `grupoDe` dice a qué categoría pertenece cada capacidad; sin él (o con una sola categoría) no hay sesgo.
 */
export function perfilDePadre(
  ids: readonly string[],
  rng: Rng,
  dificultad: Dificultad = 'normal',
  grupoDe: Readonly<Record<string, string>> = {},
): { topes: Record<string, number>; sesgo: Sesgo } {
  const c = RECUENTOS[dificultad];
  const escala = ids.length / CAPACIDADES_DE_REFERENCIA;
  const cuantas = (r: readonly [number, number]) => Math.floor(rng.int(r[0], r[1]) * escala + rng.next());
  const orden = barajar(ids, rng);
  const destacado = Math.min(cuantas(c.destacado), orden.length);
  const fuerte = Math.min(cuantas(c.fuerte), orden.length - destacado);
  const debil = Math.min(cuantas(c.debil), orden.length - destacado - fuerte);
  const grupos = new Set(ids.map((id) => grupoDe[id]).filter((g): g is string => !!g));
  const sesgo: Sesgo = grupos.size >= 2 ? elegirSesgo(grupos, rng) : SESGOS[0];
  const topes: Record<string, number> = {};

  if (sesgo.tipo === 'equilibrado') {
    orden.forEach((id, i) => {
      const banda = i < destacado ? BANDAS.destacado : i < destacado + fuerte ? BANDAS.fuerte : i < destacado + fuerte + debil ? BANDAS.debil : BANDAS.normal;
      topes[id] = entre(rng, banda);
    });
    return { topes, sesgo };
  }

  // Con sesgo: las capacidades altas se centran en las categorías favorecidas y las débiles en las demás.
  const fav = new Set(sesgo.grupos);
  const dentro = orden.filter((id) => fav.has(grupoDe[id]));
  const fuera = orden.filter((id) => !fav.has(grupoDe[id]));
  const tomar = (preferida: string[], otra: string[]): string | undefined => preferida.shift() ?? otra.shift();
  for (let i = 0; i < destacado; i++) {
    const id = tomar(dentro, fuera);
    if (id) topes[id] = entre(rng, BANDAS.destacado);
  }
  for (let i = 0; i < fuerte; i++) {
    // Alguna fuerte (nunca una destacada) puede caer en una categoría no favorecida.
    const id = rng.chance(FUGA_DE_SESGO) ? tomar(fuera, dentro) : tomar(dentro, fuera);
    if (id) topes[id] = entre(rng, BANDAS.fuerte);
  }
  for (let i = 0; i < debil; i++) {
    // Alguna débil puede caer en una categoría favorecida, pero entonces no es de las peores.
    const dentroDelSesgo = rng.chance(FUGA_DE_SESGO) && dentro.length > 0;
    const id = dentroDelSesgo ? dentro.shift()! : tomar(fuera, dentro);
    if (id) topes[id] = entre(rng, dentroDelSesgo ? DEBIL_ALTA : BANDAS.debil);
  }
  for (const id of [...dentro, ...fuera]) topes[id] = entre(rng, fav.has(grupoDe[id]) ? NORMAL_FAVORECIDA : NORMAL_NO_FAVORECIDA);
  return { topes, sesgo };
}

/** Un solo tope de un progenitor sorteado según cuántas capacidades suelen caer en cada banda (para quien no necesita el perfil entero). */
export function topeAleatorioDePadre(rng: Rng, dificultad: Dificultad = 'normal'): number {
  const media = (r: readonly [number, number]) => (r[0] + r[1]) / 2 / CAPACIDADES_DE_REFERENCIA;
  const c = RECUENTOS[dificultad];
  const u = rng.next();
  const pDestacado = media(c.destacado);
  const pFuerte = media(c.fuerte);
  const pDebil = media(c.debil);
  const banda = u < pDestacado ? BANDAS.destacado : u < pDestacado + pFuerte ? BANDAS.fuerte : u < pDestacado + pFuerte + pDebil ? BANDAS.debil : BANDAS.normal;
  return entre(rng, banda);
}

/** Reparte las capacidades entre los padres: la mitad exacta de cada uno (si son impares, el sobrante cae al azar en uno). */
export function repartirHerencia(ids: readonly string[], rng: Rng): Record<string, 'padre' | 'madre'> {
  const orden = barajar(ids, rng);
  const mitad = orden.length / 2;
  const delPadre = rng.chance(0.5) ? Math.ceil(mitad) : Math.floor(mitad);
  const r: Record<string, 'padre' | 'madre'> = {};
  orden.forEach((id, i) => (r[id] = i < delPadre ? 'padre' : 'madre'));
  return r;
}

/** Tope del hijo a partir del tope del progenitor elegido: ±20 %, sin punto intermedio entre padre y madre. */
export function heredarTope(topeDelProgenitor: number, rng: Rng): number {
  const v = topeDelProgenitor * (1 + rng.range(-HERENCIA.variacion, HERENCIA.variacion));
  return Math.min(HERENCIA.max, Math.max(HERENCIA.min, v));
}

/**
 * Nivel inicial heredado, entre 0 y 1: el tope del progenitor elegido por un factor de herencia (propio de cada hijo,
 * entre 0,7 y 0,9) y una variación, sobre 100. El módulo lo escala al rango inicial de la característica.
 */
export function nivelInicialHeredado(topeDelProgenitor: number, factor: number, rng: Rng): number {
  const raw = topeDelProgenitor * factor * (1 + rng.range(-HERENCIA.nivelInicial.variacion, HERENCIA.nivelInicial.variacion));
  return Math.min(1, Math.max(0, raw / 100));
}

/** Estatura heredada: la media de los dos padres (en puntuación típica) más una variación. */
export function mezclarZ(padre: number, madre: number, rng: Rng): number {
  return (padre + madre) / 2 + HERENCIA.variacionZ * rng.normal();
}

/** Desviación de la puntuación típica del hijo tras promediar a los padres (para reescalar a la del rasgo). */
export const SD_Z_HIJO = Math.sqrt(0.5 + HERENCIA.variacionZ ** 2);

/** Lo que un adulto ha practicado de un deporte. */
export type Practica = 'ninguna' | 'aficionado' | 'federado' | 'profesional';

export const NIVEL_PRACTICA: Record<Practica, number> = { ninguna: 0, aficionado: 1, federado: 2, profesional: 3 };

export const PRACTICA_TEXTO: Record<Practica, string> = {
  ninguna: 'no hizo deporte',
  aficionado: 'lo practicó por afición',
  federado: 'compitió federado',
  profesional: 'fue profesional',
};

/** Tope típico de un progenitor (media de las bandas con la dificultad normal) y su dispersión, para valorar el suyo. */
const TOPE_TIPICO = 62;
const DISPERSION_TIPICA = 12;

/**
 * Qué practicó un adulto según su tope físico medio (escala 0..100): más tope, más probable que haya llegado lejos.
 * Se tira de arriba abajo: profesional, federado, aficionado.
 */
export function practicaSegunTope(tope: number, rng: Rng): Practica {
  const z = (tope - TOPE_TIPICO) / DISPERSION_TIPICA;
  const prob = (base: number, pendiente: number, max: number) => Math.min(max, Math.max(0.01, base + pendiente * z));
  if (rng.chance(prob(0.03, 0.04, 0.2))) return 'profesional';
  if (rng.chance(prob(0.12, 0.08, 0.4))) return 'federado';
  if (rng.chance(prob(0.3, 0.05, 0.5))) return 'aficionado';
  return 'ninguna';
}

/**
 * Ventaja inicial de un niño por el deporte de sus padres (se criaron entre zapatillas): multiplica su nivel
 * de partida. De 0,95 (ninguno de los dos) a 1,10 (los dos profesionales).
 */
export function ventajaDeCrianza(padre: Practica, madre: Practica): number {
  return 0.95 + 0.025 * (NIVEL_PRACTICA[padre] + NIVEL_PRACTICA[madre]);
}
