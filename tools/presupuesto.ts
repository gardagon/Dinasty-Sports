/**
 * Vigila el presupuesto de rendimiento (`docs/relevo/revision-rendimiento.md` §5): crear, guardar, cargar, ms por acción y por semana de juego y peso del estado, en España con la ciudad de prueba y, con `--ciudad`,
 * con la ciudad grande y el fútbol. Los tiempos se comparan **en veces la calibración de la máquina** (la misma carga fija que usa el chequeo de Rendimiento de `npm run sim`) y se toma la mediana de varias pasadas:
 * así no salta por una máquina ocupada o más lenta, solo si el motor se ha vuelto de verdad más lento. El peso del estado no depende de la máquina y se compara en KB.
 *
 *   npm run presupuesto [-- --ciudad] [--pasadas 3]      (sale con error si algo pasa del presupuesto)
 *   npm run presupuesto -- [--ciudad] --peso              solo el peso del estado (rápido en la ciudad de prueba: ~1 s)
 *   npm run presupuesto -- [--ciudad] --peso --anotar      anota el peso actual por módulo y campo como el de referencia (`tools/peso-base.json`)
 *
 * El peso del estado **solo avisa** (⚠️, sin fallar): no es peligroso (se guarda en IndexedDB, que admite mucho más), pero no debe crecer sin que nos demos cuenta.
 * Si pasa del tope, dice qué módulo y campo han crecido frente a lo anotado en `tools/peso-base.json`.
 */
import { PAIS_CIUDAD_GRANDE, registrarPais } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, cargarPartida, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { BOTS, runBot } from '../sim/src/index';
import { calibrar, mediana } from '../sim/src/analysis';
import { crecimientos, guardarBase, leerBase, pesoPorCampo } from './peso';

const args = process.argv.slice(2);
const ciudad = args.includes('--ciudad');
const pasadas = args.includes('--pasadas') ? Number(args[args.indexOf('--pasadas') + 1]) : 3;
const t = <T>(f: () => T): [T, number] => { const t0 = performance.now(); const r = f(); return [r, performance.now() - t0]; };

/** Presupuesto: tiempos en veces la calibración (≈ 7,5 ms en el contenedor de desarrollo), peso en KB. El «medido» de cada uno está en el informe. */
const PRESUPUESTO = ciudad
  ? { crear: 5500, guardar: 75, cargar: 25, msAccion: 1.4, semana: 150, estadoKB: 18000 }
  : { crear: 110, guardar: 12, cargar: 5, msAccion: 0.22, semana: 10, estadoKB: 3300 };

if (ciudad) registrarPais(PAIS_CIUDAD_GRANDE);
const modulos = ciudad ? [...MODULOS, futbol] : MODULOS;
const juego = ciudad ? { modulos, deportes: ['atletismo', 'futbol'], pais: PAIS_CIUDAD_GRANDE.id } : {};
const soloPeso = args.includes('--peso');
const escenario = ciudad ? 'ciudad' : 'prueba';

/** El aviso de peso: nunca falla. Con `--anotar` guarda el peso actual como referencia. */
function avisoDePeso(estado: { modules: Record<string, unknown> }, kb: number): void {
  const campos = pesoPorCampo(estado.modules);
  const base = leerBase()[escenario];
  if (args.includes('--anotar')) {
    guardarBase(escenario, kb, campos);
    console.log(`📌 Peso anotado como referencia (${escenario}): ${kb.toFixed(0)} KB.`);
    return;
  }
  const tope = args.includes('--tope') ? Number(args[args.indexOf('--tope') + 1]) : PRESUPUESTO.estadoKB;
  if (kb <= tope) {
    console.log(`✅ estado de la partida      ${kb.toFixed(0)} KB  tope ${tope} KB${base ? ` (referencia anotada: ${base.totalKB} KB)` : ''}`);
    return;
  }
  console.log(`⚠️  AVISO: el estado de la partida pesa ${kb.toFixed(0)} KB y el tope es ${tope} KB (no falla: se guarda en IndexedDB, que admite mucho más; pero ha crecido).`);
  const lista = crecimientos(campos, base?.campos);
  console.log(base ? `   Ha crecido frente a la referencia (${base.totalKB} KB):` : '   No hay referencia anotada (`--peso --anotar`); lo más pesado:');
  for (const l of lista) console.log(`   · ${l}`);
}

if (soloPeso) {
  const g = nuevaPartida({ seed: 31, ...(ciudad ? { pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] } : {}) }, modulos);
  const estado = g.serialize();
  avisoDePeso(estado, JSON.stringify(estado).length / 1024);
  process.exit(0);
}
const cal = mediana([calibrar(), calibrar(), calibrar()]);
const m: Record<string, number[]> = { crear: [], guardar: [], cargar: [], msAccion: [], semana: [] };
let estadoKB = 0;
let estadoActual: { modules: Record<string, unknown> } | undefined;
for (let p = 0; p < pasadas; p++) {
  const [g, crear] = t(() => nuevaPartida({ seed: 31 + p, ...(ciudad ? { pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] } : {}) }, modulos));
  m.crear.push(crear);
  m.guardar.push(t(() => g.serializarJSON())[1] + t(() => g.serialize())[1]);
  const json = JSON.stringify(g.serialize());
  estadoKB = json.length / 1024;
  estadoActual = JSON.parse(json);
  m.cargar.push(t(() => cargarPartida(JSON.parse(json), modulos, { copiar: false }))[1]);
  // La semana más cara de las 4 primeras (la pasada semanal de los PNJ).
  const semanas: number[] = [];
  for (let w = 1; w <= 4; w++) semanas.push(t(() => advanceToWeek(g, 'gen.descansar', w, 0, 9))[1]);
  m.semana.push(Math.max(...semanas));
  const r = runBot(BOTS.find((b) => b.id === 'equilibrado')!, 1 + p, 28, juego);
  m.msAccion.push(r.ms / r.actions);
}
let fallos = 0;
console.log(`Presupuesto (${ciudad ? 'ciudad grande + fútbol' : 'ciudad de prueba'}) · calibración ${cal.toFixed(1)} ms · mediana de ${pasadas} pasadas`);
const fila = (nombre: string, medido: number, tope: number, unidad: string, enVeces: boolean): void => {
  const ok = (enVeces ? medido / cal : medido) <= tope;
  if (!ok) fallos++;
  console.log(`${ok ? '✅' : '❌'} ${nombre.padEnd(22)} ${enVeces ? `${(medido / cal).toFixed(tope < 5 ? 3 : 1)} × cal (${medido.toFixed(1)} ms)` : `${medido.toFixed(0)} KB`}  presupuesto ${tope} ${unidad}`);
};
for (const [k, nombre] of [['crear', 'crear la partida'], ['guardar', 'guardar (copiar + texto)'], ['cargar', 'cargar'], ['msAccion', 'ms por acción'], ['semana', 'semana de juego (máx.)']] as const) {
  fila(nombre, mediana(m[k]), PRESUPUESTO[k], '× cal', true);
}
avisoDePeso(estadoActual!, estadoKB);
if (fallos) {
  console.error(`❌ ${fallos} medida(s) pasan del presupuesto: si no es ruido (repite) mira docs/relevo/revision-rendimiento.md.`);
  process.exit(1);
}
