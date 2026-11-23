import { PAIS_CIUDAD_GRANDE, registrarPais } from '@ds/contracts';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
registrarPais(PAIS_CIUDAD_GRANDE);
const PASADAS = Number(process.argv[2] ?? 3);
const SEMANAS = 10;
const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const porPasada: { sin: Record<string, number[]>; con: Record<string, number[]>; dia: Record<string, number[]>; creacion: number }[] = [];
for (let p = 0; p < PASADAS; p++) {
  const t0 = performance.now();
  const g = nuevaPartida({ seed: 31, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  const creacion = performance.now() - t0;
  const sin: Record<string, number[]> = {}, con: Record<string, number[]> = {}, dia: Record<string, number[]> = {};
  let semanasHechas = 0;
  while (semanasHechas < SEMANAS) {
    const w = g.time.week, d = g.time.day;
    (globalThis as any).__TT = {};
    const t = performance.now();
    if (!g.perform('gen.descansar').ok) g.perform('gen.esperar');
    const total = performance.now() - t;
    const acc = (globalThis as any).__TT as Record<string, number>;
    (globalThis as any).__TT = undefined;
    const destino = g.time.week !== w ? (semanasHechas < 3 ? sin : con) : g.time.day !== d ? dia : undefined;
    if (g.time.week !== w) semanasHechas++;
    if (destino) {
      destino['TOTAL del paso'] = [...(destino['TOTAL del paso'] ?? []), total];
      for (const [k, v] of Object.entries(acc)) if (!k.endsWith('#')) destino[k] = [...(destino[k] ?? []), v];
    }
  }
  porPasada.push({ sin, con, dia, creacion });
}
const resumen = (campo: 'sin' | 'con' | 'dia') => {
  const claves = new Set(porPasada.flatMap((x) => Object.keys(x[campo])));
  return [...claves].map((k) => {
    const medias = porPasada.map((x) => (x[campo][k] ? x[campo][k].reduce((a, b) => a + b, 0) / x[campo]['TOTAL del paso'].length : 0));
    return [k, med(medias), Math.min(...medias), Math.max(...medias)] as const;
  }).sort((a, b) => b[1] - a[1]);
};
for (const [titulo, c] of [['Cruce de semana SIN jornada de liga (semanas 1–3)', 'sin'], ['Cruce de semana CON jornada de liga (semanas 4–10)', 'con'], ['Cruce de día (por cruce)', 'dia']] as const) {
  console.log(`\n## ${titulo} — ms por cruce: mediana (mín–máx) de ${PASADAS} pasadas`);
  for (const [k, m, lo, hi] of resumen(c)) console.log(`${k.padEnd(48)} ${m.toFixed(1).padStart(8)} (${lo.toFixed(1)}–${hi.toFixed(1)})`);
}
