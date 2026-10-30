import type { GameModule } from '@ds/contracts';
import { cargarModulo, type Anfitrion } from './cargador';
import { leerPaquete, manifiestoDe, verificarPaquete, type OpcionesDeVerificacion } from './paquete';
import { ErrorDePaquete, type EntradaDeCatalogo, type Manifiesto } from './tipos';
import type { FuenteDeInstalacion } from './fuentes';

/** Dónde se guardan los paquetes instalados para jugar sin conexión (en el navegador, IndexedDB; en los tests, memoria). */
export interface AlmacenDePaquetes {
  /** Texto del paquete de un deporte, o `null`. */
  leer(id: string): Promise<string | null>;
  guardar(id: string, texto: string): Promise<void>;
  borrar(id: string): Promise<void>;
  /** Ids de los deportes instalados. */
  ids(): Promise<string[]>;
}

export function almacenEnMemoria(): AlmacenDePaquetes {
  const guardados = new Map<string, string>();
  return {
    leer: async (id) => guardados.get(id) ?? null,
    guardar: async (id, texto) => void guardados.set(id, texto),
    borrar: async (id) => void guardados.delete(id),
    ids: async () => [...guardados.keys()],
  };
}

export interface DeporteInstalado {
  manifiesto: Manifiesto;
}

/** Compara versiones `1.2.0`: positivo si `a` es más nueva que `b`. */
export function compararVersiones(a: string, b: string): number {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

/**
 * Instala, quita y carga los deportes de un dispositivo. Al instalar comprueba firma, compatibilidad y huellas y guarda el paquete (así se juega sin
 * conexión); al cargar vuelve a comprobarlo y ejecuta su código con las piezas comunes del juego (`anfitrion`).
 */
export class Instalador {
  constructor(
    private readonly almacen: AlmacenDePaquetes,
    private readonly verificacion: OpcionesDeVerificacion,
    private readonly anfitrion: Anfitrion,
  ) {}

  /** Instala (o actualiza) un deporte a partir del texto de su paquete. Devuelve su manifiesto. */
  async instalar(texto: string): Promise<Manifiesto> {
    const { manifiesto } = await verificarPaquete(leerPaquete(texto), this.verificacion);
    const previo = await this.almacen.leer(manifiesto.id);
    if (previo) {
      const v = manifiestoDe(leerPaquete(previo)).version;
      if (compararVersiones(manifiesto.version, v) < 0) throw new ErrorDePaquete(`Ya tienes una versión más nueva de «${manifiesto.nombre}» (${v}).`);
    }
    await this.almacen.guardar(manifiesto.id, texto);
    return manifiesto;
  }

  /** Instala una entrada del catálogo de una fuente. */
  async instalarDe(fuente: FuenteDeInstalacion, entrada: EntradaDeCatalogo): Promise<Manifiesto> {
    return this.instalar(await fuente.paquete(entrada));
  }

  async desinstalar(id: string): Promise<void> {
    await this.almacen.borrar(id);
  }

  /** Los deportes instalados (sin comprobar de nuevo: para listar). Los paquetes ilegibles se saltan. */
  async instalados(): Promise<DeporteInstalado[]> {
    const lista: DeporteInstalado[] = [];
    for (const id of await this.almacen.ids()) {
      try {
        lista.push({ manifiesto: manifiestoDe(leerPaquete((await this.almacen.leer(id)) ?? '')) });
      } catch {
        /* un paquete dañado no se lista */
      }
    }
    return lista;
  }

  /**
   * Los módulos de los deportes instalados, listos para el juego. Un paquete que ya no se puede verificar (otra versión del juego, dañado) no se carga y
   * se avisa en `avisos`.
   */
  async modulos(): Promise<{ modulos: GameModule<any>[]; avisos: string[] }> {
    const modulos: GameModule<any>[] = [];
    const avisos: string[] = [];
    for (const id of await this.almacen.ids()) {
      try {
        const { manifiesto, codigo } = await verificarPaquete(leerPaquete((await this.almacen.leer(id)) ?? ''), this.verificacion);
        modulos.push(cargarModulo(codigo, this.anfitrion, manifiesto.id));
      } catch (e) {
        avisos.push(e instanceof Error ? e.message : String(e));
      }
    }
    return { modulos, avisos };
  }
}
