import { rngEstable } from './rng';
import type { Apariencia } from './rasgos';

/**
 * EL LOOK DE UNA PERSONA: los catálogos de peinados y de vello facial (ids estables, para que un «cambiar de look» pueda guardarlos en el estado), lo que cada
 * estilo exige de la genética y la elección por defecto de cada persona. El dibujo está en `@ds/retrato`; la receta, en `docs/ANEXO_RETRATOS.md`.
 *
 * - Un **PNJ** tiene su estilo elegido de peinado y de vello facial y lo mantiene siempre (va a la peluquería con regularidad): sale de forma estable de su semilla
 *   de dibujo, su sexo, su tipo de pelo y su genética (`estiloDePersona`), sin guardar nada en el estado. La barba es una elección, no una consecuencia de la
 *   herencia: solo puede elegir lo que su vello le permite.
 * - Las **canas** y la **calvicie** llegan con la edad a todos (`fraccionDeCanas`, `gradoDeCalvicie`): con calvicie, el peinado se adapta a lo que queda (`peinadoPosible`).
 *   En los hombres la calvicie empieza por las **entradas** (hasta `CALVICIE.entradas`), luego clarea por arriba y, desde `CALVICIE.soloLados`, solo quedan los lados.
 * - El dibujo recibe el estilo y **el largo** del pelo (cm) y de la barba (mm): un corte que ha crecido se ve crecido. Recién hecho, el largo es el del estilo.
 */

export interface EstiloDePeinado {
  id: string;
  nombre: string;
  /** Largo del pelo (cm) con que queda recién hecho. */
  largo: number;
  /** Grado de calvicie (0 a 1, `gradoDeCalvicie`) hasta el que se puede llevar; por encima se lleva `siNo` (otro estilo del catálogo). */
  calvicieMaxima: number;
  siNo?: string;
  /** Tipos de pelo con los que se puede hacer (ausente: todos). */
  tipos?: readonly string[];
  /** Solo se puede hacer y arreglar en la peluquería. */
  premium: boolean;
  /** Cuánto lo eligen las mujeres y los hombres (pesos relativos; 0 = nunca por defecto). */
  peso: { f: number; m: number };
}

export const PEINADOS: readonly EstiloDePeinado[] = [
  // Los tres grados al cero: sin pelo en ningún sitio, la sombra de donde crece (respeta la calvicie) y el rapado.
  { id: 'afeitada', nombre: 'Cabeza afeitada', largo: 0, calvicieMaxima: 1, premium: false, peso: { f: 0, m: 0.04 } },
  { id: 'al_cero', nombre: 'Rapado al cero', largo: 0.15, calvicieMaxima: 1, premium: false, peso: { f: 0, m: 0.05 } },
  { id: 'rapado', nombre: 'Rapado', largo: 0.6, calvicieMaxima: 1, premium: false, peso: { f: 0.01, m: 0.1 } },
  { id: 'corto', nombre: 'Corto', largo: 4, calvicieMaxima: 0.55, siNo: 'rapado', premium: false, peso: { f: 0.05, m: 0.4 } },
  { id: 'flequillo', nombre: 'Corto con flequillo', largo: 6, calvicieMaxima: 0.2, siNo: 'corto', premium: false, peso: { f: 0.03, m: 0.22 } },
  { id: 'degradado', nombre: 'Degradado', largo: 5, calvicieMaxima: 0.4, siNo: 'rapado', premium: true, peso: { f: 0, m: 0.08 } },
  { id: 'tupe', nombre: 'Tupé', largo: 9, calvicieMaxima: 0.25, siNo: 'corto', premium: true, peso: { f: 0, m: 0.05 } },
  { id: 'bob', nombre: 'Media melena con flequillo', largo: 15, calvicieMaxima: 0.3, siNo: 'melena', premium: false, peso: { f: 0.13, m: 0 } },
  { id: 'melena', nombre: 'Melena', largo: 24, calvicieMaxima: 0.6, siNo: 'corto', premium: false, peso: { f: 0.22, m: 0.04 } },
  { id: 'largo', nombre: 'Largo', largo: 45, calvicieMaxima: 0.5, siNo: 'melena', premium: false, peso: { f: 0.25, m: 0.01 } },
  { id: 'coleta', nombre: 'Coleta', largo: 35, calvicieMaxima: 0.5, siNo: 'corto', premium: false, peso: { f: 0.13, m: 0 } },
  { id: 'mono', nombre: 'Moño', largo: 35, calvicieMaxima: 0.5, siNo: 'corto', premium: false, peso: { f: 0.1, m: 0.01 } },
  { id: 'trenzas', nombre: 'Dos trenzas', largo: 40, calvicieMaxima: 0.4, siNo: 'coleta', premium: true, peso: { f: 0.08, m: 0 } },
];

