/**
 * EL DIBUJO DE LAS PERSONAS (`docs/PLAN_VISUALIZADOR.md`, receta en `docs/ANEXO_RETRATOS.md`). Tres capas: los parámetros (`parametrosDe`, pura), el dibujo (de los
 * parámetros a SVG, determinista) y las pantallas (en la web, que solo pide el SVG y lo coloca). El retrato y la figura entera salen del mismo dibujo con otro encuadre.
 */
import type { CuerpoDePersona } from '@ds/contracts';
import { dibujarCara, medidasDeCara } from './cara';
import { dibujarCuerpo } from './cuerpo';
import { CUNA, dibujarCuna } from './cuna';
import { n } from './geometria';
import { Lienzo } from './lienzo';
import { cuerpoALaEdad, EDAD_MAXIMA_DEL_DIBUJO, parametrosDe, type Opciones, type Parametros } from './parametros';
import { dibujarPelo } from './pelo';

export * from './parametros';
export * from './catalogos';

export interface Dibujo {
  /** Definiciones (van en un `<defs>`) y el dibujo, en centímetros: x = 0 en el eje de la persona, y = 0 arriba (la coronilla), hacia abajo. */
  defs: string;
  cuerpo: string;
  /** Encuadre del retrato (x, y, ancho, alto), altura de lo dibujado y media anchura (cm). */
  retrato: readonly [number, number, number, number];
  altura: number;
  medioAncho: number;
}

/** Capa 2: de los parámetros al dibujo. `prefijo` hace únicos los ids (recortes) dentro de la página. */
export function dibujar(P: Parametros, prefijo: string): Dibujo {
  if (P.cuna) return { defs: '', cuerpo: dibujarCuna(), retrato: [-CUNA.ancho / 2 - 6, -8, CUNA.ancho + 12, CUNA.alto + 12], altura: CUNA.alto, medioAncho: CUNA.ancho / 2 };
  const L = new Lienzo(prefijo);
  const hh = P.cabeza, u = hh / 2;
  const C = medidasDeCara(P);
  const cuerpo = dibujarCuerpo(P, L.enEscala(u), C);
  const pelo = dibujarPelo(P, L, C, (cuerpo.hombros - u) / u);
  const cabeza = (contenido: string) => `<g transform="translate(0,${n(u)}) scale(${n(u)})">${contenido}</g>`;
  const todo = cabeza(pelo.atras) + cuerpo.svg + cabeza(dibujarCara(P, L, C) + pelo.delante);
  return { defs: L.defs.join(''), cuerpo: todo, retrato: [-0.9 * hh, -0.4 * hh, 1.8 * hh, 1.84 * hh], altura: P.altura, medioAncho: cuerpo.medioAncho };
}

/** La edad con la que se dibuja: años enteros, hasta los 95. */
export const edadDeDibujo = (edad: number): number => Math.min(EDAD_MAXIMA_DEL_DIBUJO, Math.max(0, Math.floor(edad)));

/** Prefijo de los ids de un dibujo: sale de sus parámetros (lo mismo dibujado dos veces lleva los mismos ids; dos dibujos distintos, nunca). */
function prefijoDe(P: Parametros, vista: string): string {
  const t = JSON.stringify(P);
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 0x01000193);
  return `${vista}${(h >>> 0).toString(36)}_`;
}

/** El retrato (cara y hombros) de una persona a una edad, como un `<svg>` entero. */
export function retratoSvg(c: CuerpoDePersona, edad: number, o: Opciones = {}): string {
  const e = edadDeDibujo(edad);
  const P = parametrosDe(c, e, o);
  const d = dibujar(P, prefijoDe(P, 'r'));
  const [x, y, w, h] = d.retrato;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="retrato" viewBox="${n(x)} ${n(y)} ${n(w)} ${n(h)}" role="img"><defs>${d.defs}</defs>${d.cuerpo}</svg>`;
}

export interface FiguraEnRegla {
  cuerpo: CuerpoDePersona;
  edad: number;
  opciones?: Opciones;
  /** Texto bajo la figura (por ejemplo, la edad). */
  rotulo?: string;
}

/**
 * Una o varias figuras enteras a escala junto a una regla en centímetros (la fila de la evolución, o una sola figura grande). Las líneas y los números usan
 * `currentColor`: toman el color del texto de donde se coloquen (tema claro u oscuro).
 */
export function figurasSvg(figuras: readonly FiguraEnRegla[], opciones: { alturaMaxima?: number; /** `false`: sin números (ni en la regla ni bajo las figuras). */ cifras?: boolean } = {}): string {
  const cifras = opciones.cifras ?? true;
  const dibujos = figuras.map((f) => { const P = parametrosDe(f.cuerpo, edadDeDibujo(f.edad), f.opciones); return { f, P, d: dibujar(P, prefijoDe(P, 'f')) }; });
  const tope = Math.ceil((opciones.alturaMaxima ?? Math.max(100, ...dibujos.map((x) => x.d.altura + 8))) / 10) * 10;
  const o: string[] = [];
  const defs: string[] = [];
  const texto = (x: number, y: number, t: string, ancla = 'middle', peso = 400) => `<text x="${n(x)}" y="${n(y)}" text-anchor="${ancla}" fill="currentColor" font-size="5.4" font-weight="${peso}" font-family="system-ui,sans-serif"${peso === 400 ? ' opacity="0.75"' : ''}>${t}</text>`;
  let x = 22;
  const centros: number[] = [];
  for (const { d } of dibujos) { const medio = Math.max(17, d.medioAncho + 5); centros.push(x + medio); x += medio * 2; }
  const ancho = x + 4;
  // La regla: una marca cada 10 cm y un número cada 50.
  for (let cm = 0; cm <= tope; cm += 10) {
    const y = tope - cm, grande = cm % 50 === 0;
    o.push(`<line x1="${grande ? 10 : 14}" y1="${y}" x2="18" y2="${y}" stroke="currentColor" stroke-width="0.5" opacity="0.7"/>`);
    if (grande) o.push(`<line x1="18" y1="${y}" x2="${n(ancho - 2)}" y2="${y}" stroke="currentColor" stroke-width="0.35" stroke-dasharray="2 2" opacity="0.25"/>`, cifras ? texto(8.5, y + 1.9, String(cm), 'end') : '');
  }
  o.push(`<line x1="18" y1="0" x2="18" y2="${tope}" stroke="currentColor" stroke-width="0.5" opacity="0.7"/>`, cifras ? texto(8.5, -5, 'cm', 'end') : '');
  dibujos.forEach(({ f, P, d }, i) => {
    defs.push(d.defs);
    o.push(`<g transform="translate(${n(centros[i])},${n(tope - d.altura)})">${d.cuerpo}</g>`);
    if (f.rotulo) o.push(texto(centros[i], tope + 9, f.rotulo, 'middle', 600));
    if (!P.cuna && cifras) o.push(texto(centros[i], tope + (f.rotulo ? 16 : 9), `${Math.round(d.altura)} cm`));
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" class="figuras" viewBox="-4 -14 ${n(ancho + 4)} ${n(tope + 34)}" role="img"><defs>${defs.join('')}</defs>${o.join('')}</svg>`;
}

