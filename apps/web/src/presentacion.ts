import { APORTE_DE_CONFIG_DE_SUCESOS, defineModule, type CambiosDeConfigDeSucesos, type ConfigDeSucesos, type GameModule } from '@ds/contracts';

/**
 * Cómo se presentan los sucesos, elegido por la persona en «Opciones». Es una preferencia del navegador (como la frecuencia de guardado),
 * no de la partida: se guarda fuera de ella y llega al motor como un aporte `sucesos.config`, sin estado propio.
 */
export type Presentacion = Pick<ConfigDeSucesos['presentacion'], 'consecuencias' | 'fueraDeCaracter'>;

export const PRESENTACION_POR_DEFECTO: Presentacion = { consecuencias: 'pistas', fueraDeCaracter: 'normales' };

/**
 * Lo que se guarda en el navegador: lo que llega al motor (`Presentacion`) y lo que solo es de la interfaz.
 * `avisoFueraDeCaracter`: en modo «normales», una opción que no va con el carácter lleva una nota «no va contigo». Activado por defecto.
 */
export interface Preferencias extends Presentacion {
  avisoFueraDeCaracter: boolean;
}

export const PREFERENCIAS_POR_DEFECTO: Preferencias = { ...PRESENTACION_POR_DEFECTO, avisoFueraDeCaracter: true };

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
      avisoFueraDeCaracter: typeof x?.avisoFueraDeCaracter === 'boolean' ? x.avisoFueraDeCaracter : PREFERENCIAS_POR_DEFECTO.avisoFueraDeCaracter,
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
    p.consecuencias === PRESENTACION_POR_DEFECTO.consecuencias && p.fueraDeCaracter === PRESENTACION_POR_DEFECTO.fueraDeCaracter ? [] : [{ presentacion: { consecuencias: p.consecuencias, fueraDeCaracter: p.fueraDeCaracter } }];
  return defineModule<Record<string, never>>({
    id: 'presentacion',
    name: 'Presentación (preferencias de la web)',
    aportes: { [APORTE_DE_CONFIG_DE_SUCESOS]: cambios },
  } as GameModule<Record<string, never>>);
}
