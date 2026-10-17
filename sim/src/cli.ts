import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { htmlReport, markdownReport, simulate } from './index';

/**
 * Uso:
 *   npm run sim                              (365 días, 5 semillas, todas las estrategias)
 *   npm run sim -- --dias 120 --semillas 3
 *   npm run sim -- --bots equilibrado,atleta
 *   npm run sim -- --estricto                (sale con error si algún chequeo falla — para CI)
 */

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const days = Number(arg('dias') ?? 365);
const seeds = Number(arg('semillas') ?? 5);
const bots = arg('bots')?.split(',');
const outDir = resolve(arg('salida') ?? join('sim', 'reports', 'ultimo'));
const strict = process.argv.includes('--estricto');

console.log(`\nSimulando ${days} días × ${seeds} semillas por estrategia...\n`);
const out = simulate({ days, seeds, bots, onProgress: (m) => console.log('  ' + m) });

const meta = { days, seeds, date: new Date().toISOString().slice(0, 16).replace('T', ' ') };
const md = markdownReport(out.summary, out.areas, out.checks, meta);
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'informe.md'), md);
writeFileSync(join(outDir, 'informe.html'), htmlReport(out.summary, out.areas, out.checks, meta));
writeFileSync(join(outDir, 'datos.json'), JSON.stringify({ meta, summary: out.summary, checks: out.checks }, null, 1));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');

console.log('\n' + md + '\n');
console.log(`Informe: ${join(outDir, 'informe.html')}\n`);

const fallos = out.checks.filter((c) => c.level === 'fallo');
if (strict && fallos.length) {
  console.error(`❌ ${fallos.length} chequeo(s) fallido(s).`);
  process.exit(1);
}
