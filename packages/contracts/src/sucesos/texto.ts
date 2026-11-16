import type { Gender } from '../services';

/**
 * Textos de los sucesos: plantillas con llaves, no código.
 *   {tutor.nombre} / {tutor.Nombre}   cómo se le llama (con mayúscula inicial si el campo va en mayúscula)
 *   {tutor:o|a}                       «o» si es él, «a» si es ella (vale cualquier par: {tutor:él|ella})
 *   {yo:o|a}, {yo.nombre}             lo mismo para quien vive el suceso
 *   {señal.faltas}, {recuerdo.x}      datos de la señal que lo disparó y de la memoria del hilo
 *   {pais}                            nombre del país de la partida
 */

/** Lo que se sabe de una persona para escribir sobre ella. `campos` son textos extra (`diaDelCumple`…). */
export interface PersonaDeTexto {
  nombre: string;
  nombreCompleto?: string;
  gender: Gender;
  campos?: Readonly<Record<string, string>>;
}

export interface DatosDeTexto {
  /** Quien vive el suceso. */
  yo: PersonaDeTexto;
  papeles: Readonly<Record<string, PersonaDeTexto | undefined>>;
  señal?: Readonly<Record<string, unknown>>;
  recuerdo?: Readonly<Record<string, string | number>>;
  pais?: string;
}

export type LlaveDeTexto =
  | { tipo: 'campo'; quien: string; campo: string; mayuscula: boolean }
  | { tipo: 'genero'; quien: string; m: string; f: string }
  | { tipo: 'dato'; de: 'señal' | 'recuerdo'; clave: string }
  | { tipo: 'pais' };

const LLAVE = /\{([^{}]*)\}/g;
const NOMBRE = /^[a-zñ_][a-zñ0-9_]*$/i;

function leerLlave(dentro: string): LlaveDeTexto | string {
  if (dentro === 'pais') return { tipo: 'pais' };
  const dos = dentro.indexOf(':');
  if (dos >= 0) {
    const quien = dentro.slice(0, dos);
    const formas = dentro.slice(dos + 1).split('|');
    if (!NOMBRE.test(quien) || formas.length !== 2) return `«{${dentro}}»: se esperaba {papel:masculino|femenino}`;
    return { tipo: 'genero', quien, m: formas[0], f: formas[1] };
  }
  const punto = dentro.indexOf('.');
  if (punto < 0) return `«{${dentro}}»: se esperaba {papel.campo}, {papel:m|f}, {señal.dato}, {recuerdo.dato} o {pais}`;
  const quien = dentro.slice(0, punto);
  const campo = dentro.slice(punto + 1);
  if (!NOMBRE.test(quien) || !NOMBRE.test(campo)) return `«{${dentro}}»: nombre no válido`;
  if (quien === 'señal' || quien === 'recuerdo') return { tipo: 'dato', de: quien, clave: campo };
  const minuscula = campo[0].toLowerCase() + campo.slice(1);
  return { tipo: 'campo', quien, campo: minuscula, mayuscula: campo !== minuscula };
}

/** Las llaves de una plantilla y lo que está mal escrito en ella (llaves sin cerrar, formas desconocidas). */
export function analizarTexto(plantilla: string): { llaves: LlaveDeTexto[]; problemas: string[] } {
  const llaves: LlaveDeTexto[] = [];
  const problemas: string[] = [];
  for (const m of plantilla.matchAll(LLAVE)) {
    const l = leerLlave(m[1]);
    if (typeof l === 'string') problemas.push(l);
    else llaves.push(l);
  }
  if (/[{}]/.test(plantilla.replace(LLAVE, ''))) problemas.push('hay una llave sin abrir o sin cerrar');
  return { llaves, problemas };
}

const mayuscula = (t: string): string => (t ? t[0].toUpperCase() + t.slice(1) : t);

/** El texto compuesto. Lanza un error si falta alguien o algún dato: la validación lo comprueba antes para todos los sucesos. */
export function componerTexto(plantilla: string, datos: DatosDeTexto): string {
  return plantilla.replace(LLAVE, (_todo, dentro: string) => {
    const l = leerLlave(dentro);
    if (typeof l === 'string') throw new Error(`Texto de suceso: ${l}`);
    if (l.tipo === 'pais') return datos.pais ?? '';
    if (l.tipo === 'dato') {
      const v = (l.de === 'señal' ? datos.señal : datos.recuerdo)?.[l.clave];
      if (v === undefined) throw new Error(`Texto de suceso: falta el dato {${dentro}}`);
      return String(v);
    }
    const p = l.quien === 'yo' ? datos.yo : datos.papeles[l.quien];
    if (!p) throw new Error(`Texto de suceso: no hay nadie en el papel «${l.quien}»`);
    if (l.tipo === 'genero') return p.gender === 'f' ? l.f : l.m;
    const v = l.campo === 'nombre' ? p.nombre : l.campo === 'nombreCompleto' ? (p.nombreCompleto ?? p.nombre) : p.campos?.[l.campo];
    if (v === undefined) throw new Error(`Texto de suceso: «${l.quien}» no tiene «${l.campo}»`);
    return l.mayuscula ? mayuscula(v) : v;
  });
}
