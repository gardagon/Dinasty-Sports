import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * GUARDIÁN DE LA ARQUITECTURA.
 * Si alguien (persona o IA) hace que un módulo importe a otro, este test falla.
 * Es lo que impide que el proyecto vuelva a convertirse en una bola de dependencias.
 */

const ROOT = join(__dirname, '..');

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === 'node_modules' ? [] : archivos(p);
    return p.endsWith('.ts') && !p.endsWith('.test.ts') ? [p] : [];
  });
}

function imports(file: string): string[] {
  const src = readFileSync(file, 'utf8');
  return [...src.matchAll(/(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

const reglas: { carpeta: string; permitidos: RegExp; motivo: string }[] = [
  { carpeta: 'packages/contracts/src', permitidos: /^\.\.?\//, motivo: 'contracts no depende de nada' },
  { carpeta: 'packages/core/src', permitidos: /^(\.\.?\/|@ds\/contracts$)/, motivo: 'core solo conoce contracts' },
  { carpeta: 'packages/kit-deporte/src', permitidos: /^(\.\.?\/|@ds\/contracts$)/, motivo: 'el kit de deporte solo conoce contracts' },
  { carpeta: 'packages/retrato/src', permitidos: /^(\.\.?\/|@ds\/contracts$)/, motivo: 'el dibujo de las personas solo conoce contracts' },
  ...readdirSync(join(ROOT, 'modules')).map((m) => ({
    carpeta: `modules/${m}/src`,
    permitidos: /^(\.\.?\/|@ds\/contracts$|@ds\/kit-deporte$)/,
    motivo: 'un módulo solo puede importar @ds/contracts y el kit de deporte (nunca otro módulo ni el núcleo)',
  })),
];

describe('arquitectura', () => {
  it('nadie más que la web y las herramientas importa @ds/retrato (ni los módulos ni el núcleo)', () => {
    const violaciones = ['packages/contracts/src', 'packages/core/src', 'packages/game/src', 'packages/kit-deporte/src', 'packages/paquetes/src', 'sim/src', ...readdirSync(join(ROOT, 'modules')).map((m) => `modules/${m}/src`)]
      .flatMap((c) => archivos(join(ROOT, c)))
      .filter((f) => imports(f).includes('@ds/retrato'))
      .map((f) => relative(ROOT, f));
    expect(violaciones).toEqual([]);
  });
  for (const r of reglas) {
    it(`${r.carpeta}: ${r.motivo}`, () => {
      const violaciones: string[] = [];
      for (const f of archivos(join(ROOT, r.carpeta))) {
        for (const imp of imports(f)) {
          if (!r.permitidos.test(imp)) violaciones.push(`${relative(ROOT, f)} → ${imp}`);
        }
      }
      expect(violaciones).toEqual([]);
    });
  }
});
