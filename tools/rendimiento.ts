/**
 * Dónde se va el tiempo en una partida: crear, guardar, cargar, un día cualquiera y una acción cualquiera, y cuánto pesa cada parte del estado.
 *
 *   npm run rendimiento -- [días] [--ciudad] [--pasadas N] [--json]
 *
 * - `--ciudad`: lo que juega el usuario, la ciudad grande con el fútbol instalado (por defecto, España con la ciudad de prueba y solo el atletismo).
 * - `--pasadas N` (3 por defecto): cada medida se repite en N partidas y se da la mediana (y el rango): una sola pasada baila ±15 %.
 * - `--json`: una línea final con todas las cifras (para compararlas entre commits).
 * Con `node --cpu-prof` se ve el perfil por función.
 */
import { PAIS_CIUDAD_GRANDE, SERVICES, registrarPais, type NpcDirectory, type PresenciaService } from '@ds/contracts';
import { MODULOS, cargarPartida, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { BOTS, runBot } from '../sim/src/index';

const args = process.argv.slice(2);
const flag = (n: string): boolean => args.includes(n);
const valor = (n: string, def: number): number => (args.includes(n) ? Number(args[args.indexOf(n) + 1]) : def);
const numeros = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1] === '--pasadas'));
const dias = Number(numeros[0] ?? 30);
const ciudad = flag('--ciudad');
const pasadas = valor('--pasadas', 3);

const t = <T>(f: () => T): [T, number] => {
  const t0 = performance.now();
  const r = f();
  return [r, performance.now() - t0];
};
const mediana = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const ms = (xs: number[], d = 1): string => (xs.length === 1 ? `${xs[0].toFixed(d)} ms` : `${mediana(xs).toFixed(d)} ms (${Math.min(...xs).toFixed(d)}–${Math.max(...xs).toFixed(d)})`);
const kb = (x: number) => `${(x / 1024).toFixed(0)} KB`;

if (ciudad) registrarPais(PAIS_CIUDAD_GRANDE);
const juego = ciudad ? { modulos: [...MODULOS, futbol], deportes: ['atletismo', 'futbol'], pais: PAIS_CIUDAD_GRANDE.id } : {};
const crear = (seed: number) => nuevaPartida({ seed, ...(ciudad ? { pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] } : {}) }, ciudad ? [...MODULOS, futbol] : MODULOS);
console.log(`Escenario: ${ciudad ? 'ciudad grande + fútbol' : 'España, ciudad de prueba, atletismo'} · ${pasadas} pasadas · bot ${dias} días`);

const m: Record<string, number[]> = { crear: [], copiar: [], texto: [], cargar: [], lista: [], patio: [], esperar: [], presenciaTrasTiempo: [], msAccion: [], msDia: [], msSemana: [], acciones: [], accionesPorDia: [] };
let estadoBytes = 0;
let primera = 0;
for (let p = 0; p < pasadas; p++) {
  const [g, creacion] = t(() => crear(31 + (p % 3)));
  if (p === 0) primera = creacion;
  else m.crear.push(creacion);
  const [, clonar] = t(() => g.serialize());
  const [, guardar] = t(() => g.serializarJSON());
  const json = JSON.stringify(g.serialize());
  estadoBytes = json.length;
  m.copiar.push(clonar);
  m.texto.push(guardar);
  m.cargar.push(t(() => cargarPartida(JSON.parse(json), ciudad ? [...MODULOS, futbol] : undefined, { copiar: false }))[1]);
  if (p === 0) {
    const estado = g.serialize();
    const partes = Object.entries(estado.modules).map(([mod, s]) => [mod, JSON.stringify(s).length] as const).sort((a, b) => b[1] - a[1]);
    console.log(`Estado: ${kb(estadoBytes)}. Por módulo:`, partes.map(([mod, n]) => `${mod} ${kb(n)}`).join(' · '));
    const npcs = (estado.modules.npcs as { npcs: Record<string, unknown>[] }).npcs;
    const campos = new Map<string, number>();
    for (const n of npcs) for (const [k, v] of Object.entries(n)) campos.set(k, (campos.get(k) ?? 0) + (JSON.stringify(v)?.length ?? 0));
    console.log(`Personas: ${npcs.length}; por campo:`, [...campos].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, n]) => `${k} ${kb(n)}`).join(' · '));
  }
  const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
  const pres = g.service<PresenciaService>(SERVICES.presencia)!;
  m.lista.push(t(() => dir.list({}))[1]);
  m.patio.push(t(() => pres.en('patio'))[1]);
  const presencia: number[] = [];
  for (let i = 0; i < 12; i++) {
    g.perform('gen.esperar');
    presencia.push(t(() => pres.en('patio'))[1]);
  }
  m.presenciaTrasTiempo.push(presencia.reduce((a, b) => a + b, 0) / presencia.length);
  const horas: number[] = [];
  for (let i = 0; i < 24; i++) horas.push(t(() => g.perform('gen.esperar'))[1]);
  m.esperar.push(horas.reduce((a, b) => a + b, 0) / horas.length);
  const r = runBot(BOTS.find((b) => b.id === 'equilibrado')!, 1 + p, dias, juego);
  m.msAccion.push(r.ms / r.actions);
  m.msDia.push(r.ms / dias);
  m.msSemana.push((r.ms / dias) * 7);
  m.acciones.push(r.actions);
  m.accionesPorDia.push(r.actions / dias);
}
console.log(`Crear la partida: primera (en frío) ${primera.toFixed(0)} ms · en caliente ${ms(m.crear.length ? m.crear : [primera], 0)}`);
console.log(`Guardar: copiar ${ms(m.copiar)} · a texto ${ms(m.texto)}. Cargar (leer el texto y montarla): ${ms(m.cargar)}`);
console.log(`Servicios: lista de todos ${ms(m.lista)} · quién hay en el patio ${ms(m.patio)} · tras pasar el tiempo ${ms(m.presenciaTrasTiempo, 2)}`);
console.log(`Acción «esperar»: ${ms(m.esperar, 2)}`);
console.log(`Bot equilibrado ${dias} días: ${ms(m.acciones.map((x) => x), 0).replace(' ms', '')} acciones (${mediana(m.accionesPorDia).toFixed(1)}/día) → ${ms(m.msAccion, 2)} por acción · ${ms(m.msDia, 1)} por día simulado · ${ms(m.msSemana, 0)} por semana`);
if (flag('--json')) console.log('JSON ' + JSON.stringify({ ciudad, primera, estadoKB: Math.round(estadoBytes / 1024), ...Object.fromEntries(Object.entries(m).map(([k, v]) => [k, mediana(v.length ? v : [primera])])) }));
