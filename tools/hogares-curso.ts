/**
 * Cuántos de los niños que entran cada curso salen de familias que ya existen (hermanos pequeños) y cuántos de familias que se mudan (`docs/relevo/hogares.md`, addendum A6), y cómo evoluciona la población con los cursos
 * (adultos, niños, hermanos pequeños, familias archivadas y borradas). Solo mide: crea una partida con hogares y avanza N cursos.
 *
 *   npx tsx tools/hogares-curso.ts [prueba|grande] [cursos]
 */
import { ID_PAIS_CIUDAD_DE_PRUEBA_CON_HOGARES, ID_PAIS_CIUDAD_GRANDE_CON_HOGARES, PAIS_CIUDAD_DE_PRUEBA_CON_HOGARES, PAIS_CIUDAD_GRANDE_CON_HOGARES, registrarPais } from '@ds/contracts';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { FAMILIAS, edadNpc, esProgenitorDeHogar, type NpcsState } from '@ds/mod-npcs';

// `--siguiente a,b,c,d` cambia en esta ejecución la probabilidad de hermano pequeño (`FAMILIAS.siguiente`) para probar ajustes sin tocar el juego.
const iS = process.argv.indexOf('--siguiente');
if (iS >= 0) (FAMILIAS.siguiente as unknown as number[]).splice(0, 4, ...process.argv[iS + 1].split(',').map(Number));
const cual = process.argv[2] ?? 'prueba';
const cursos = Number(process.argv[3] ?? 4);
const pais = cual === 'grande' ? PAIS_CIUDAD_GRANDE_CON_HOGARES : PAIS_CIUDAD_DE_PRUEBA_CON_HOGARES;
registrarPais(pais);
const MODS = [...MODULOS, futbol];
const t0 = performance.now();
const g = nuevaPartida({ seed: 31, pais: cual === 'grande' ? ID_PAIS_CIUDAD_GRANDE_CON_HOGARES : ID_PAIS_CIUDAD_DE_PRUEBA_CON_HOGARES, deportes: ['atletismo', 'futbol'] }, MODS);
console.log(`Crear: ${((performance.now() - t0) / 1000).toFixed(1)} s`);
const estado = () => g.moduleState<NpcsState>('npcs');
const resumen = (etiqueta: string) => {
  const s = estado();
  const dia = g.time.day;
  const adultos = s.npcs.filter(esProgenitorDeHogar).length;
  const hijos = s.npcs.filter((n) => n.hogar && !esProgenitorDeHogar(n));
  const pequenos = hijos.filter((n) => !n.colegio && n.role === 'vecino' && (edadNpc(n, dia) ?? 0) < 8).length;
  const archivados = s.npcs.filter((n) => n.tags.includes('archivado')).length;
  console.log(`${etiqueta}: ${s.npcs.length} personas; hogares ${Object.keys(s.hogares ?? {}).length}; adultos de hogar ${adultos}; hijos ${hijos.length} (pequeños sin colegio: ${pequenos}); archivados ${archivados}; estado ${(JSON.stringify(g.serialize()).length / 1024 / 1024).toFixed(1)} MB`);
};
resumen('Al crear');
let curso = 0;
const limite = g.time.day + cursos * 365 + 40;
let ultimo = JSON.stringify(Object.keys(estado().familiasPorCurso ?? {}));
while (g.time.day < limite && curso < cursos) {
  g.perform('gen.descansar');
  const claves = Object.keys(estado().familiasPorCurso ?? {});
  if (JSON.stringify(claves) !== ultimo) {
    ultimo = JSON.stringify(claves);
    curso++;
    const f = estado().familiasPorCurso![Number(claves[claves.length - 1])];
    console.log(`Curso ${curso}: entran ${f.hermanos + f.mudanzas} (de hermanos pequeños ${f.hermanos}, de mudanzas ${f.mudanzas}); familias archivadas ${f.archivadas}, borradas ${f.borradas}`);
    resumen(`  tras el curso ${curso}`);
  }
}
