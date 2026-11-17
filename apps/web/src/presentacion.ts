import { APORTE_DE_CONFIG_DE_SUCESOS, defineModule, type CambiosDeConfigDeSucesos, type ConfigDeSucesos, type GameModule } from '@ds/contracts';

/**
 * Cómo se presentan los sucesos, elegido por la persona en «Opciones». Es una preferencia del navegador (como la frecuencia de guardado),
 * no de la partida: se guarda fuera de ella y llega al motor como un aporte `sucesos.config`, sin estado propio.
 */
export type Presentacion = Pick<ConfigDeSucesos['presentacion'], 'consecuencias' | 'fueraDeCaracter'>;

export const PRESENTACION_POR_DEFECTO: Presentacion = { consecuencias: 'pistas', fueraDeCaracter: 'normales' };

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
export function leerPresentacion(almacenLocal: Pick<Storage, 'getItem'> | undefined = guardadoLocal()): Presentacion {
  try {
    const x = JSON.parse(almacenLocal?.getItem(CLAVE) ?? 'null') as Partial<Presentacion> | null;
    return {
      consecuencias: es(MODOS_DE_CONSECUENCIAS, x?.consecuencias) ? x.consecuencias : PRESENTACION_POR_DEFECTO.consecuencias,
      fueraDeCaracter: es(MODOS_FUERA_DE_CARACTER, x?.fueraDeCaracter) ? x.fueraDeCaracter : PRESENTACION_POR_DEFECTO.fueraDeCaracter,
    };
  } catch {
    return { ...PRESENTACION_POR_DEFECTO };
  }
}

export function escribirPresentacion(p: Presentacion, almacenLocal: Pick<Storage, 'setItem'> | undefined = guardadoLocal()): void {
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
    p.consecuencias === PRESENTACION_POR_DEFECTO.consecuencias && p.fueraDeCaracter === PRESENTACION_POR_DEFECTO.fueraDeCaracter ? [] : [{ presentacion: { ...p } }];
  return defineModule<Record<string, never>>({
    id: 'presentacion',
    name: 'Presentación (preferencias de la web)',
    aportes: { [APORTE_DE_CONFIG_DE_SUCESOS]: cambios },
  } as GameModule<Record<string, never>>);
}
