/**
 * Dónde se va el tiempo al jugar en el recreo: por escenario (acción, lugar, hora), los ms por clic (preview, perform y la lista de acciones que se vuelve a pedir tras cada clic),
 * cuántas veces se recalculan servicios y acciones dinámicas por clic y el perfil de CPU por función. Solo mide: no cambia nada del juego.
 * `npx tsx tools/perfil-recreo.ts [repeticiones] [perfil]` (con `perfil` saca también el desglose por función de cada escenario).
 */
import inspector from 'node:inspector';
import { nuevaPartida } from '@ds/game';
import { advanceToWeek, type Game } from '@ds/core';
import { conocer, llegarA } from '../tests/ayudas';

const reps = Number(process.argv[2] ?? 5);
const conPerfil = process.argv[3] === 'perfil';
/** Partidas distintas por escenario (la mediana de todas, para que un clic raro no pese): con el perfil, una sola. */
const partidas = conPerfil ? 1 : Number(process.argv[3] ?? 5);

interface Escenario { nombre: string; lugar: string; hora: [number, number]; accion: (g: Game) => string }
const primera = (g: Game, prefijo: string, no?: RegExp) => g.listActions().find((a) => a.available && a.id.startsWith(prefijo) && !(no?.test(a.id)))?.id ?? g.listActions().find((a) => a.id.startsWith(prefijo))?.id ?? '';
const ESCENARIOS: Escenario[] = [
  { nombre: 'patio, recreo: Jugar con otros niños', lugar: 'patio', hora: [10, 42], accion: () => 'relaciones.jugar_con_otros' },
  { nombre: 'patio, recreo: Jugar con X', lugar: 'patio', hora: [10, 42], accion: (g) => primera(g, 'relaciones.jugar.') },
  { nombre: 'patio, recreo: Charlar un rato con X', lugar: 'patio', hora: [10, 42], accion: (g) => primera(g, 'relaciones.charlar.') },
  { nombre: 'patio, recreo: esperar (5 min)', lugar: 'patio', hora: [10, 42], accion: () => 'gen.esperar' },
  { nombre: 'parque, tarde: Jugar con otros niños', lugar: 'parque', hora: [17, 0], accion: () => 'relaciones.jugar_con_otros' },
  { nombre: 'parque, tarde: Jugar con X', lugar: 'parque', hora: [17, 0], accion: (g) => primera(g, 'relaciones.jugar.') },
  { nombre: 'parque, tarde: Charlar un rato con X', lugar: 'parque', hora: [17, 0], accion: (g) => primera(g, 'relaciones.charlar.') },
  { nombre: 'parque, tarde: esperar (5 min)', lugar: 'parque', hora: [17, 0], accion: () => 'gen.esperar' },
];

const ms = (x: number) => x.toFixed(1).padStart(6);
const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

type Nodo = { id: number; callFrame: { functionName: string; url: string; lineNumber: number }; children?: number[] };
function desglose(perfil: { nodes: Nodo[]; samples: number[]; timeDeltas: number[] }, top = 22) {
  const padre = new Map<number, number>();
  const nodos = new Map(perfil.nodes.map((n) => [n.id, n]));
  for (const n of perfil.nodes) for (const h of n.children ?? []) padre.set(h, n.id);
  const clave = (n: Nodo) => `${n.callFrame.functionName || '(anónima)'} · ${n.callFrame.url.split('/').slice(-2).join('/')}:${n.callFrame.lineNumber + 1}`;
  const inclusivo = new Map<string, number>();
  const propio = new Map<string, number>();
  let total = 0;
  perfil.samples.forEach((s, i) => {
    const dt = perfil.timeDeltas[i] / 1000;
    total += dt;
    const n0 = nodos.get(s)!;
    if (n0.callFrame.url.includes('Dinasty-Sports') && !n0.callFrame.url.includes('node_modules')) propio.set(clave(n0), (propio.get(clave(n0)) ?? 0) + dt);
    const vistos = new Set<string>();
    for (let id: number | undefined = s; id !== undefined; id = padre.get(id)) {
      const n = nodos.get(id)!;
      if (!n.callFrame.url.includes('Dinasty-Sports') || n.callFrame.url.includes('node_modules')) continue;
      const k = clave(n);
      if (vistos.has(k)) continue;
      vistos.add(k);
      inclusivo.set(k, (inclusivo.get(k) ?? 0) + dt);
    }
  });
  const orden = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1]).slice(0, top);
  return { total, inclusivo: orden(inclusivo), propio: orden(propio).slice(0, 12) };
}

