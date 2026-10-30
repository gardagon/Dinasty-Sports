/**
 * Publica los deportes como paquetes firmados: `deportes/catalogo.json` y `deportes/<id>/<versión>/paquete.json` dentro de la carpeta que se indique (la web
 * que se publica en GitHub Pages). La clave privada sale de la variable `DS_CLAVE_PRIVADA` (secreto de GitHub Actions); sin ella no se publica ningún deporte.
 * Uso: `npx tsx tools/publicar-deportes.ts apps/web/dist`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODULOS, catalogoDeDeportes } from '@ds/game';
import { empaquetarDeporte, entradaDeCatalogo } from './empaquetar';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const salida = resolve(process.argv[2] ?? 'apps/web/dist');
const privada = process.env.DS_CLAVE_PRIVADA;
if (!privada) {
  console.log('Sin DS_CLAVE_PRIVADA: no se publica ningún deporte (ver docs/PLAN_DEPORTES_MODULARES.md §3.2).');
  process.exit(0);
}
const carpeta = join(salida, 'deportes');
const catalogo = [];
for (const ficha of catalogoDeDeportes(MODULOS)) {
  const paquete = await empaquetarDeporte(raiz, ficha.id, ficha.nombre, privada);
  const entrada = entradaDeCatalogo(paquete, '');
  const ruta = `${ficha.id}/${entrada.version}/paquete.json`;
  mkdirSync(dirname(join(carpeta, ruta)), { recursive: true });
  writeFileSync(join(carpeta, ruta), JSON.stringify(paquete));
  catalogo.push({ ...entrada, ruta });
  console.log(`${ficha.nombre} ${entrada.version}: ${(entrada.bytes / 1024).toFixed(0)} KB → ${ruta}`);
}
writeFileSync(join(carpeta, 'catalogo.json'), JSON.stringify(catalogo));
