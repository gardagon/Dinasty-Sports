/**
 * Resume un perfil de CPU de Node (`node --import tsx --cpu-prof ...` → `*.cpuprofile`): tiempo propio y tiempo con lo que llama («inclusivo») por función, y el de las funciones que se pidan por nombre.
 *
 *   npx tsx tools/perfil-resumen.ts <archivo.cpuprofile> [--top 25] [--bloques nombre1,nombre2,...] [--desde-url fragmento]
 *
 * - Sin `--bloques`, da las `--top` funciones por tiempo propio y por tiempo inclusivo (sin contar dos veces la recursión).
 * - Con `--bloques`, da el inclusivo y las llamadas de cada nombre (suma de todas las funciones con ese nombre), para repartir una pasada entre sus partes.
 * - Solo se cuentan las funciones del proyecto (url con `/modules/`, `/packages/`, `/sim/`, `/tools/`, `/apps/`) en las tablas de «propio»; el resto (motor de JavaScript, GC) va aparte.
 * Es solo una herramienta de medida: no toca el juego.
 */
import { readFileSync } from 'node:fs';

interface Nodo {
  id: number;
  callFrame: { functionName: string; url: string; lineNumber: number };
  children?: number[];
}
interface Perfil {
  nodes: Nodo[];
  samples: number[];
  timeDeltas: number[];
}

const args = process.argv.slice(2);
const archivo = args.find((a) => !a.startsWith('--') && !/^\d+$/.test(a));
if (!archivo) throw new Error('Uso: perfil-resumen.ts <archivo.cpuprofile> [--top N] [--bloques a,b,c]');
const valor = (n: string): string | undefined => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const top = Number(valor('--top') ?? 25);
const bloques = valor('--bloques')?.split(',') ?? [];

const perfil = JSON.parse(readFileSync(archivo, 'utf8')) as Perfil;
const porId = new Map(perfil.nodes.map((n) => [n.id, n]));
// Tiempo propio de cada nodo (µs): la muestra se cuenta con el delta que la sigue.
const propio = new Map<number, number>();
for (let i = 0; i < perfil.samples.length; i++) propio.set(perfil.samples[i], (propio.get(perfil.samples[i]) ?? 0) + (perfil.timeDeltas[i + 1] ?? perfil.timeDeltas[i] ?? 0));
const total = [...propio.values()].reduce((a, b) => a + b, 0);

const nombre = (n: Nodo): string => {
  const { functionName, url, lineNumber } = n.callFrame;
  const f = url.replace(/^.*\/(modules|packages|sim|tools|apps)\//, '$1/').replace(/^file:\/\//, '');
  return `${functionName || '(anónima)'} ${f ? `${f}:${lineNumber + 1}` : ''}`.trim();
};
const del = (n: Nodo): boolean => /\/(modules|packages|sim|tools|apps)\//.test(n.callFrame.url);

const sPropio = new Map<string, number>();
const sIncl = new Map<string, number>();
const llamadas = new Map<string, number>();
const porNombreIncl = new Map<string, number>();
const porNombreLlamadas = new Map<string, number>();

/** Recorre el árbol sin recursión de pila (la profundidad puede ser grande), contando el inclusivo de cada función una sola vez por cadena de llamadas. */
function recorrer(): void {
  const raiz = perfil.nodes[0];
  const inclusivoDe = new Map<number, number>();
  // Orden posterior: hijos antes que padres.
  const orden: number[] = [];
  const pila: number[] = [raiz.id];
  while (pila.length) {
    const id = pila.pop()!;
    orden.push(id);
    for (const h of porId.get(id)!.children ?? []) pila.push(h);
  }
  for (let i = orden.length - 1; i >= 0; i--) {
    const n = porId.get(orden[i])!;
    inclusivoDe.set(n.id, (propio.get(n.id) ?? 0) + (n.children ?? []).reduce((t, h) => t + (inclusivoDe.get(h) ?? 0), 0));
  }
  // Inclusivo por función sin doble cuenta: se baja por el árbol llevando las funciones ya abiertas en la cadena.
  const marcha: { id: number; abiertas: Set<string> }[] = [{ id: raiz.id, abiertas: new Set() }];
  while (marcha.length) {
    const { id, abiertas } = marcha.pop()!;
    const n = porId.get(id)!;
    const clave = nombre(n);
    const solo = n.callFrame.functionName || '(anónima)';
    const sigue = new Set(abiertas);
    if (!abiertas.has(clave)) {
      sIncl.set(clave, (sIncl.get(clave) ?? 0) + (inclusivoDe.get(id) ?? 0));
      sigue.add(clave);
    }
    if (!abiertas.has(`n:${solo}`)) {
      porNombreIncl.set(solo, (porNombreIncl.get(solo) ?? 0) + (inclusivoDe.get(id) ?? 0));
      sigue.add(`n:${solo}`);
    }
    porNombreLlamadas.set(solo, (porNombreLlamadas.get(solo) ?? 0) + 1);
    sPropio.set(clave, (sPropio.get(clave) ?? 0) + (propio.get(id) ?? 0));
    llamadas.set(clave, (llamadas.get(clave) ?? 0) + 1);
    for (const h of n.children ?? []) marcha.push({ id: h, abiertas: sigue });
  }
}
recorrer();

const ms = (us: number): string => (us / 1000).toFixed(0).padStart(8);
const pc = (us: number): string => ((100 * us) / total).toFixed(1).padStart(5);
console.log(`Perfil ${archivo}: ${(total / 1e6).toFixed(2)} s de muestras`);
if (bloques.length) {
  console.log('\nBloques pedidos (tiempo inclusivo en ms; % del total):');
  for (const b of bloques) console.log(`  ${b.padEnd(34)} ${ms(porNombreIncl.get(b) ?? 0)} ms ${pc(porNombreIncl.get(b) ?? 0)} %   nodos ${porNombreLlamadas.get(b) ?? 0}`);
} else {
  console.log(`\nTop ${top} por tiempo propio:`);
  for (const [k, v] of [...sPropio].sort((a, b) => b[1] - a[1]).slice(0, top)) console.log(`  ${ms(v)} ms ${pc(v)} %  ${k}`);
  console.log(`\nTop ${top} por tiempo inclusivo (solo funciones del proyecto):`);
  for (const [k, v] of [...sIncl].filter(([k]) => /(modules|packages|sim|tools|apps)\//.test(k)).sort((a, b) => b[1] - a[1]).slice(0, top)) console.log(`  ${ms(v)} ms ${pc(v)} %  ${k}`);
}
const motor = [...sPropio].filter(([k]) => !/(modules|packages|sim|tools|apps)\//.test(k)).reduce((t, [, v]) => t + v, 0);
console.log(`\nFuera del proyecto (motor de JavaScript, recolector, node): ${ms(motor)} ms ${pc(motor)} %`);
void del;
void llamadas;
