/**
 * Lo que cuesta tener más gente en las calles (encargo `docs/relevo/gente-por-la-calle.md`, §3). No cambia el juego: parte de la ciudad grande con el fútbol, y añade a la partida N vecinos adultos
 * de mentira (copias de vecinos adultos que ya hay, con otro id) para medir su peso y su tiempo, y cuenta los cambios de tramo por día (cada uno obliga a recalcular la presencia de toda la población).
 *
 *   npx tsx tools/gente-por-la-calle-coste.ts [N ...]     (por defecto 0 y 100, 250, 500; N = vecinos añadidos)
 */
import { PAIS_CIUDAD_GRANDE, SERVICES, registrarPais, type PresenciaService } from '@ds/contracts';
import { MODULOS, cargarPartida, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { edadNpc, type NpcsState } from '@ds/mod-npcs';

registrarPais(PAIS_CIUDAD_GRANDE);
const t = <T>(f: () => T): [T, number] => { const t0 = performance.now(); const r = f(); return [r, performance.now() - t0]; };
const mediana = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const kb = (x: number) => `${(x / 1024).toFixed(0)} KB`;
const MODS = [...MODULOS, futbol];
const ns = process.argv.slice(2).filter((a) => !a.startsWith('--')).map(Number);
const cuantos = ns.length ? ns : [0, 100, 250, 500];

const [base] = t(() => nuevaPartida({ seed: 31, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] }, MODS));
const estadoBase = base.serialize();
const baseNpcs = (estadoBase.modules.npcs as NpcsState).npcs;
const adultos = baseNpcs.filter((n) => /^vecino_\d+$/.test(n.id) && (edadNpc(n, 0) ?? 0) >= 25);
console.log(`Ciudad grande: ${baseNpcs.length} personas; vecinos adultos de 25+ con los que se clona: ${adultos.length}; estado ${kb(JSON.stringify(estadoBase).length)}`);
const bytesDe = (n: unknown) => JSON.stringify(n).length;
const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
console.log(`Peso medio de una persona: vecino adulto ${media(adultos.map(bytesDe)).toFixed(0)} B; niño de otro colegio ${media(baseNpcs.filter((n) => /^nino_/.test(n.id)).slice(0, 300).map(bytesDe)).toFixed(0)} B; compañero ${media(baseNpcs.filter((n) => /^(alumno|curso|clase)_/.test(n.id)).slice(0, 300).map(bytesDe)).toFixed(0)} B`);

for (const n of cuantos) {
  const estado = structuredClone(estadoBase);
  const lista = (estado.modules.npcs as NpcsState).npcs;
  for (let i = 0; i < n; i++) {
    const m = structuredClone(adultos[i % adultos.length]);
    lista.push({ ...m, id: `vecino_${1000 + i}`, name: `${m.name} (${i})` });
  }
  const json = JSON.stringify(estado);
  const [g, cargar] = t(() => cargarPartida(JSON.parse(json), MODS, { copiar: false }));
  const [, guardar] = t(() => g.serializarJSON());
  const pres = g.service<PresenciaService>(SERVICES.presencia)!;
  // Cambios de presencia en dos días (cada versión nueva es un recálculo de toda la población) y lo que cuesta la primera consulta tras cada cambio.
  const versiones = new Set<number>();
  const primeras: number[] = [];
  const dia0 = g.time.day;
  let ultima = -1;
  while (g.time.day < dia0 + 2) {
    g.perform('gen.esperar');
    const p = g.service<PresenciaService>(SERVICES.presencia)!;
    const [, ms] = t(() => p.en('parque', 40));
    if (p.version !== ultima) { ultima = p.version; versiones.add(p.version); primeras.push(ms); }
  }
  // Una semana entera de «descansar» (con la pasada semanal de los PNJ).
  const w0 = g.time.week;
  const semana: number[] = [];
  const t0 = performance.now();
  while (g.time.week < w0 + 3) {
    const w = g.time.week;
    const [, ms] = t(() => g.perform(g.preview('gen.descansar')?.available ? 'gen.descansar' : 'gen.esperar'));
    if (g.time.week !== w) semana.push(ms);
  }
  const total = performance.now() - t0;
  console.log(`+${String(n).padStart(4)} vecinos | personas ${lista.length} | estado ${kb(json.length)} | cargar ${cargar.toFixed(0)} ms | guardar ${guardar.toFixed(0)} ms | presencia: ${versiones.size} cambios en 2 días, 1.ª consulta tras cambio ${mediana(primeras).toFixed(1)} ms (máx ${Math.max(...primeras).toFixed(1)}) | pasada semanal ${semana.length ? mediana(semana).toFixed(0) : '?'} ms | 3 semanas ${total.toFixed(0)} ms (pres ${pres.version})`);
}

// Y crear la partida de verdad con más vecinos en la ciudad (otra ciudad grande con `vecinos` más alto: cambia el azar de todo el mundo, así que solo vale para el tiempo y el peso).
if (process.argv.includes('--crear')) {
  const { CIUDAD_GRANDE } = await import('@ds/contracts');
  for (const v of [80, 230, 580]) {
    const p = { ...PAIS_CIUDAD_GRANDE, id: `grande_${v}`, ciudad: { ...CIUDAD_GRANDE, vecinos: v } };
    registrarPais(p);
    const [g, ms] = t(() => nuevaPartida({ seed: 31, pais: p.id, deportes: ['atletismo', 'futbol'] }, MODS));
    const n = (g.serialize().modules.npcs as NpcsState).npcs.length;
    console.log(`crear con ${v} vecinos: ${n} personas, ${ms.toFixed(0)} ms, estado ${kb(JSON.stringify(g.serialize()).length)}`);
  }
}
