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
  nivelInicial: { factorMin: 0.7, factorMax: 0.9, variacion: 0.3, bajo: 22, alto: 80 },
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

/**
 * Calidad global de un progenitor, de 0 (el peor del mundo) a 1 (el mejor). Los recuentos de bandas de `RECUENTOS` son
 * puntos fijos de esa escala: difícil en 0, normal en 0,5 y fácil en 1; entre medias se interpolan. Además la calidad
 * desplaza las capacidades normales (más altas cuanto mejor es el padre), así que unos padres son globalmente mejores que otros.
 */
export type Calidad = number;

/** Calidad de los padres DEL JUGADOR según la dificultad: en normal, percentil 50–60. El resto del mundo recorre toda la escala. */
export const CALIDAD_DE_PADRES_DEL_JUGADOR: Record<Dificultad, readonly [number, number]> = {
  facil: [0.8, 0.9],
  normal: [0.5, 0.6],
  dificil: [0.1, 0.2],
};

/** Puntos que separan las capacidades normales del peor padre (calidad 0) y del mejor (calidad 1). */
const DESPLAZAMIENTO_NORMAL = 20;

type Recuentos = (typeof RECUENTOS)[Dificultad];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function recuentosSegunCalidad(calidad: Calidad): Recuentos {
  const [desde, hasta, t] = calidad < 0.5 ? [RECUENTOS.dificil, RECUENTOS.normal, calidad * 2] : [RECUENTOS.normal, RECUENTOS.facil, (calidad - 0.5) * 2];
  const par = (k: 'debil' | 'fuerte' | 'destacado'): readonly [number, number] => [lerp(desde[k][0], hasta[k][0], t), lerp(desde[k][1], hasta[k][1], t)];
  return { debil: par('debil'), fuerte: par('fuerte'), destacado: par('destacado') };
}

/** Rango de las capacidades normales: se estrecha por abajo (calidad alta) o por arriba (calidad baja) y se inclina con el sesgo. */
function rangoNormal(calidad: Calidad, favorecida?: boolean): readonly [number, number] {
  const d = (calidad - 0.5) * DESPLAZAMIENTO_NORMAL;
  let lo: number = BANDAS.normal[0];
  let hi: number = BANDAS.normal[1];
  if (d > 0) lo += d;
  else hi += d;
  if (favorecida === true) lo += 5;
  if (favorecida === false) hi -= 5;
  lo = Math.min(lo, hi - 3);
  return [lo, hi];
}

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
  calidad: Calidad = 0.5,
  grupoDe: Readonly<Record<string, string>> = {},
): { topes: Record<string, number>; sesgo: Sesgo } {
  const c = recuentosSegunCalidad(calidad);
  const escala = ids.length / CAPACIDADES_DE_REFERENCIA;
  const cuantas = (r: readonly [number, number]) => Math.floor(rng.range(r[0], r[1] + 1e-9) * escala + rng.next());
  const orden = barajar(ids, rng);
  const destacado = Math.min(cuantas(c.destacado), orden.length);
  const fuerte = Math.min(cuantas(c.fuerte), orden.length - destacado);
  const debil = Math.min(cuantas(c.debil), orden.length - destacado - fuerte);
  const grupos = new Set(ids.map((id) => grupoDe[id]).filter((g): g is string => !!g));
  const sesgo: Sesgo = grupos.size >= 2 ? elegirSesgo(grupos, rng) : SESGOS[0];
  const topes: Record<string, number> = {};

  if (sesgo.tipo === 'equilibrado') {
    orden.forEach((id, i) => {
      const banda = i < destacado ? BANDAS.destacado : i < destacado + fuerte ? BANDAS.fuerte : i < destacado + fuerte + debil ? BANDAS.debil : rangoNormal(calidad);
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
  for (const id of [...dentro, ...fuera]) topes[id] = entre(rng, rangoNormal(calidad, fav.has(grupoDe[id])));
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
 * entre 0,7 y 0,9) y una variación de ±30 %, llevado de la escala 22–80 (la que cubren los topes de los padres) a 0–1 para
 * aprovechar todo el rango inicial: un padre con tope bajo da un hijo cerca del mínimo y uno con tope alto, cerca del máximo.
 * El módulo lo escala al rango inicial de la característica.
 */
export function nivelInicialHeredado(topeDelProgenitor: number, factor: number, rng: Rng): number {
  const raw = topeDelProgenitor * factor * (1 + rng.range(-HERENCIA.nivelInicial.variacion, HERENCIA.nivelInicial.variacion));
  const { bajo, alto } = HERENCIA.nivelInicial;
  return Math.min(1, Math.max(0, (raw - bajo) / (alto - bajo)));
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

/**
 * Cuánto conoce un niño un deporte porque sus padres lo practicaron (se crió oyendo hablar de ello): por cada padre, según lo que
 * practicó (aficionado 4, federado 8, profesional 14) y solo del todo si fue ese deporte (para los demás deportes, un tercio:
 * cultura deportiva). Como mucho 20.
 */
export const CONOCIMIENTO_DE_CRIANZA: Record<Practica, number> = { ninguna: 0, aficionado: 4, federado: 8, profesional: 14 };
export function conocimientoDeCrianza(padres: readonly { practica: Practica; deporte?: string }[], deporte: string): number {
  const total = padres.reduce((s, p) => s + CONOCIMIENTO_DE_CRIANZA[p.practica] * (p.deporte === deporte ? 1 : 0.35), 0);
  return Math.min(20, Math.round(total * 10) / 10);
}
