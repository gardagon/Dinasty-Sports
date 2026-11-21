/**
 * Cuántos minutos acaba jugando cada niño de un equipo en una temporada (solo mide, no cambia el juego), con la ciudad grande: por categoría y tipo de club (colegio o de fuera) reparte a los jugadores de los equipos
 * según los minutos del curso (de las estadísticas de verdad de cada uno) y dice la media, el peor, el décimo percentil, cuántos no llegan a jugar nada o casi nada y el reparto de los minutos entre los de un mismo equipo.
 * También dice qué minutos y partidos juega el personaje (apuntado al club del colegio, entrenando todo lo que puede no: solo avanza el tiempo, así que sin ir a los entrenamientos) y, con `--entrena`, yendo a los
 * entrenamientos del club. Sirve para comparar la rotación de los equipos de colegio (`CategoriaDef.rotacionEn`) antes y después. `npm run rotacion -- [semillas] [semana final]`.
 */
import { PAIS_CIUDAD_GRANDE, SERVICES, registrarPais, type NpcDirectory } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol, type FutbolState } from '@ds/mod-futbol';
import { categoriasDelEquipo, type NpcsState } from '@ds/mod-npcs';
import { hacer, posible } from '../tests/ayudas';

registrarPais(PAIS_CIUDAD_GRANDE);
const SEMILLAS = (process.argv[2] ?? '31,33').split(',').map(Number);
const SEMANA_FINAL = Number(process.argv[3] ?? 40);
const CATEGORIAS = ['benjamin', 'alevin', 'infantil'];
const f = (x: number, d = 0): string => x.toFixed(d);
const media = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const percentil = (xs: number[], p: number): number => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(p * xs.length))] ?? 0;

interface Grupo { minutos: number[]; porEquipo: number[]; partidos: number[] }
const grupos = new Map<string, Grupo>();
const personaje: string[] = [];

for (const seed of SEMILLAS) {
  const g = nuevaPartida({ seed, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  advanceToWeek(g, 'gen.descansar', 0, 2, 9);
  if (posible(g, 'futbol.apuntarse_colegio')) hacer(g, 'futbol.apuntarse_colegio');
  advanceToWeek(g, 'gen.descansar', SEMANA_FINAL, 0, 9);
  const s = g.moduleState<NpcsState>('npcs') as NpcsState;
  const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
  const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
  const curso = Math.floor(SEMANA_FINAL / 52);
  void curso;
  for (const e of pob.equipos.filter((x) => x.plantillaPorCategoria)) {
    for (const cx of categoriasDelEquipo(pob, e).filter((c) => CATEGORIAS.includes(c.id))) {
      const letras = ['A', 'B', 'C', 'D'];
      for (const letra of letras) {
        const plantilla = dir.plantillaDelEquipo!('futbol', e.club, cx.id, letra);
        if (plantilla.length < 14) continue;
        const mins = plantilla.map((j) => j.estadisticas?.min ?? 0);
        const pj = plantilla.map((j) => j.estadisticas?.pj ?? 0);
        const k = `${e.colegio === undefined ? 'fuera  ' : 'colegio'} · ${cx.id}`;
        const grupo = grupos.get(k) ?? grupos.set(k, { minutos: [], porEquipo: [], partidos: [] }).get(k)!;
        grupo.minutos.push(...mins);
        grupo.partidos.push(...pj);
        // Reparto dentro del equipo: desviación típica de los minutos de sus jugadores.
        const m = media(mins);
        grupo.porEquipo.push(Math.sqrt(media(mins.map((x) => (x - m) ** 2))));
      }
    }
  }
  const yo = dir.equipoDelPersonaje?.('futbol');
  const st = (g.moduleState<FutbolState>('futbol') as FutbolState).estadisticas;
  personaje.push(`semilla ${seed}: ${yo ? `${yo.club} ${yo.categoria} ${yo.letra}` : 'sin equipo'}; PJ ${st?.pj ?? 0}, titular ${st?.ti ?? 0}, ${st?.min ?? 0} minutos`);
}

console.log(`Minutos de la temporada por jugador (semillas ${SEMILLAS.join(',')}, hasta la semana ${SEMANA_FINAL}):\n`);
console.log('| Tipo · categoría | Jugadores | Media | Peor | P10 | Mediana | Con 0 min | Con menos de 180 min | Desv. dentro del equipo | PJ medios |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const [k, gr] of [...grupos].sort()) {
  const n = gr.minutos.length;
  console.log(`| ${k} | ${n} | ${f(media(gr.minutos))} | ${f(Math.min(...gr.minutos))} | ${f(percentil(gr.minutos, 0.1))} | ${f(percentil(gr.minutos, 0.5))} | ${f((100 * gr.minutos.filter((m) => m === 0).length) / n)} % | ${f((100 * gr.minutos.filter((m) => m < 180).length) / n)} % | ${f(media(gr.porEquipo))} | ${f(media(gr.partidos), 1)} |`);
}
console.log('\nEl personaje (apuntado al colegio, sin entrenar por su cuenta):');
for (const l of personaje) console.log('  ' + l);
