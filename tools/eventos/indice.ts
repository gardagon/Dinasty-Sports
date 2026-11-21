import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

export const RAIZ_DE_EVENTOS = join(import.meta.dirname, '..', '..', 'modules', 'eventos', 'src');

/** Los archivos de eventos del módulo `eventos`: todos los `.ts` de sus carpetas de área (y `contadores.ts`), salvo tests y ayudas (`_*.ts`). */
export function archivosDeEventos(raiz = RAIZ_DE_EVENTOS): string[] {
  const dentro = (dir: string): string[] =>
    readdirSync(dir).sort().flatMap((f) => {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) return dentro(p);
      return f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.startsWith('_') ? [p] : [];
    });
  return dentro(raiz).map((p) => relative(raiz, p).replace(/\\/g, '/').replace(/\.ts$/, '')).filter((f) => f !== 'index' && f !== 'catalogo');
}

/** El texto de `catalogo.ts`: un import por archivo y la lista de todos. */
export function textoDelIndice(archivos: readonly string[] = archivosDeEventos()): string {
  const nombre = (f: string) => f.replace(/[^a-zA-Z0-9]/g, '_');
  return [
    '// GENERADO por `npm run eventos:indice` (y por `eventos:nuevo`): no lo edites a mano. Junta los archivos de cada área.',
    "import type { AporteDeSucesos } from '@ds/contracts';",
    ...archivos.map((f) => `import ${nombre(f)} from './${f}';`),
    '',
    `export const CATALOGO: readonly AporteDeSucesos[] = [${archivos.map(nombre).join(', ')}].flat();`,
    '',
  ].join('\n');
}

export const indiceAlDia = (): boolean => readFileSync(join(RAIZ_DE_EVENTOS, 'catalogo.ts'), 'utf8') === textoDelIndice();
export const escribirIndice = (): void => writeFileSync(join(RAIZ_DE_EVENTOS, 'catalogo.ts'), textoDelIndice());
