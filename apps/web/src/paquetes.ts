import { importarPais, listarPaises, type PaisDef } from '@ds/contracts';

/**
 * Paquetes de país importados por el jugador (archivos JSON): se guardan en el navegador (localStorage) y se vuelven a registrar al arrancar,
 * para que se puedan elegir al crear una partida y cargar las partidas de ese país. Los que vienen de serie (España, Argentina, Inglaterra) no se guardan.
 */

const CLAVE = 'ds.paquetes_de_pais';

/** Lo mínimo que se usa de `localStorage` (para probarlo sin navegador). */
export interface Almacenillo {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
}

const navegador = (): Almacenillo | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

/** Los textos de los paquetes guardados (id → JSON). */
function leer(a: Almacenillo | null): Record<string, string> {
  try {
    const x = JSON.parse(a?.getItem(CLAVE) ?? '{}');
    return x && typeof x === 'object' && !Array.isArray(x) ? x : {};
  } catch {
    return {};
  }
}

/** Registra los paquetes guardados (al arrancar). Devuelve los avisos de los que ya no valen. */
export function cargarPaquetesGuardados(a: Almacenillo | null = navegador()): string[] {
  const avisos: string[] = [];
  for (const [id, texto] of Object.entries(leer(a))) {
    try {
      importarPais(texto);
    } catch (e) {
      avisos.push(`El paquete de país «${id}» guardado ya no es válido: ${e instanceof Error ? e.message.split('\n')[1] ?? e.message : 'error'}`);
    }
  }
  return avisos;
}

/** Importa un paquete de país de un texto JSON: lo valida, lo registra y lo guarda. Lanza un error en español si no vale. */
export function importarPaquete(texto: string, a: Almacenillo | null = navegador()): PaisDef {
  const pais = importarPais(texto);
  const guardados = leer(a);
  guardados[pais.id] = texto;
  try {
    a?.setItem(CLAVE, JSON.stringify(guardados));
  } catch {
    // Sin dónde guardar: vale en esta sesión.
  }
  return pais;
}

/** Los paquetes que ha importado el jugador (ids). */
export const idsImportados = (a: Almacenillo | null = navegador()): string[] => Object.keys(leer(a));

/** Los países que se pueden elegir (de serie e importados), con su nombre. */
export const paisesElegibles = (): readonly { id: string; nombre: string }[] => listarPaises().map((p) => ({ id: p.id, nombre: p.nombre }));
