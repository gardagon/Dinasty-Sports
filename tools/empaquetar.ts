import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { build, type Plugin } from 'esbuild';
import { INTERFAZ_DE_DEPORTES } from '@ds/contracts';
import * as contracts from '@ds/contracts';
import * as kit from '@ds/kit-deporte';
import { crearPaquete, type EntradaDeCatalogo, type PaqueteDeDeporte } from '@ds/paquetes';

/**
 * Empaqueta un deporte: compila su módulo aparte SIN su copia de `@ds/contracts` ni del kit (las toma del juego instalado, que se las presta como
 * `__ds`), y lo firma. Lo usan `tools/publicar-deportes.ts` (publicación) y los tests.
 */

/** Las piezas comunes que un deporte empaquetado importa del juego, con sus nombres exportados (para generar el puente). */
const COMUNES: Record<string, object> = { '@ds/contracts': contracts, '@ds/kit-deporte': kit };

const esIdentificador = (s: string) => /^[A-Za-z_$][\w$]*$/.test(s) && s !== 'default';

/** Cambia cada import de una pieza común por una lectura del objeto `__ds` que presta el juego. */
const puenteConElJuego: Plugin = {
  name: 'puente-con-el-juego',
  setup(b) {
    b.onResolve({ filter: /^@ds\/(contracts|kit-deporte)$/ }, (a) => ({ path: a.path, namespace: 'juego' }));
    b.onLoad({ filter: /.*/, namespace: 'juego' }, (a) => {
      const nombres = Object.keys(COMUNES[a.path]).filter(esIdentificador);
      const lineas = nombres.map((n) => `export const ${n} = __h.${n};`);
      return { contents: `const __h = __ds[${JSON.stringify(a.path)}];\n${lineas.join('\n')}`, loader: 'js' };
    });
  },
};

/** El código de un deporte, compilado aparte: un cuerpo de función que recibe `__ds` y devuelve el módulo. */
export async function compilarDeporte(raiz: string, id: string, archivo = join(raiz, 'modules', id, 'src', 'index.ts')): Promise<string> {
  const entrada = archivo;
  const salida = await build({
    stdin: { contents: `export { ${id} } from ${JSON.stringify(entrada)};`, resolveDir: raiz, loader: 'ts' },
    bundle: true,
    write: false,
    format: 'iife',
    globalName: '__modulo',
    target: 'es2022',
    minify: true,
    legalComments: 'none',
    plugins: [puenteConElJuego],
    logLevel: 'silent',
  });
  return `${salida.outputFiles[0].text}\nreturn __modulo.${id};`;
}

/** Empaqueta y firma un deporte del repositorio (`modules/<id>`, o el archivo que se indique en `origen`, p. ej. los deportes de prueba de los tests). */
export async function empaquetarDeporte(raiz: string, id: string, nombre: string, privada: string, paises = ['espana'], origen: { archivo?: string; version?: string } = {}): Promise<PaqueteDeDeporte> {
  const version = origen.version ?? (JSON.parse(readFileSync(join(raiz, 'modules', id, 'package.json'), 'utf8')) as { version: string }).version;
  const codigo = await compilarDeporte(raiz, id, origen.archivo);
  return crearPaquete({ id, nombre, version, interfaz: INTERFAZ_DE_DEPORTES, paises, archivos: { 'codigo.js': codigo }, codigo: 'codigo.js' }, privada);
}

export const entradaDeCatalogo = (paquete: PaqueteDeDeporte, ruta: string): EntradaDeCatalogo => {
  const m = JSON.parse(paquete.manifiesto) as { id: string; nombre: string; version: string; interfaz: number; paises: string[] };
  return { id: m.id, nombre: m.nombre, version: m.version, interfaz: m.interfaz, paises: m.paises, bytes: JSON.stringify(paquete).length, ruta };
};
