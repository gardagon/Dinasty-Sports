import type { EstadoVinculo } from '../relaciones';
import type { Comparacion, Condicion, ConfigDeSucesos, OpcionDef, PeriodoDelCurso, Rango, TiradaDef } from './tipos';

/**
 * De dónde salen los hechos que miran las condiciones. El director lo monta sobre los servicios de la partida; las pruebas, sobre lo que
 * diga `dado`; y un PNJ, sobre su lector de persona. Lo que no se sabe (`undefined`) hace falsa la condición.
 */
export interface LectorDeHechos {
  stat(id: string): number | undefined;
  /** Un hecho con nombre: los comunes (`HECHOS_COMUNES`) o los de un módulo (`<módulo>.<nombre>`). */
  hecho(nombre: string): number | string | boolean | undefined;
  periodo(): PeriodoDelCurso | undefined;
  /** 0 = lunes. */
  diaDeLaSemana(): number;
  minutoDelDia(): number;
  lugar(): string | undefined;
  /** ¿Esta persona está donde quien vive el suceso? */
  presente(persona: string): boolean;
  relacion(persona: string): { afinidad: number; confianza: number; estado: EstadoVinculo } | undefined;
  familia(persona: string): { apoyo: number; expectativas: number } | undefined;
  perk(id: string): 'no' | 'latente' | 'revelado';
  caracter(eje: string): number | undefined;
  enClub(deporte?: string): boolean;
}

/** La memoria y el momento contra los que se evalúa una condición. */
export interface ContextoDeCondicion {
  hechos: LectorDeHechos;
  /** Papel → id de persona (los que tienen a alguien). */
  reparto: Readonly<Record<string, string>>;
  marca(nombre: string, persona?: string): boolean;
  contador(id: string): number;
  recuerdo(clave: string): number | string | undefined;
  /** Datos de la señal que disparó el suceso. */
  señal?: Readonly<Record<string, unknown>>;
}

const enRango = (v: number | undefined, r: Rango | undefined): boolean =>
  r === undefined || (v !== undefined && (r.min === undefined || v >= r.min) && (r.max === undefined || v <= r.max));

function compara(v: unknown, c: Comparacion, ctx: ContextoDeCondicion): boolean {
  if (v === undefined) return false;
  if (c.incluye !== undefined) return Array.isArray(v) && v.includes(c.incluye);
  if (c.es !== undefined) return v === c.es;
  if (c.min === undefined && c.max === undefined) return v !== false && v !== 0 && v !== '';
  if (typeof v !== 'number') return false;
  let n = v;
  if (c.sobreRecuerdo !== undefined) {
    const antes = ctx.recuerdo(c.sobreRecuerdo);
    if (typeof antes !== 'number') return false;
    n -= antes;
  }
  return enRango(n, c);
}

const lista = <T>(v: T | readonly T[]): readonly T[] => (Array.isArray(v) ? v : [v as T]);

/** ¿Se cumple esta condición? Pura: todo lo que mira llega por `ctx`. */
export function cumple(c: Condicion, ctx: ContextoDeCondicion): boolean {
  const h = ctx.hechos;
  if ('no' in c) return !cumple(c.no, ctx);
  if ('alguna' in c) return c.alguna.some((x) => cumple(x, ctx));
  if ('todas' in c) return cumplenTodas(c.todas, ctx);
  if ('stat' in c) return enRango(h.stat(c.stat), c);
  if ('hecho' in c) return compara(h.hecho(c.hecho), c, ctx);
  if ('periodo' in c) return lista(c.periodo).includes(h.periodo() as PeriodoDelCurso);
  if ('diaDeLaSemana' in c) return c.diaDeLaSemana.includes(h.diaDeLaSemana());
  if ('hora' in c) return enRango(h.minutoDelDia(), { min: c.hora.desde, max: c.hora.hasta });
  if ('lugar' in c) return lista(c.lugar).includes(h.lugar() as string);
  if ('presente' in c) return ctx.reparto[c.presente] !== undefined && h.presente(ctx.reparto[c.presente]);
  if ('papel' in c) return ctx.reparto[c.papel] !== undefined;
  if ('relacion' in c) {
    const r = ctx.reparto[c.relacion] === undefined ? undefined : h.relacion(ctx.reparto[c.relacion]);
    return !!r && enRango(r.afinidad, c.afinidad) && enRango(r.confianza, c.confianza) && (c.estado === undefined || lista(c.estado).includes(r.estado));
  }
  if ('familia' in c) {
    const f = ctx.reparto[c.familia] === undefined ? undefined : h.familia(ctx.reparto[c.familia]);
    return !!f && enRango(f.apoyo, c.apoyo) && enRango(f.expectativas, c.expectativas);
  }
  if ('perk' in c) {
    const p = h.perk(c.perk);
    return p !== 'no' && (c.revelado === undefined || (p === 'revelado') === c.revelado);
  }
  if ('caracter' in c) return enRango(h.caracter(c.caracter), c);
  if ('enClub' in c) return h.enClub(c.deporte) === c.enClub;
  if ('marca' in c) {
    if (c.de === undefined) return ctx.marca(c.marca);
    return ctx.reparto[c.de] !== undefined && ctx.marca(c.marca, ctx.reparto[c.de]);
  }
  if ('contador' in c) return enRango(ctx.contador(c.contador), c);
  if ('recuerdo' in c) return compara(ctx.recuerdo(c.recuerdo), c, ctx);
  if ('señal' in c) return compara(ctx.señal?.[c.señal], c, ctx);
  return false;
}

