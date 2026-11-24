/**
 * Cuántas chicas y chicos hay hoy en los equipos de fútbol de la ciudad grande, y cuántos equipos saldrían si se separaran por sexo (análisis `docs/relevo/personaje-chica.md`).
 * Solo lee la partida recién creada y tras algunos veranos: no cambia el juego. `npx tsx tools/chicas-en-equipos.ts [semillas] [veranos]` (por defecto 3 y 1).
 */
import { PAIS_CIUDAD_GRANDE, registrarPais } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { edadDeJuego, type NpcsState } from '@ds/mod-npcs';

const SEMILLAS = Number(process.argv[2] ?? 3);
const VERANOS = Number(process.argv[3] ?? 1);
const CATEGORIAS = ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'];
const MIN = 14;
const MAX = 18;
const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const f = (x: number, d = 1) => x.toFixed(d);

registrarPais(PAIS_CIUDAD_GRANDE);
const filas: Record<number, Record<string, { chicas: number[]; chicos: number[]; equipos: number[]; clubesConChicas: number[]; interesadasLibres: number[]; interesadosLibres: number[] }>> = {};
const tiempos: number[] = [];
const pesos: number[] = [];
for (let seed = 1; seed <= SEMILLAS; seed++) {
  const t0 = performance.now();
  const g = nuevaPartida({ seed, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  tiempos.push((performance.now() - t0) / 1000);
  for (let v = 0; v <= VERANOS; v++) {
    if (v > 0) advanceToWeek(g, 'gen.descansar', 52 * v + 2, 2, 15);
    const s = g.moduleState<NpcsState>('npcs') as NpcsState;
    if (v === 0) pesos.push(JSON.stringify(s).length / 1e6);
    const dia = v === 0 ? 0 : (g.time.week - g.time.schoolWeek) * 7;
    const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
    for (const cat of CATEGORIAS) {
      const c = pob.categorias!.find((y) => y.id === cat)!;
      const enCat = (x: Parameters<typeof edadDeJuego>[0]) => { const e = edadDeJuego(x, dia) ?? -1; return e >= c.edadMin && e <= c.edadMax; };
      const jug = s.npcs.filter((x) => x.deporte === 'futbol' && x.equipo && enCat(x));
      const chicas = jug.filter((x) => x.gender === 'f').length;
      const equipos = pob.equipos.filter((e) => e.plantillaPorCategoria).reduce((t, e) => t + (jug.some((x) => x.equipo === e.club) ? (e.equiposPorCategoria?.[cat] ?? 1) : 0), 0);
      const clubesConChicas = pob.equipos.filter((e) => e.plantillaPorCategoria && jug.some((x) => x.equipo === e.club && x.gender === 'f')).length;
      const libres = s.npcs.filter((x) => x.genetica && x.deporte === undefined && !x.dejado?.includes('futbol') && enCat(x) && Math.max(x.rasgos?.intereses.futbol ?? 0, x.rasgos?.intereses.deporte ?? 0) > 0);
      const celda = ((filas[v] ??= {})[cat] ??= { chicas: [], chicos: [], equipos: [], clubesConChicas: [], interesadasLibres: [], interesadosLibres: [] });
      celda.chicas.push(chicas); celda.chicos.push(jug.length - chicas); celda.equipos.push(equipos); celda.clubesConChicas.push(clubesConChicas);
      celda.interesadasLibres.push(libres.filter((x) => x.gender === 'f').length); celda.interesadosLibres.push(libres.filter((x) => x.gender === 'm').length);
    }
  }
}
console.log(`Creación de la partida (ciudad grande): ${f(media(tiempos), 2)} s de media; estado de npcs ${f(media(pesos), 2)} MB (JSON).`);
for (const v of Object.keys(filas).map(Number)) {
  console.log(`\n${v === 0 ? 'Al crear' : `Tras el verano ${v}`} (media de ${SEMILLAS} semillas). Equipos hoy, jugadores por sexo y equipos que saldrían separando (plantilla ${MIN}–${MAX}):`);
  console.log('| Categoría | Equipos hoy | Chicas | Chicos | % chicas | Equipos de chicas (separando) | Equipos de chicos (separando) | Clubes con alguna chica | Interesadas sin equipo | Interesados sin equipo |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');
  for (const cat of CATEGORIAS) {
    const c = filas[v][cat];
    const ch = media(c.chicas), co = media(c.chicos);
    const eq = (n: number) => (n < MIN ? 0 : Math.max(1, Math.round(n / ((MIN + MAX) / 2))));
    console.log(`| ${cat} | ${f(media(c.equipos))} | ${f(ch)} | ${f(co)} | ${f((100 * ch) / Math.max(1, ch + co), 0)} % | ${eq(ch)} | ${eq(co)} | ${f(media(c.clubesConChicas))} | ${f(media(c.interesadasLibres))} | ${f(media(c.interesadosLibres))} |`);
  }
}
