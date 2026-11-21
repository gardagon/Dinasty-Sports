/**
 * El cuerpo de la población: qué proporción tiene cada complexión por grupo de edad (los objetivos de `docs/PLAN_CUERPO_Y_APARIENCIA.md` §7) y cuánto cambia de tipo.
 * `npm run sim:cuerpo -- [años] [semillas separadas por comas]` (por defecto 2 años y las semillas 31,32,33): deja pasar el tiempo sin que el personaje haga nada
 * y mide a los PNJ al empezar y al final.
 */
import { complexion, type BodyType } from '@ds/contracts';
import { nuevaPartida } from '@ds/game';

interface P { id: string; nacimiento?: number; cuerpo?: [number, number]; deporte?: string; equipo?: string; gender: string; role: string }
const anios = Number(process.argv[2] ?? 2);
const semillas = (process.argv[3] ?? '31,32,33').split(',').map(Number);
const GRUPOS: [string, number, number][] = [['8-12', 8, 12], ['13-17', 13, 17], ['18-39', 18, 39], ['40-64', 40, 64], ['65+', 65, 120]];
const TIPOS: BodyType[] = ['delgado', 'normal', 'atletico', 'musculado', 'con_sobrepeso'];
const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(1)}%` : '—');

function medir(etiqueta: string, lista: P[], dia: number) {
  console.log(`\n${etiqueta}: ${lista.length} personas con cuerpo`);
  const fila = (nombre: string, g: P[]) => {
    const c = Object.fromEntries(TIPOS.map((t) => [t, g.filter((p) => complexion(p.cuerpo![0], p.cuerpo![1]) === t).length]));
    const juega = g.filter((p) => p.deporte && p.equipo);
    const sobreJuega = juega.filter((p) => complexion(p.cuerpo![0], p.cuerpo![1]) === 'con_sobrepeso').length;
    console.log(`  ${nombre.padEnd(7)} n=${String(g.length).padStart(4)}  ${TIPOS.map((t) => `${t} ${pct(c[t], g.length)}`).join(' · ')}  | deportistas n=${juega.length}: sobrepeso ${pct(sobreJuega, juega.length)}`);
  };
  for (const [nombre, a, b] of GRUPOS) fila(nombre, lista.filter((p) => { const e = Math.floor((dia - p.nacimiento!) / 365); return e >= a && e <= b; }));
}

for (const seed of semillas) {
  const g = nuevaPartida({ seed });
  const leer = () => ((g.serialize().modules.npcs as { npcs: P[] }).npcs).filter((p) => p.cuerpo && p.nacimiento !== undefined);
  const antes = leer();
  console.log(`\n=== semilla ${seed} ===`);
  medir('Al empezar', antes, 0);
  const mapa0 = new Map(antes.map((p) => [p.id, complexion(p.cuerpo![0], p.cuerpo![1])]));
  let cambios = 0;
  // El tiempo pasa descansando (lo más largo que se pueda) o esperando: el personaje no hace deporte.
  const meta = anios * 365;
  while (g.time.day < meta) {
    const largo = g.availableActions().filter((a) => a.tags.includes('descanso')).sort((a, b) => b.duration - a.duration)[0];
    g.perform(largo?.id ?? 'gen.esperar');
  }
  const t = g.serialize().modules.npcs as { npcs: P[] };
  const despues = t.npcs.filter((p) => p.cuerpo && p.nacimiento !== undefined);
  const dReal = g.time.day;
  medir(`Tras ${anios} años (día ${dReal})`, despues, dReal);
  const adultos = despues.filter((p) => mapa0.has(p.id) && Math.floor((0 - p.nacimiento!) / 365) >= 18);
  cambios = adultos.filter((p) => mapa0.get(p.id) !== complexion(p.cuerpo![0], p.cuerpo![1])).length;
  console.log(`  Adultos que cambian de tipo en ${anios} años: ${pct(cambios, adultos.length)} (${adultos.length})`);
  const jovenes = despues.filter((p) => Math.floor((dReal - p.nacimiento!) / 365) < 12 && complexion(p.cuerpo![0], p.cuerpo![1]) === 'musculado').length;
  console.log(`  Menores de 12 «musculados»: ${jovenes}`);
}