export interface EstiloDeVello {
  id: string;
  nombre: string;
  /** Largo (mm) con que queda recién hecho (0: afeitado). */
  largo: number;
  /** Densidad de barba (`Apariencia.barba`, 0 a 1) mínima para poder llevarlo. */
  densidadMinima: number;
  /** Solo se puede hacer y arreglar en la barbería. */
  premium: boolean;
  /** Cuánto lo eligen los hombres que pueden llevarlo (peso relativo). */
  peso: number;
}

export const VELLOS: readonly EstiloDeVello[] = [
  { id: 'afeitado', nombre: 'Afeitado', largo: 0, densidadMinima: 0, premium: false, peso: 0.5 },
  { id: 'bigote', nombre: 'Bigote', largo: 5, densidadMinima: 0.3, premium: false, peso: 0.06 },
  { id: 'perilla', nombre: 'Perilla', largo: 6, densidadMinima: 0.3, premium: false, peso: 0.06 },
  { id: 'candado', nombre: 'Candado', largo: 6, densidadMinima: 0.4, premium: true, peso: 0.05 },
  { id: 'barba_corta', nombre: 'Barba corta', largo: 6, densidadMinima: 0.45, premium: false, peso: 0.19 },
  { id: 'barba_perfilada', nombre: 'Barba perfilada', largo: 5, densidadMinima: 0.5, premium: true, peso: 0.07 },
  { id: 'barba_larga', nombre: 'Barba larga', largo: 30, densidadMinima: 0.6, premium: false, peso: 0.07 },
];

export const peinado = (id: string): EstiloDePeinado => PEINADOS.find((x) => x.id === id) ?? PEINADOS.find((x) => x.id === 'corto')!;
export const vello = (id: string): EstiloDeVello => VELLOS.find((x) => x.id === id) ?? VELLOS[0];

/** Edad (con el adelanto o retraso del desarrollo) desde la que hay vello facial: antes, nada; se completa a los 19. */
export const EDAD_DEL_VELLO = 15;

/** Los grados de la calvicie de un hombre: hasta `entradas` solo retrocede la línea del pelo en las sienes; hasta `soloLados` clarea además por arriba; después solo quedan los lados. */
export const CALVICIE = { entradas: 0.3, soloLados: 0.55 } as const;

/** Cuánto pelo se ha perdido (0 a 1) con una tendencia (`Apariencia.calvicie`) y una edad: quien tiene mucha empieza en la juventud; quien tiene poca, tarde o nunca. No retrocede. */
export function gradoDeCalvicie(tendencia: number, edad: number): number {
  const inicio = 18 + 40 * (1 - tendencia);
  return tendencia * Math.min(1, Math.max(0, (edad - inicio) / 30)) ** 0.7;
}

/** Qué parte del pelo es cana (0 a 1): empiezan a su edad (`Apariencia.canas`) y aumentan poco a poco durante unos 30 años. No retrocede. */
export function fraccionDeCanas(desde: number, edad: number): number {
  return Math.min(1, Math.max(0, (edad - desde) / 30)) ** 1.15;
}