function medir(e: Escenario, semilla: number) {
  const g = conocer(nuevaPartida({ seed: semilla }));
  advanceToWeek(g, 'gen.descansar', 1, 1, 9);
  llegarA(g, e.lugar, e.hora[0], e.hora[1]);
  // Cuántas veces se recalcula cada cosa por clic: los servicios que se piden y las acciones dinámicas de cada módulo (se envuelven por dentro del motor, solo para contar).
  const servicios = new Map<string, number>();
  const interno = g as unknown as { readCtx: (m: string) => Record<string, unknown> };
  const readCtx = interno.readCtx.bind(g);
  const envueltos = new WeakSet<object>();
  interno.readCtx = (m) => {
    const c = readCtx(m);
    if (!envueltos.has(c)) {
      envueltos.add(c);
      const orig = (c.service as (k: string) => unknown).bind(c);
      c.service = (k: string) => (servicios.set(k, (servicios.get(k) ?? 0) + 1), orig(k));
    }
    return c;
  };
  const dinamicas = new Map<string, { n: number; ms: number }>();
  for (const d of g.registry.dynamicActions as unknown as { module: string; fn: (ctx: unknown) => unknown }[]) {
    const orig = d.fn;
    d.fn = (ctx) => {
      const t0 = performance.now();
      const r = orig(ctx);
      const x = dinamicas.get(d.module) ?? { n: 0, ms: 0 };
      x.n++;
      x.ms += performance.now() - t0;
      dinamicas.set(d.module, x);
      return r;
    };
  }
  const sesion = new inspector.Session();
  if (conPerfil) {
    sesion.connect();
    sesion.post('Profiler.enable');
    sesion.post('Profiler.start');
  }
  const previews: number[] = [], performs: number[] = [], listas: number[] = [];
  let id = '';
  for (let i = 0; i < reps; i++) {
    id = e.accion(g);
    let t0 = performance.now();
    g.preview(id);
    previews.push(performance.now() - t0);
    t0 = performance.now();
    const r = g.perform(id);
    performs.push(performance.now() - t0);
    t0 = performance.now();
    g.listActions(); // lo que la interfaz vuelve a pedir tras cada clic
    listas.push(performance.now() - t0);
    if (!r.ok) console.log('   (la acción falló:', (r as { reason?: string }).reason, ')');
  }
  let perfil: ReturnType<typeof desglose> | undefined;
  if (conPerfil) sesion.post('Profiler.stop', (err, p) => { if (!err) perfil = desglose(p.profile as never); });
  const clic = previews.map((p, i) => p + performs[i] + listas[i]);
  return { id, clic, previews, performs, listas, servicios, dinamicas, perfil, acciones: g.listActions().length };
}

const mediana = (xs: number[]) => { const o = [...xs].sort((a, b) => a - b); return o.length ? o[Math.floor(o.length / 2)] : NaN; };
for (const e of ESCENARIOS) {
  const rs = Array.from({ length: partidas }, (_, i) => medir(e, 31 + i));
  const r0 = rs[0];
  const por = (f: (r: (typeof rs)[number]) => number[], desde: number) => mediana(rs.flatMap((r) => f(r).slice(desde)));
  console.log(`\n### ${e.nombre} (${r0.id}) — ${reps} clics en ${partidas} partida${partidas > 1 ? 's' : ''} (medianas)`);
  console.log(`  ms por clic (preview + perform + lista de acciones): primero ${ms(mediana(rs.map((r) => r.clic[0])))} · siguientes ${ms(por((r) => r.clic, 1))}`);
  console.log(`  desglose, siguientes clics: preview ${ms(por((r) => r.previews, 1))} · perform ${ms(por((r) => r.performs, 1))} · listActions ${ms(por((r) => r.listas, 1))} · acciones listadas al final ${mediana(rs.map((r) => r.acciones))}`);
  console.log(`  por clic (1.ª partida): servicios pedidos ${[...r0.servicios].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${(v / reps).toFixed(0)}`).join(', ')}`);
  console.log(`  por clic (1.ª partida): acciones dinámicas ${[...r0.dinamicas].map(([k, v]) => `${k} ${(v.n / reps).toFixed(1)} veces, ${(v.ms / reps).toFixed(1)} ms`).join(' · ')}`);
  if (r0.perfil) {
    console.log(`  perfil (CPU total ${r0.perfil.total.toFixed(0)} ms en ${reps} clics): inclusivo por función`);
    for (const [k, v] of r0.perfil.inclusivo) console.log(`    ${ms(v / reps)} ms/clic  ${k}`);
    console.log('  tiempo propio:');
    for (const [k, v] of r0.perfil.propio) console.log(`    ${ms(v / reps)} ms/clic  ${k}`);
  }
}
