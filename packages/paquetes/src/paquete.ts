import { firmaValida, firmar, exigirClave, sha256 } from './firma';
import { ErrorDePaquete, type ArchivoDelPaquete, type Manifiesto, type PaqueteDeDeporte } from './tipos';

export const FORMATO_DE_PAQUETE = 'dinasty-sports-deporte' as const;

export interface EntradaParaCrear {
  id: string;
  nombre: string;
  version: string;
  interfaz: number;
  paises: string[];
  /** Contenido de cada archivo por ruta; `codigo` dice cuál es el del módulo. */
  archivos: Record<string, string>;
  codigo: string;
}

/** Crea y firma un paquete (lo hace la herramienta de publicación, con la clave privada que no está en el repositorio). */
export async function crearPaquete(entrada: EntradaParaCrear, privadaBase64: string): Promise<PaqueteDeDeporte> {
  if (!(entrada.codigo in entrada.archivos)) throw new ErrorDePaquete(`El archivo de código «${entrada.codigo}» no está en el paquete.`);
  const archivos: ArchivoDelPaquete[] = [];
  for (const ruta of Object.keys(entrada.archivos).sort()) {
    const contenido = entrada.archivos[ruta];
    archivos.push({ ruta, sha256: await sha256(contenido), bytes: new TextEncoder().encode(contenido).length });
  }
  const manifiesto: Manifiesto = { id: entrada.id, nombre: entrada.nombre, version: entrada.version, interfaz: entrada.interfaz, paises: entrada.paises, codigo: entrada.codigo, archivos };
  const texto = JSON.stringify(manifiesto);
  return { formato: FORMATO_DE_PAQUETE, manifiesto: texto, firma: await firmar(texto, privadaBase64), archivos: entrada.archivos };
}

/** Lee el texto de un paquete (de la red, de un archivo o de la caché). Lanza un error con el motivo si no lo es. */
export function leerPaquete(texto: string): PaqueteDeDeporte {
  let o: unknown;
  try {
    o = JSON.parse(texto);
  } catch {
    throw new ErrorDePaquete('Este archivo no es un paquete de deporte (no es JSON).');
  }
  const p = o as Partial<PaqueteDeDeporte> | null;
  if (!p || p.formato !== FORMATO_DE_PAQUETE || typeof p.manifiesto !== 'string' || typeof p.firma !== 'string' || !p.archivos || typeof p.archivos !== 'object') {
    throw new ErrorDePaquete('Este archivo no es un paquete de deporte de Dinasty Sports.');
  }
  return p as PaqueteDeDeporte;
}

/** El manifiesto de un paquete, ya leído (sin comprobar nada: úsalo para listar, no para fiarte). */
export function manifiestoDe(paquete: PaqueteDeDeporte): Manifiesto {
  try {
    const m = JSON.parse(paquete.manifiesto) as Manifiesto;
    if (typeof m.id !== 'string' || typeof m.version !== 'string' || typeof m.interfaz !== 'number' || typeof m.codigo !== 'string' || !Array.isArray(m.archivos)) throw new Error();
    return m;
  } catch {
    throw new ErrorDePaquete('El manifiesto del paquete está mal formado.');
  }
}

export interface OpcionesDeVerificacion {
  /** Clave pública (SPKI en base64) con la que se firman los deportes oficiales. */
  clavePublica: string | null | undefined;
  /** Versión de la interfaz pública de los deportes que tiene este juego. */
  interfaz: number;
}

/** Comprueba firma, compatibilidad y huellas. Si todo va bien devuelve el manifiesto y el código; si no, lanza un error que dice qué falla. */
export async function verificarPaquete(paquete: PaqueteDeDeporte, opciones: OpcionesDeVerificacion): Promise<{ manifiesto: Manifiesto; codigo: string }> {
  const clave = exigirClave(opciones.clavePublica);
  if (!(await firmaValida(paquete.manifiesto, paquete.firma, clave))) {
    throw new ErrorDePaquete('La firma de este deporte no es válida: no es oficial o se ha modificado. No se instala.');
  }
  const manifiesto = manifiestoDe(paquete);
  if (manifiesto.interfaz !== opciones.interfaz) {
    throw new ErrorDePaquete(
      `«${manifiesto.nombre}» es para la versión ${manifiesto.interfaz} de la interfaz de deportes y este juego es de la ${opciones.interfaz}: ${manifiesto.interfaz > opciones.interfaz ? 'actualiza el juego' : 'actualiza el deporte'}.`,
    );
  }
  for (const a of manifiesto.archivos) {
    const contenido = paquete.archivos[a.ruta];
    if (contenido === undefined) throw new ErrorDePaquete(`Falta el archivo «${a.ruta}» del paquete.`);
    if ((await sha256(contenido)) !== a.sha256) throw new ErrorDePaquete(`El archivo «${a.ruta}» no es el que se firmó: el paquete está dañado o modificado.`);
  }
  const codigo = paquete.archivos[manifiesto.codigo];
  if (codigo === undefined || !manifiesto.archivos.some((a) => a.ruta === manifiesto.codigo)) throw new ErrorDePaquete('El paquete no incluye su código.');
  return { manifiesto, codigo };
}