// ------------------------------------------------------------------------------------------------------------ con memoria

const MEMORIA = new Map<string, string>();
const MAXIMO_EN_MEMORIA = 400;

function recordado(clave: string, hacer: () => string): string {
  let v = MEMORIA.get(clave);
  if (v === undefined) {
    if (MEMORIA.size >= MAXIMO_EN_MEMORIA) MEMORIA.clear();
    v = hacer();
    MEMORIA.set(clave, v);
  }
  return v;
}

const claveDe = (vista: string, c: CuerpoDePersona, edad: number, o: Opciones): string => `${vista}|${c.id}|${c.semilla}|${c.sexo}|${c.alturaAdulta}|${c.madurez}|${edad}|${Math.round(o.musculo ?? c.musculo)}|${Math.round(o.grasa ?? c.grasa)}|${JSON.stringify(o.look ?? 0)}|${o.camiseta ?? ''}|${o.pantalon ?? ''}`;

/**
 * Lo que piden las pantallas: el retrato de una persona a una edad (años), con el músculo y la grasa que tenía entonces (su historial) y guardado en memoria por
 * persona, edad en años y vista. `edadHoy` es su edad de hoy (años con decimales).
 */
export function retratoDe(c: CuerpoDePersona, edad: number, edadHoy: number, o: Opciones = {}): string {
  const e = edadDeDibujo(edad);
  const op = { ...cuerpoALaEdad(c, e, edadHoy), ...o };
  return recordado(claveDe('r', c, e, op), () => retratoSvg(c, e, op));
}

/** Las edades de la fila de la evolución: las etapas que ya ha vivido y la de hoy. */
export const ETAPAS_DE_LA_EVOLUCION: readonly number[] = [3, 8, 12, 15, 18, 30, 50, 70, 90];
export function etapasVividas(edadHoy: number): number[] {
  const hoy = edadDeDibujo(edadHoy);
  return [...ETAPAS_DE_LA_EVOLUCION.filter((e) => e < hoy), hoy];
}

/** La fila de la evolución: la persona en las etapas que ya ha vivido (y hoy), a escala junto a la regla. */
export function evolucionDe(c: CuerpoDePersona, edadHoy: number, o: Opciones = {}): string {
  const etapas = etapasVividas(edadHoy);
  return recordado(claveDe(`e${etapas.length}`, c, edadDeDibujo(edadHoy), o), () =>
    figurasSvg(etapas.map((e) => ({ cuerpo: c, edad: e, opciones: { ...cuerpoALaEdad(c, e, edadHoy), ...o }, rotulo: e < EDAD_MINIMA ? 'bebé' : `${e} años` })), { alturaMaxima: Math.max(...etapas.map((e) => parametrosDe(c, e).altura)) + 10 }));
}

/** Una figura grande a una edad (la del deslizador), junto a la regla; la regla llega siempre a la misma altura para que se vea crecer. */
export function figuraDe(c: CuerpoDePersona, edad: number, edadHoy: number, o: Opciones = {}): string {
  const e = edadDeDibujo(edad);
  const op = { ...cuerpoALaEdad(c, e, edadHoy), ...o };
  return recordado(claveDe('f', c, e, op), () => figurasSvg([{ cuerpo: c, edad: e, opciones: op }], { alturaMaxima: c.alturaAdulta + 10 }));
}

const EDAD_MINIMA = 3;
