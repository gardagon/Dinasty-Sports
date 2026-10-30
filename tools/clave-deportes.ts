/**
 * Genera el par de claves con el que se firman los deportes. La PÚBLICA se escribe en `packages/game/src/clave-publica.ts` (va en el repositorio y el juego la usa para
 * comprobar los paquetes); la PRIVADA se imprime una sola vez: guárdala como secreto de GitHub Actions con el nombre `DS_CLAVE_PRIVADA` y no la subas a ningún sitio.
 * Si cambias de clave, los paquetes ya publicados dejan de valer: hay que volver a publicarlos.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generarClaves } from '@ds/paquetes';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { publica, privada } = await generarClaves();
writeFileSync(
  join(raiz, 'packages/game/src/clave-publica.ts'),
  `/** Clave pública (ECDSA P-256, SPKI en base64) con la que se comprueban los deportes oficiales. La genera \`npm run clave-deportes\`. */\nexport const CLAVE_PUBLICA_DE_DEPORTES: string | null = ${JSON.stringify(publica)};\n`,
);
console.log('Clave pública escrita en packages/game/src/clave-publica.ts.');
console.log('\nCLAVE PRIVADA (guárdala como secreto DS_CLAVE_PRIVADA en GitHub: Settings → Secrets and variables → Actions):\n');
console.log(privada);