export const cumplenTodas = (cs: readonly Condicion[] | undefined, ctx: ContextoDeCondicion): boolean => !cs || cs.every((c) => cumple(c, ctx));

/** Lo que cuesta evaluar cada clase de condición, de menos a más: las baratas se miran primero (`ordenarCondiciones`). */
const COSTE: Record<string, number> = { marca: 0, contador: 0, recuerdo: 0, señal: 0, papel: 0, stat: 1, periodo: 1, diaDeLaSemana: 1, hora: 1, perk: 2, caracter: 2, hecho: 3, lugar: 3, enClub: 3, familia: 4, relacion: 4, presente: 5, no: 6, alguna: 6, todas: 6 };
const claseDe = (c: Condicion): string => Object.keys(c).find((k) => k in COSTE) ?? 'todas';

/** Las mismas condiciones con las más baratas delante (el resultado no cambia: todas deben cumplirse). */
export const ordenarCondiciones = (cs: readonly Condicion[]): Condicion[] => [...cs].sort((a, b) => COSTE[claseDe(a)] - COSTE[claseDe(b)]);

/**
 * Probabilidad de acertar una tirada: 50 % cuando el nivel (0 a 100, «para su edad») iguala la dificultad, 15 puntos más o menos por cada
 * 10 de diferencia, siempre entre el 5 % y el 95 %. Provisional: se calibra con la simulación (`docs/PLAN_EVENTOS.md`, P13).
 */
/** `suertudo`: probabilidad de repetir una tirada fallada. `gafe`: probabilidad de que una acertada se tuerza (E5.6). */
export const TIRADA = { porCada10: 0.15, min: 0.05, max: 0.95, suertudo: 0.25, gafe: 0.15 } as const;
export const probabilidadDeExito = (nivel: number, dificultad: number): number =>
  Math.min(TIRADA.max, Math.max(TIRADA.min, 0.5 + ((nivel - dificultad) / 10) * TIRADA.porCada10));

/** La dificultad de una tirada en esta situación: la base más los ajustes que se cumplen, siempre entre 0 y 100. */
export const dificultadDeTirada = (t: TiradaDef, ctx: ContextoDeCondicion): number =>
  Math.min(100, Math.max(0, t.dificultad + (t.ajustes ?? []).reduce((suma, a) => (cumplenTodas(a.si, ctx) ? suma + a.mas : suma), 0)));

/** ¿Encaja esta opción con el carácter de quien decide? No encaja si tira con fuerza en contra de un eje que tiene muy marcado. */
export function encajaConCaracter(
  inclinacion: Readonly<Record<string, number>> | undefined,
  caracter: (eje: string) => number | undefined,
  cfg: Pick<ConfigDeSucesos['presentacion'], 'ejeMarcado' | 'inclinacionMinima'>,
): { encaja: true } | { encaja: false; eje: string } {
  for (const [eje, tira] of Object.entries(inclinacion ?? {})) {
    const v = caracter(eje) ?? 0;
    if (Math.abs(tira) >= cfg.inclinacionMinima && Math.abs(v) >= cfg.ejeMarcado && tira * v < 0) return { encaja: false, eje };
  }
  return { encaja: true };
}

export interface OpcionEvaluada {
  id: string;
  /** Se enseña (aunque no se pueda elegir). */
  visible: boolean;
  elegible: boolean;
  /** Por qué no se puede elegir: `requisito` (no cumple `requiere`) o `caracter` (no va con su forma de ser, y el modo es sombrear u ocultar). */
  motivo?: 'requisito' | 'caracter';
  /** Eje con el que choca, si no encaja con el carácter (también cuando el modo es `normales` y se puede elegir). */
  ejeEnContra?: string;
}

/** Cómo se presenta una opción a quien decide, con la configuración de presentación. Vale para un suceso y para una decisión dentro de una competición. */
export function evaluarOpcion(op: OpcionDef, ctx: ContextoDeCondicion, cfg: ConfigDeSucesos['presentacion']): OpcionEvaluada {
  if (!cumplenTodas(op.requiere, ctx)) return { id: op.id, visible: !op.oculta, elegible: false, motivo: 'requisito' };
  const e = encajaConCaracter(op.caracter, (eje) => ctx.hechos.caracter(eje), cfg);
  if (e.encaja) return { id: op.id, visible: true, elegible: true };
  if (cfg.fueraDeCaracter === 'normales') return { id: op.id, visible: true, elegible: true, ejeEnContra: e.eje };
  return { id: op.id, visible: cfg.fueraDeCaracter === 'sombreadas', elegible: false, motivo: 'caracter', ejeEnContra: e.eje };
}

/**
 * Qué opción elige quien decide por su carácter (un PNJ, un bot): cada opción elegible pesa más cuanto más tira hacia donde él ya está.
 * `azar` es un número en [0, 1) estable (de `rngEstable`). Sin opciones elegibles, `undefined`.
 */
export function elegirPorCaracter(opciones: readonly OpcionDef[], elegibles: readonly string[], caracter: (eje: string) => number | undefined, azar: number): string | undefined {
  const ops = opciones.filter((o) => elegibles.includes(o.id));
  if (!ops.length) return undefined;
  const pesos = ops.map((o) => {
    let afin = 0;
    for (const [eje, tira] of Object.entries(o.caracter ?? {})) afin += (tira * (caracter(eje) ?? 0)) / 50;
    return Math.exp(afin);
  });
  let r = azar * pesos.reduce((a, b) => a + b, 0);
  for (let i = 0; i < ops.length; i++) if ((r -= pesos[i]) < 0) return ops[i].id;
  return ops[ops.length - 1].id;
}
