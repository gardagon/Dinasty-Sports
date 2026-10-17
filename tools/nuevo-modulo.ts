import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Crea un módulo nuevo listo para trabajar y lo registra en el juego.
 *
 *   npm run nuevo-modulo -- natacion "Natación"
 *
 * Después: `npm install` (enlaza el paquete) y `npm test`.
 */

const [id, nombreArg] = process.argv.slice(2);
if (!id || !/^[a-z][a-z0-9_]*$/.test(id)) {
  console.error('Uso: npm run nuevo-modulo -- <id> "<Nombre visible>"   (id: minúsculas, números y _)');
  process.exit(1);
}
const nombre = nombreArg ?? id[0].toUpperCase() + id.slice(1);
const pkg = `@ds/mod-${id.replace(/_/g, '-')}`;
const camel = id.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const root = join(import.meta.dirname, '..');
const dir = join(root, 'modules', id);

if (existsSync(dir)) {
  console.error(`Ya existe modules/${id}`);
  process.exit(1);
}

mkdirSync(join(dir, 'src'), { recursive: true });

writeFileSync(
  join(dir, 'package.json'),
  JSON.stringify(
    {
      name: pkg,
      version: '0.1.0',
      private: true,
      type: 'module',
      description: `Módulo ${nombre}.`,
      exports: { '.': './src/index.ts' },
      dependencies: { '@ds/contracts': '*' },
      devDependencies: { '@ds/core': '*', '@ds/mod-personaje': '*' },
    },
    null,
    2,
  ) + '\n',
);

writeFileSync(
  join(dir, 'src', 'index.ts'),
  `import { GEN, TAGS, defineModule } from '@ds/contracts';

/**
 * MÓDULO ${nombre.toUpperCase()} (id \`${id}\`).
 * Regla de oro: solo se importa @ds/contracts. Para hablar con otros módulos usa
 * etiquetas, modificadores, eventos compartidos o servicios (ver docs/ARQUITECTURA.md).
 */

export interface ${camel[0].toUpperCase() + camel.slice(1)}State {
  // Estado propio del módulo (JSON serializable).
}

export const ${camel} = defineModule<${camel[0].toUpperCase() + camel.slice(1)}State>({
  id: '${id}',
  name: '${nombre}',
  dependsOn: ['gen'],
  stats: [
    {
      id: '${id}.ejemplo',
      name: 'Habilidad de ejemplo',
      group: '${nombre}',
      category: 'habilidad',
      initial: { min: 5, max: 15 },
      growth: { rate: 0.5, speedFrom: [{ stat: GEN.coordinacion, weight: 0.5 }], cap: { base: 0.6, from: [{ stat: GEN.coordinacion, weight: 0.3 }] } },
      decay: { graceDays: 5, ratePerDay: 0.01, floorRatio: 0.7 },
    },
  ],
  initState: () => ({}),
  actions: [
    {
      id: '${id}.practicar',
      name: 'Practicar',
      tags: [TAGS.fisico, TAGS.entrenamiento, '${id}'],
      duration: 60,
      delta: { [GEN.energia]: -15 },
      train: [{ stat: '${id}.ejemplo', amount: 3 }],
    },
  ],
});

export default ${camel};
`,
);

writeFileSync(
  join(dir, 'src', 'index.test.ts'),
  `import { describe, expect, it } from 'vitest';
import { Game } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { ${camel} } from './index';

describe('módulo ${id}', () => {
  it('funciona solo con el módulo base', () => {
    const g = Game.create([personaje, ${camel}], { seed: 1 });
    const antes = g.stat('${id}.ejemplo');
    expect(g.perform('${id}.practicar').ok).toBe(true);
    expect(g.stat('${id}.ejemplo')).toBeGreaterThan(antes);
  });
});
`,
);

// Registrar en el ensamblador
const modulosPath = join(root, 'packages', 'game', 'src', 'modulos.ts');
let modulos = readFileSync(modulosPath, 'utf8');
modulos = modulos
  .replace('// <nuevo-modulo:import>', `import { ${camel} } from '${pkg}';\n// <nuevo-modulo:import>`)
  .replace('  // <nuevo-modulo:lista>', `  ${camel},\n  // <nuevo-modulo:lista>`);
writeFileSync(modulosPath, modulos);

const gamePkgPath = join(root, 'packages', 'game', 'package.json');
const gamePkg = JSON.parse(readFileSync(gamePkgPath, 'utf8'));
gamePkg.dependencies[pkg] = '*';
writeFileSync(gamePkgPath, JSON.stringify(gamePkg, null, 2) + '\n');

console.log(`✅ Módulo "${nombre}" creado en modules/${id} y registrado en packages/game/src/modulos.ts`);
console.log('   Siguiente: npm install && npm test');
