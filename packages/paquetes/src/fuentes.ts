import { ErrorDePaquete, type EntradaDeCatalogo } from './tipos';

/**
 * De dónde se instalan los deportes. Todas las fuentes tienen la misma forma (dar el catálogo y entregar un paquete): la firma y la compatibilidad se
 * comprueban igual venga de donde venga. Hoy hay dos: una carpeta de la web del juego (GitHub Pages) y un archivo local. Una tienda con licencias sería
 * una tercera (plan de deportes modulares, §3.3).
 */
export interface FuenteDeInstalacion {
  nombre: string;
  catalogo(): Promise<EntradaDeCatalogo[]>;
  /** El texto del paquete de una entrada del catálogo. */
  paquete(entrada: EntradaDeCatalogo): Promise<string>;
}

export type Descargar = (url: string) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

/** Una carpeta de la web del juego: `<base>/catalogo.json` y los paquetes en las rutas que diga el catálogo. */
export function fuenteWeb(base: string, nombre = 'Web del juego', descargar: Descargar = (u) => fetch(u)): FuenteDeInstalacion {
  const url = (ruta: string) => `${base.replace(/\/$/, '')}/${ruta.replace(/^\//, '')}`;
  const leer = async (ruta: string): Promise<string> => {
    let r;
    try {
      r = await descargar(url(ruta));
    } catch {
      throw new ErrorDePaquete('No se pudo conectar con la fuente de deportes. Comprueba la conexión.');
    }
    if (!r.ok) throw new ErrorDePaquete(`La fuente de deportes respondió con un error (${r.status}).`);
    return r.text();
  };
  return {
    nombre,
    async catalogo() {
      let datos: unknown;
      try {
        datos = JSON.parse(await leer('catalogo.json'));
      } catch (e) {
        if (e instanceof ErrorDePaquete) throw e;
        throw new ErrorDePaquete('El catálogo de deportes está mal formado.');
      }
      if (!Array.isArray(datos)) throw new ErrorDePaquete('El catálogo de deportes está mal formado.');
      return datos as EntradaDeCatalogo[];
    },
    paquete: (entrada) => leer(entrada.ruta),
  };
}

/** Un paquete que el jugador ha bajado a mano: una fuente con una sola entrada (su catálogo se saca del propio manifiesto al instalar). */
export function fuenteDeArchivo(texto: string, entrada: EntradaDeCatalogo): FuenteDeInstalacion {
  return { nombre: 'Archivo', catalogo: async () => [entrada], paquete: async () => texto };
}
