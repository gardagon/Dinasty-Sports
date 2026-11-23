import { APORTE_DE_CONFIG_DE_SUCESOS, CATEGORIAS_DURAS, CONTENIDO_DURO_POR_DEFECTO, defineModule, type CambiosDeConfigDeSucesos, type CategoriaDura, type ConfigDeContenidoDuro, type ConfigDeSucesos, type GameModule } from '@ds/contracts';

/**
 * Cómo se presentan los sucesos, elegido por la persona en «Opciones». Es una preferencia del navegador (como la frecuencia de guardado),
 * no de la partida: se guarda fuera de ella y llega al motor como un aporte `sucesos.config`, sin estado propio.
 */
export type Presentacion = Pick<ConfigDeSucesos['presentacion'], 'consecuencias' | 'fueraDeCaracter'> & { duro?: ConfigDeContenidoDuro };

export const PRESENTACION_POR_DEFECTO: Presentacion = { consecuencias: 'pistas', fueraDeCaracter: 'normales' };

/**
 * Lo que se guarda en el navegador: lo que llega al motor (`Presentacion`) y lo que solo es de la interfaz.
 * `avisoFueraDeCaracter`: en modo «normales», una opción que no va con el carácter lleva una nota «no va contigo». Activado por defecto.
 */
export interface Preferencias extends Presentacion {
  /** Contenido duro (familia, burlas, peleas): interruptor general y categorías. Desactivado por defecto (`CONTENIDO_DURO_POR_DEFECTO`). Llega al motor con el resto de la presentación. */
  duro: ConfigDeContenidoDuro;
  avisoFueraDeCaracter: boolean;
  /** Qué hacer cuando se va el grupo con el que estás (el suceso `eventos.grupo.se_van`): preguntar, ir siempre con ellos o quedarme. Solo de la interfaz: el motor sigue ofreciendo las dos opciones. */
  cuandoSeVaElGrupo: CuandoSeVaElGrupo;
}

export type CuandoSeVaElGrupo = 'preguntar' | 'ir' | 'quedarme';

export const PREFERENCIAS_POR_DEFECTO: Preferencias = { ...PRESENTACION_POR_DEFECTO, duro: CONTENIDO_DURO_POR_DEFECTO, avisoFueraDeCaracter: true, cuandoSeVaElGrupo: 'preguntar' };

/** El contenido duro tal como lo deja una casilla de Opciones o de la pantalla de crear partida: `pres-duro` es el interruptor general y `pres-duro-<categoría>`, cada categoría. */
export function cambiarDuro(actual: ConfigDeContenidoDuro, casilla: string, marcada: boolean): ConfigDeContenidoDuro {
  if (casilla === 'pres-duro') return { ...actual, activado: marcada };
  const categoria = CATEGORIAS_DURAS.find((c) => `pres-duro-${c.id}` === casilla)?.id;
  return categoria ? { ...actual, categorias: { ...actual.categorias, [categoria]: marcada } } : actual;
}

export const mismoDuro = (a: ConfigDeContenidoDuro | undefined, b: ConfigDeContenidoDuro | undefined): boolean => JSON.stringify(a ?? CONTENIDO_DURO_POR_DEFECTO) === JSON.stringify(b ?? CONTENIDO_DURO_POR_DEFECTO);

const duroLeido = (x: unknown): ConfigDeContenidoDuro => {
  const d = x as Partial<ConfigDeContenidoDuro> | undefined;
  const categorias = Object.fromEntries(CATEGORIAS_DURAS.map((c) => [c.id, typeof d?.categorias?.[c.id] === 'boolean' ? d.categorias[c.id] : CONTENIDO_DURO_POR_DEFECTO.categorias[c.id]])) as Record<CategoriaDura, boolean>;
  return { activado: typeof d?.activado === 'boolean' ? d.activado : CONTENIDO_DURO_POR_DEFECTO.activado, categorias };
};

export const MODOS_DEL_GRUPO: readonly { id: CuandoSeVaElGrupo; nombre: string }[] = [
  { id: 'preguntar', nombre: 'Preguntarme' },
  { id: 'ir', nombre: 'Ir siempre con ellos' },
  { id: 'quedarme', nombre: 'Quedarme' },
];

/** El suceso del motor que avisa de que se va el grupo, y las opciones con que se responde sin preguntar. */
export const SUCESO_DEL_GRUPO = 'eventos.grupo.se_van';

/**
 * Qué hace la web con el aviso del grupo según la preferencia: `ir` lo responde ya «ir con ellos» (la acción que hay que hacer, que gasta los minutos del camino), `quedarme` no enseña
 * nada (si haces otra cosa, el momento pasa y te quedas, sin gastar tiempo) y `preguntar` lo enseña como cualquier suceso.
 */
