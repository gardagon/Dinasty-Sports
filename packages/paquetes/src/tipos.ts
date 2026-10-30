/**
 * Un paquete de deporte (plan de deportes modulares, §3): el módulo del deporte compilado aparte, con un manifiesto y una firma. Todo es texto, así que
 * un paquete es un único archivo JSON que se puede descargar de una web, guardar en el navegador o instalar a mano.
 */

/** Un archivo del paquete y su huella (SHA-256 en hexadecimal). El código y los datos van en `archivos`; el manifiesto los nombra a todos. */
export interface ArchivoDelPaquete {
  ruta: string;
  sha256: string;
  bytes: number;
}

export interface Manifiesto {
  /** Id del deporte (el de su módulo y su ficha). */
  id: string;
  nombre: string;
  /** Versión del paquete (`1.2.0`). */
  version: string;
  /** Versión de la interfaz pública de los deportes (el vocabulario común y el kit) para la que está hecho; el juego rechaza otra. */
  interfaz: number;
  /** Países de los que trae datos propios (España siempre). */
  paises: string[];
  /** Archivo con el código del módulo (una ruta de `archivos`). */
  codigo: string;
  archivos: ArchivoDelPaquete[];
}

/** Lo que se descarga o se guarda: el texto exacto del manifiesto (es lo que se firma), su firma y el contenido de cada archivo. */
export interface PaqueteDeDeporte {
  formato: 'dinasty-sports-deporte';
  /** Texto JSON del manifiesto, tal cual se firmó. */
  manifiesto: string;
  /** Firma ECDSA P-256 / SHA-256 del texto del manifiesto, en base64. */
  firma: string;
  /** Contenido de cada archivo por ruta. */
  archivos: Record<string, string>;
}

/** Una línea del catálogo de una fuente: lo justo para listar un deporte y decidir si se puede instalar sin descargarlo. */
export interface EntradaDeCatalogo {
  id: string;
  nombre: string;
  version: string;
  interfaz: number;
  paises: string[];
  /** Tamaño aproximado de la descarga, en bytes. */
  bytes: number;
  /** Dónde está el paquete (relativo a la fuente). */
  ruta: string;
}

/** Un fallo de instalación o de carga, con el motivo en español para enseñárselo al jugador. */
export class ErrorDePaquete extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorDePaquete';
  }
}
