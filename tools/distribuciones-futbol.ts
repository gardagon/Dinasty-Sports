/**
 * Distribución de los niveles de fútbol de la ciudad grande por edad y por equipo (A–D), al crear la partida y tras 1 y 2 cursos, para varias semillas: sirve para comparar una
 * versión del cálculo de la historia y de la pasada semanal con otra (la diferencia debe ser del orden del ruido entre semillas). `npx tsx tools/distribuciones-futbol.ts <salida.json> [semillas]`
 * y `npx tsx tools/distribuciones-futbol.ts --comparar antes.json despues.json`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { PAIS_CIUDAD_GRANDE, registrarPais } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';

type Resumen = { n: number; media: number; p10: number; p50: number; p90: number };
type Foto = { porEdad: Record<string, Resumen>; porLetra: Record<string, Resumen>; porEdadYLetra: Record<string, Resumen>; };
const pct = (xs: number[], p: number): number => xs[Math.min(xs.length - 1, Math.floor(p * xs.length))];
const resumen = (xs: number[]): Resumen => {
  const s = [...xs].sort((a, b) => a - b);
  return { n: s.length, media: s.reduce((a, b) => a + b, 0) / s.length, p10: pct(s, 0.1), p50: pct(s, 0.5), p90: pct(s, 0.9) };
};

function foto(g: ReturnType<typeof nuevaPartida>): Foto {
  const npcs = (g.moduleState('npcs') as { npcs: any[] }).npcs;
  const dia = g.time.day;
  const porEdad: Record<string, number[]> = {};
  const porLetra: Record<string, number[]> = {};
  const porEdadYLetra: Record<string, number[]> = {};
  for (const n of npcs) {
    if (!n.hab?.futbol || n.deporte !== 'futbol' || n.nacimiento === undefined) continue;
    const edad = Math.floor((dia - n.nacimiento) / 365);
    const letra = n.letra?.futbol ?? '-';
    const v = n.levels.futbol as number;
    (porEdad[edad] ??= []).push(v);
    (porLetra[letra] ??= []).push(v);
    (porEdadYLetra[`${edad}${letra}`] ??= []).push(v);
  }
  const r = (o: Record<string, number[]>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, resumen(v)]));
  return { porEdad: r(porEdad), porLetra: r(porLetra), porEdadYLetra: r(porEdadYLetra) };
}

if (process.argv[2] === '--comparar') {
  const a = JSON.parse(readFileSync(process.argv[3], 'utf8')) as Record<string, Record<string, Foto>>;
  const b = JSON.parse(readFileSync(process.argv[4], 'utf8')) as Record<string, Record<string, Foto>>;
  const semillas = Object.keys(a);
  for (const momento of ['crear', 'curso1', 'curso2']) {
    console.log(`\n== ${momento}: diferencia de la MEDIA del nivel (después − antes) frente al ruido entre semillas (desviación de la media de cada versión entre semillas) ==`);
    for (const grupo of ['porEdad', 'porLetra'] as const) {
      console.log(`  ${grupo}   clave   n(antes/desp)   media antes → después   dif   ruido(sd entre semillas)   p10 a→d   p50 a→d   p90 a→d`);
      const claves = Object.keys(a[semillas[0]][momento][grupo]).sort();
      for (const k of claves) {
        const m = (v: Record<string, Record<string, Foto>>) => semillas.map((s) => v[s][momento][grupo][k]).filter(Boolean);
        const A = m(a), B = m(b);
        if (!A.length || !B.length) continue;
        const media = (xs: Resumen[], f: (r: Resumen) => number) => xs.reduce((t, r) => t + f(r), 0) / xs.length;
        const sd = (xs: Resumen[]) => { const mu = media(xs, (r) => r.media); return Math.sqrt(xs.reduce((t, r) => t + (r.media - mu) ** 2, 0) / Math.max(1, xs.length - 1)); };
        const ma = media(A, (r) => r.media), mb = media(B, (r) => r.media);
        console.log(`  ${k.padStart(4)}  n ${media(A, (r) => r.n).toFixed(0)}/${media(B, (r) => r.n).toFixed(0)}  ${ma.toFixed(2)} → ${mb.toFixed(2)}  dif ${(mb - ma).toFixed(2).padStart(6)}  ruido ${((sd(A) + sd(B)) / 2).toFixed(2)}  p10 ${media(A, (r) => r.p10).toFixed(1)}→${media(B, (r) => r.p10).toFixed(1)}  p50 ${media(A, (r) => r.p50).toFixed(1)}→${media(B, (r) => r.p50).toFixed(1)}  p90 ${media(A, (r) => r.p90).toFixed(1)}→${media(B, (r) => r.p90).toFixed(1)}`);
      }
    }
  }
  process.exit(0);
}

const salida = process.argv[2] ?? 'distribuciones.json';
const semillas = (process.argv[3] ?? '31,32,33').split(',').map(Number);
registrarPais(PAIS_CIUDAD_GRANDE);
const todo: Record<string, Record<string, Foto>> = {};
for (const seed of semillas) {
  const t0 = performance.now();
  const g = nuevaPartida({ seed, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  const crear = performance.now() - t0;
  const fotos: Record<string, Foto> = { crear: foto(g) };
  const t1 = performance.now();
  advanceToWeek(g, 'gen.descansar', 53, 2, 15);
  fotos.curso1 = foto(g);
  advanceToWeek(g, 'gen.descansar', 105, 2, 15);
  fotos.curso2 = foto(g);
  todo[seed] = fotos;
  console.log(`semilla ${seed}: crear ${(crear / 1000).toFixed(1)} s, 104 semanas ${((performance.now() - t1) / 1000).toFixed(1)} s`);
  writeFileSync(salida, JSON.stringify(todo));
}
