/**
 * Publica los deportes como paquetes firmados: `deportes/catalogo.json` y `deportes/<id>/<versión>/paquete.json` dentro de la carpeta que se indique (la web
 * que se publica en GitHub Pages), **los que van dentro del juego y los que no** (como el fútbol: ver `tools/publicar.ts`). La clave privada sale de la variable
 * `DS_CLAVE_PRIVADA` (secreto de GitHub Actions); sin ella no se publica ningún deporte.
 * Uso: `npx tsx tools/publicar-deportes.ts apps/web/dist`.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicarDeportes } from './publicar';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const salida = resolve(process.argv[2] ?? 'apps/web/dist');
const privada = process.env.DS_CLAVE_PRIVADA;
if (!privada) {
  console.log('Sin DS_CLAVE_PRIVADA: no se publica ningún deporte (ver docs/PLAN_DEPORTES_MODULARES.md §3.2).');
  process.exit(0);
}
await publicarDeportes(raiz, salida, privada, console.log);
