import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { SERVICES, type NpcDirectory } from '@ds/contracts';
import { futbol, rendimiento as rendimientoDeFutbol } from '@ds/mod-futbol';
import { edadNpc, type NpcsState } from '@ds/mod-npcs';

/**
 * Medidas de los fichajes (P2b-2, `docs/CIUDAD_Y_LIGAS.md` §7), con varias semillas:
 *  1. Cuándo entra un personaje del montón en cada club de fútbol: el nivel del peor jugador de cada equipo (lo que hay que superar con el equipo completo) frente al del personaje
 *     de partida y al del jugador mediano de su equipo, por categoría. «Libre» si el equipo tiene hueco.
 *  2. Cuántos niños dejan el deporte para siempre cada año (`dejado`) y cuántos futbolistas hay en total, para ver que los equipos no se vacían con los años.
 * Uso: `npm run fichajes -- <semillas> <cursos>` (por defecto 12 semillas y 3 cursos).
 */
const SEMILLAS = Number(process.argv[2] ?? 12);
const CURSOS = Number(process.argv[3] ?? 3);
const CLUBES = ['club_grande', 'club_mediano', 'club_pequeno', 'colegio'];

const mediana = (xs: number[]): number => {
  const o = [...xs].sort((a, b) => a - b);
  return o.length ? o[Math.floor((o.length - 1) / 2)] : NaN;
};

const umbral: Record<string, number[]> = {};
const huecos: Record<string, number> = {};
const medianos: Record<string, number[]> = {};
const personaje: number[] = [];
const dejadosPorCurso: number[][] = Array.from({ length: CURSOS }, () => []);
const futbolistasPorCurso: number[][] = Array.from({ length: CURSOS + 1 }, () => []);

for (let seed = 1; seed <= SEMILLAS; seed++) {
  const g = nuevaPartida({ seed, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  const s0 = g.moduleState<NpcsState>('npcs') as NpcsState;
  personaje.push(rendimientoDeFutbol({ stat: (id) => g.stat(id), norm: (id) => g.stat(id) / 100 })); // aproximado: sin ajustar por la edad
  for (const club of CLUBES) {
    // El equipo de benjamín (8 y 9 años): la categoría con la que empieza el personaje.
    const equipo = s0.npcs.filter((n) => n.deporte === 'futbol' && n.equipo === club && (edadNpc(n, 0) ?? 99) <= 9);
    const niveles = equipo.map((n) => n.levels.futbol);
    (medianos[club] ??= []).push(mediana(niveles));
    if (equipo.length < 18) huecos[club] = (huecos[club] ?? 0) + 1;
    else (umbral[club] ??= []).push(Math.min(...niveles));
  }
  futbolistasPorCurso[0].push(s0.npcs.filter((n) => n.deporte === 'futbol').length);
  let dejadosAntes = s0.npcs.filter((n) => n.dejado?.length).length;
  for (let c = 1; c <= CURSOS; c++) {
    advanceToWeek(g, 'gen.descansar', 52 * c + 1, 2, 15);
    const s = g.moduleState<NpcsState>('npcs') as NpcsState;
    const dejados = s.npcs.filter((n) => n.dejado?.length).length;
    dejadosPorCurso[c - 1].push(dejados - dejadosAntes);
    dejadosAntes = dejados;
    futbolistasPorCurso[c].push(s.npcs.filter((n) => n.deporte === 'futbol').length);
  }
  const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
  void dir;
}

const f = (x: number): string => (Number.isNaN(x) ? '—' : x.toFixed(1));
const media = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
console.log(`\nMedidas de fichajes: ${SEMILLAS} semillas, ${CURSOS} cursos\n`);
console.log(`Nivel del personaje de partida en fútbol: mediana ${f(mediana(personaje))} (mín ${f(Math.min(...personaje))}, máx ${f(Math.max(...personaje))})\n`);
console.log('Equipo de benjamín (8-9 años) de cada club, al empezar:');
console.log('| Club | Nivel mediano del equipo | Equipos con hueco | Nivel del peor (equipo completo) | Entra el personaje |');
console.log('|---|---|---|---|---|');
for (const club of CLUBES) {
  const peor = umbral[club] ?? [];
  const entra = media(personaje) > mediana(peor) ? 'por mérito' : 'no entra si está completo';
  console.log(`| ${club} | ${f(mediana(medianos[club]))} | ${huecos[club] ?? 0} de ${SEMILLAS} | ${peor.length ? f(mediana(peor)) : '—'} | ${huecos[club] ? `con hueco entra (${huecos[club]}/${SEMILLAS})` : ''} ${peor.length ? entra : ''} |`);
}
console.log('\nQuienes dejan el deporte para siempre (niños que tienen `dejado`) por curso, y futbolistas en total:');
console.log('| Curso | Dejan el deporte (media por partida) | Máx | Futbolistas (media) |');
console.log('|---|---|---|---|');
console.log(`| 0 (inicio) | — | — | ${f(media(futbolistasPorCurso[0]))} |`);
for (let c = 0; c < CURSOS; c++) console.log(`| ${c + 1} | ${f(media(dejadosPorCurso[c]))} | ${Math.max(...dejadosPorCurso[c])} | ${f(media(futbolistasPorCurso[c + 1]))} |`);
