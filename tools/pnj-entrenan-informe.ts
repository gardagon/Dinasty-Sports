/**
 * Resume los resultados de `tools/analisis-profesionales.ts` para `docs/relevo/pnj-entrenan-y-abandono.md` (solo lectura): nivel por edad, fracción del tope, profesionales por curso y adónde va quien deja de jugar.
 *
 *   npx tsx tools/pnj-entrenan-informe.ts <etiqueta=a.json,b.json>...
 */
import { readFileSync } from 'node:fs';

interface Fila { k: number; edad: number; juega: boolean; valor?: number; habF?: number[]; capPob?: number[]; dejado?: boolean; apartado?: boolean; rol?: string; tamano?: string }
interface Nino { id: string; interes: number; filas: Fila[] }
type Datos = Record<string, { ninos: Nino[] }>;

const versiones = process.argv.slice(2).map((a) => {
  const [et, archivos] = a.split('=');
  const datos: Datos = {};
  for (const f of archivos.split(',')) Object.assign(datos, JSON.parse(readFileSync(f, 'utf8')));
  return { et, datos };
});
const mean = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : NaN);
const pct = (x: number[], p: number) => { const s = [...x].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
const f1 = (x: number) => (Number.isNaN(x) ? '–' : x.toFixed(1));
const pc = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)} %` : '–');
const w = (s = '') => console.log(s);
const K = 10;

for (const { et, datos } of versiones) {
  const S = Object.keys(datos).length;
  const ninos = Object.values(datos).flatMap((d) => d.ninos);
  const en = (n: Nino, k: number) => n.filas.find((f) => f.k === k);
  w(`\n## Versión «${et}» (${S} semillas)\n`);
  w('### Nivel y fracción del tope por edad (los que juegan)\n');
  w('| edad | juegan/semilla | nivel medio | p90 | máx | habilidades % tope | capacidades % tope | mejor / 3.º / 10.º (media por semilla) |');
  w('|---|---|---|---|---|---|---|---|');
  for (let k = 0; k <= K; k++) {
    const jug = ninos.map((n) => en(n, k)).filter((f): f is Fila => !!f && f.juega);
    const v = jug.map((f) => f.valor!);
    const porS = Object.values(datos).map((d) => d.ninos.map((n) => en(n, k)).filter((f): f is Fila => !!f && f.juega).map((f) => f.valor!).sort((a, b) => b - a));
    const nth = (i: number) => mean(porS.map((s) => s[i] ?? NaN));
    w(`| ${8 + k} | ${(jug.length / S).toFixed(0)} | ${f1(mean(v))} | ${f1(pct(v, 0.9))} | ${f1(Math.max(...v))} | ${f1(100 * mean(jug.map((f) => mean(f.habF!))))} | ${f1(100 * mean(jug.map((f) => mean(f.capPob!))))} | ${f1(nth(0))} / ${f1(nth(2))} / ${f1(nth(9))} |`);
  }
  // A los 17–18: el último año jugando (k ≥ 9).
  const ultimo = (n: Nino) => [...n.filas].reverse().find((f) => f.k >= K - 1 && f.juega);
  const finales = Object.entries(datos).map(([s, d]) => ({ s, f: d.ninos.map(ultimo).filter((f): f is Fila => !!f) }));
  const cuenta = (u: number) => finales.map((x) => x.f.filter((f) => f.valor! >= u).length);
  w(`\n**A los 17–18 (último año jugando):** juegan ${(finales.reduce((t, x) => t + x.f.length, 0) / S).toFixed(0)} por semilla. Nivel ≥ 45 (profesional) por curso: ${(cuenta(45).reduce((a, b) => a + b, 0) / S).toFixed(2)} (por semilla: ${cuenta(45).join('/')}); ≥ 40 (élite): ${(cuenta(40).reduce((a, b) => a + b, 0) / S).toFixed(2)} (${cuenta(40).join('/')}); ≥ 50: ${(cuenta(50).reduce((a, b) => a + b, 0) / S).toFixed(2)}. Cursos ≥ 40: ${f1(mean(finales.map((x) => x.f.length ? 100 * x.f.filter((f) => f.valor! >= 40).length / x.f.length : NaN)))} % de los que juegan.`);
  w(`Los 10 mejores de cada semilla: nivel medio ${f1(mean(finales.flatMap((x) => x.f.map((f) => f.valor!).sort((a, b) => b - a).slice(0, 10))))}.`);
  // Embudo.
  const interesados = ninos.filter((n) => n.interes > 0).length;
  const jug = (k: number) => ninos.filter((n) => en(n, k)?.juega).length;
  w(`\n**Embudo:** de ${(interesados / S).toFixed(0)} interesados, juegan a los 8: ${(jug(0) / S).toFixed(0)}, 14: ${(jug(6) / S).toFixed(0)}, 16: ${(jug(8) / S).toFixed(0)}, 17: ${(jug(9) / S).toFixed(0)}, 18: ${(jug(10) / S).toFixed(0)}.`);
  const mejores14 = Object.values(datos).flatMap((d) => d.ninos.map((n) => ({ n, a: en(n, 6) })).filter((x) => x.a?.juega).sort((x, y) => y.a!.valor! - x.a!.valor!).slice(0, 10).map((x) => x.n));
  const destino = (n: Nino): string => { const b = en(n, K); if (!b) return 'sale del mundo'; if (b.juega) return 'sigue'; return b.dejado ? 'lo deja' : 'sin equipo'; };
  const dest = new Map<string, number>();
  for (const n of mejores14) dest.set(destino(n), (dest.get(destino(n)) ?? 0) + 1);
  w(`**Los 10 mejores de cada semilla a los 14 (${mejores14.length}), a los 18:** ${[...dest].map(([a, b]) => `${a} ${b}`).join(', ')}. De los que juegan a los 17: dejan antes de los 18 ${pc(ninos.filter((n) => en(n, 9)?.juega && !en(n, 10)?.juega).length, jug(9))}.`);
  w('\n### Adónde va quien juega un año y al siguiente no (por semilla, media)\n');
  w('| edad (año k → k+1) | juegan en k | siguen | sale del mundo | lo deja (abandono) | sin equipo (no dejado) |');
  w('|---|---|---|---|---|---|');
  for (let k = 0; k < K; k++) {
    const base = ninos.filter((n) => en(n, k)?.juega);
    const sig = base.filter((n) => en(n, k + 1)?.juega).length;
    const fuera = base.filter((n) => !en(n, k + 1)).length;
    const deja = base.filter((n) => { const b = en(n, k + 1); return b && !b.juega && b.dejado; }).length;
    const sin = base.length - sig - fuera - deja;
    w(`| ${8 + k} → ${9 + k} | ${(base.length / S).toFixed(0)} | ${pc(sig, base.length)} | ${pc(fuera, base.length)} | ${pc(deja, base.length)} | ${pc(sin, base.length)} |`);
  }
  const desaparecen = ninos.filter((n) => !en(n, K) && en(n, K - 1));
  const roles = new Map<string, number>();
  for (const n of desaparecen) roles.set(en(n, K - 1)!.rol ?? '?', (roles.get(en(n, K - 1)!.rol ?? '?') ?? 0) + 1);
  w(`\nDesaparecen del mundo entre los 17 y los 18: ${(desaparecen.length / S).toFixed(0)} por semilla (${pc(desaparecen.length, ninos.filter((n) => en(n, K - 1)).length)} de la cohorte presente); por papel: ${[...roles].map(([a, b]) => `${a} ${(b / S).toFixed(0)}`).join(', ')}.`);
}
