/**
 * Convierte la salida de `npm run rendimiento:web -- ... --json` (lo que se guardó en un archivo) en tablas en Markdown: mediana (mínimo–máximo) entre pasadas por ciudad y perfil.
 *   npx tsx tools/rendimiento-web-tabla.ts <salida.txt>
 */
import { readFileSync } from 'node:fs';

const archivo = process.argv[2];
if (!archivo) throw new Error('Uso: rendimiento-web-tabla.ts <salida.txt>');
const linea = readFileSync(archivo, 'utf8').split('\n').find((l) => l.startsWith('JSON '));
if (!linea) throw new Error('No hay línea JSON en el archivo (¿se pasó --json?)');
const datos = JSON.parse(linea.slice(5)) as Record<string, Record<string, number | number[]>>;
const mediana = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const fmt = (xs: number[], d: number): string => (xs.length === 1 ? xs[0].toFixed(d) : `${mediana(xs).toFixed(d)} (${Math.min(...xs).toFixed(d)}–${Math.max(...xs).toFixed(d)})`);
const grupos = new Map<string, Record<string, number | number[]>[]>();
for (const [k, v] of Object.entries(datos)) {
  const [ciudad, perfil] = k.split('|');
  const g = `${ciudad}|${perfil}`;
  grupos.set(g, [...(grupos.get(g) ?? []), v]);
}
const filas: [string, string, (r: Record<string, number | number[]>) => number, number][] = [
  ['Crear (s)', 'crearS', (r) => r.crearS as number, 1],
  ['Cruzar de día: motor (ms)', 'diaMotorMs', (r) => r.diaMotorMs as number, 1],
  ['Cruzar de día: total con repintado (ms)', 'diaTotalMs', (r) => r.diaTotalMs as number, 0],
  ['Cruzar de semana: motor, mediana de 6 (ms)', 'semanaMotorMedianaMs', (r) => r.semanaMotorMedianaMs as number, 0],
  ['Cruzar de semana: total con repintado, mediana de 6 (ms)', 'semanaTotalMedianaMs', (r) => r.semanaTotalMedianaMs as number, 0],
  ['Cruzar de semana: total, la peor de 6 (ms)', 'semanaTotalMaxMs', (r) => r.semanaTotalMaxMs as number, 0],
  ['Acción (clic → repintado): mediana (ms)', 'accionMedianaMs', (r) => r.accionMedianaMs as number, 1],
  ['Acción: p90 (ms)', 'accionP90Ms', (r) => r.accionP90Ms as number, 1],
  ['Acción: máximo (ms)', 'accionMaxMs', (r) => r.accionMaxMs as number, 0],
  ['Guardar: a texto en la página (ms)', 'guardarTextoMs', (r) => r.guardarTextoMs as number, 0],
  ['Guardar: IndexedDB (ms)', 'guardarIdbMs', (r) => r.guardarIdbMs as number, 0],
  ['Guardar de verdad (por trozos): total (ms)', 'guardarTrozosTotalMs', (r) => r.guardarTrozosTotalMs as number, 0],
  ['Guardar de verdad: lo más que se para la página (ms)', 'guardarTrozosLargaMs', (r) => r.guardarTrozosLargaMs as number, 0],
  ['Abrir de nuevo (ms)', 'abrirMs', (r) => r.abrirMs as number, 0],
  ['Estado (KB)', 'estadoKB', (r) => r.estadoKB as number, 0],
];
for (const ciudad of ['grande', 'prueba']) {
  const perfiles = [...grupos.keys()].filter((g) => g.startsWith(`${ciudad}|`)).map((g) => g.split('|')[1]);
  if (!perfiles.length) continue;
  console.log(`\n### Ciudad ${ciudad} (${grupos.get(`${ciudad}|${perfiles[0]}`)!.length} pasadas)\n`);
  console.log(`| | ${perfiles.join(' | ')} |\n|---|${perfiles.map(() => '---').join('|')}|`);
  for (const [nombre, , f, d] of filas) console.log(`| ${nombre} | ${perfiles.map((p) => fmt(grupos.get(`${ciudad}|${p}`)!.map(f), d)).join(' | ')} |`);
}