/** El peinado que se puede llevar con un grado de calvicie: el pedido o, si ya no se puede, el que lo sustituye. */
export function peinadoPosible(id: string, calvicie: number): string {
  let e = peinado(id);
  for (let i = 0; i < PEINADOS.length && calvicie > e.calvicieMaxima && e.siNo; i++) e = peinado(e.siNo);
  return e.id;
}

/**
 * Qué parte de los hombres cambia de peinado cuando su calvicie pasa de las entradas (`CALVICIE.entradas`): unos se afeitan la cabeza y otros se rapan al cero, y lo
 * mantienen desde entonces. El resto sigue con su estilo mientras su calvicie lo admita (`peinadoPosible`).
 */
export const AL_QUEDARSE_CALVO = { afeitada: 0.2, alCero: 0.15 } as const;

/**
 * El peinado que lleva una persona con su estilo elegido y su grado de calvicie: el suyo, el que lo sustituye si ya no se puede o, en parte de los hombres (estable por
 * persona, con su semilla de dibujo), la cabeza afeitada o el rapado al cero desde que su calvicie pasa de las entradas. Como la calvicie no retrocede, el cambio es para siempre.
 */
export function peinadoConCalvicie(semilla: number, sexo: 'f' | 'm', elegido: string, calvicie: number): string {
  if (sexo === 'm' && calvicie > CALVICIE.entradas) {
    const u = rngEstable('look', semilla, 'calvo').next();
    if (u < AL_QUEDARSE_CALVO.afeitada) return 'afeitada';
    if (u < AL_QUEDARSE_CALVO.afeitada + AL_QUEDARSE_CALVO.alCero) return 'al_cero';
  }
  return peinadoPosible(elegido, calvicie);
}

/** ¿Puede llevar este vello facial con su densidad de barba? */
export const velloPosible = (id: string, densidad: number): boolean => densidad >= vello(id).densidadMinima;

/** El look de una persona: estilo y largo del pelo (cm) y del vello facial (mm). */
export interface Look {
  peinado: string;
  largoDelPelo: number;
  vello: string;
  largoDelVello: number;
  /**
   * El tinte (lo pondrá la peluquería; hoy nadie lo lleva): el color teñido del pelo y el de la barba, por separado (`#rrggbb`), y cuánto han crecido desde el tinte
   * (cm el pelo, mm la barba): al crecer se ven las raíces del color natural, con sus canas.
   */
  tinteDelPelo?: string;
  crecidoDesdeElTinte?: number;
  tinteDelVello?: string;
  crecidoDelVelloDesdeElTinte?: number;
}

function sorteo<T>(u: number, items: readonly T[], peso: (x: T) => number): T {
  const total = items.reduce((s, x) => s + peso(x), 0);
  let r = u * total;
  for (const x of items) { r -= peso(x); if (r < 0) return x; }
  return items[items.length - 1];
}

/**
 * El estilo que una persona elige y mantiene toda la vida (un PNJ; y el personaje mientras no tenga peluquería): sale solo de su semilla de dibujo, su sexo, su tipo
 * de pelo y su densidad de barba. Las mujeres van siempre sin vello facial. Lo que la edad cambia (calvicie, pubertad) lo aplica quien dibuja (`peinadoPosible`, `EDAD_DEL_VELLO`).
 */
export function estiloDePersona(semilla: number, sexo: 'f' | 'm', a: Pick<Apariencia, 'peloTipo' | 'barba'>): Look {
  const p = sorteo(rngEstable('look', semilla, 'peinado').next(), PEINADOS.filter((x) => !x.tipos || x.tipos.includes(a.peloTipo)), (x) => x.peso[sexo]);
  const v = sexo === 'f' ? VELLOS[0] : sorteo(rngEstable('look', semilla, 'vello').next(), VELLOS.filter((x) => a.barba >= x.densidadMinima), (x) => x.peso);
  return { peinado: p.id, largoDelPelo: p.largo, vello: v.id, largoDelVello: v.largo };
}