export function respuestaAlGrupo(p: Pick<Preferencias, 'cuandoSeVaElGrupo'>, pendientes: readonly { suceso: string; opciones: readonly { id: string; accion: string; elegible: boolean }[] }[]): { accion?: string; ocultar: boolean } | undefined {
  const aviso = pendientes.find((x) => x.suceso === SUCESO_DEL_GRUPO);
  if (!aviso || p.cuandoSeVaElGrupo === 'preguntar') return undefined;
  if (p.cuandoSeVaElGrupo === 'quedarme') return { ocultar: true };
  const ir = aviso.opciones.find((o) => o.id === 'acompanar' && o.elegible);
  return ir ? { accion: ir.accion, ocultar: true } : undefined;
}

/** La nota que lleva una opción elegible que choca con el carácter, o `undefined` si no toca avisar. */
export function avisoDeCaracter(p: Preferencias, ejeEnContra: string | undefined): string | undefined {
  return p.fueraDeCaracter === 'normales' && p.avisoFueraDeCaracter && ejeEnContra ? `No va contigo (${ejeEnContra})` : undefined;
}

export const MODOS_DE_CONSECUENCIAS: readonly { id: Presentacion['consecuencias']; nombre: string }[] = [
  { id: 'pistas', nombre: 'Pistas en palabras' },
  { id: 'numeros', nombre: 'Números' },
  { id: 'nada', nombre: 'Nada' },
];

export const MODOS_FUERA_DE_CARACTER: readonly { id: Presentacion['fueraDeCaracter']; nombre: string }[] = [
  { id: 'normales', nombre: 'Como las demás' },
  { id: 'sombreadas', nombre: 'Sombreadas, con el motivo' },
  { id: 'ocultas', nombre: 'Ocultas' },
];

const CLAVE = 'dinasty-sports.presentacion';

const es = <T extends string>(lista: readonly { id: T }[], x: unknown): x is T => lista.some((m) => m.id === x);

/** Lo guardado, saneado: lo que falta o no vale se queda en el valor por defecto. */
export function leerPresentacion(almacenLocal: Pick<Storage, 'getItem'> | undefined = guardadoLocal()): Preferencias {
  try {
    const x = JSON.parse(almacenLocal?.getItem(CLAVE) ?? 'null') as Partial<Preferencias> | null;
    return {
      consecuencias: es(MODOS_DE_CONSECUENCIAS, x?.consecuencias) ? x.consecuencias : PRESENTACION_POR_DEFECTO.consecuencias,
      fueraDeCaracter: es(MODOS_FUERA_DE_CARACTER, x?.fueraDeCaracter) ? x.fueraDeCaracter : PRESENTACION_POR_DEFECTO.fueraDeCaracter,
      duro: duroLeido(x?.duro),
      avisoFueraDeCaracter: typeof x?.avisoFueraDeCaracter === 'boolean' ? x.avisoFueraDeCaracter : PREFERENCIAS_POR_DEFECTO.avisoFueraDeCaracter,
      cuandoSeVaElGrupo: es(MODOS_DEL_GRUPO, x?.cuandoSeVaElGrupo) ? x.cuandoSeVaElGrupo : PREFERENCIAS_POR_DEFECTO.cuandoSeVaElGrupo,
    };
  } catch {
    return { ...PREFERENCIAS_POR_DEFECTO };
  }
}

export function escribirPresentacion(p: Preferencias, almacenLocal: Pick<Storage, 'setItem'> | undefined = guardadoLocal()): void {
  try {
    almacenLocal?.setItem(CLAVE, JSON.stringify(p));
  } catch {
    /* sin almacenamiento local: vale mientras dure la pestaña */
  }
}

function guardadoLocal(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

/** El módulo que lleva la elección al motor: solo un aporte, sin estado. Los valores por defecto no aportan nada. */
export function moduloDePresentacion(p: Presentacion): GameModule<Record<string, never>> {
  const cambios: CambiosDeConfigDeSucesos[] =
    p.consecuencias === PRESENTACION_POR_DEFECTO.consecuencias && p.fueraDeCaracter === PRESENTACION_POR_DEFECTO.fueraDeCaracter && mismoDuro(p.duro, undefined) ? [] : [{ presentacion: { consecuencias: p.consecuencias, fueraDeCaracter: p.fueraDeCaracter, ...(p.duro ? { duro: p.duro } : {}) } }];
  return defineModule<Record<string, never>>({
    id: 'presentacion',
    name: 'Presentación (preferencias de la web)',
    aportes: { [APORTE_DE_CONFIG_DE_SUCESOS]: cambios },
  } as GameModule<Record<string, never>>);
}
