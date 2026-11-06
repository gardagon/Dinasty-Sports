/**
 * Cuántos equipos hay por club y categoría y de qué tamaño, al crear la partida y tras cada verano (`CIUDAD_Y_LIGAS.md` §5 y §8), con la población de ahora y con la de ×2 y ×5.
 * `npm run equipos -- [semillas] [veranos] [factores...]` (por defecto 3 semillas, 3 veranos, ×1, ×2 y ×5). Por momento: cuántos clubes y colegios tienen equipo por categoría, el tamaño de los
 * equipos, cuántos interesados se quedan sin equipo, cuántos han dejado el deporte para siempre (por curso) (el cambio de curso se mide con `npm run fluidez`, que separa la semana del cambio).
 */
import { CIUDAD_ACTUAL, PAIS_ESPANA, registrarPais, type CiudadDef, type PaisDef } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { edadNpc, type NpcsState } from '@ds/mod-npcs';

const SEMILLAS = Number(process.argv[2] ?? 3);
const VERANOS = Number(process.argv[3] ?? 3);
const FACTORES = process.argv.length > 4 ? process.argv.slice(4).map(Number) : [1, 2, 5];
const CATEGORIAS = ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'];
const media = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const f = (x: number): string => x.toFixed(1);

const ciudadPor = (k: number): CiudadDef => ({ ...CIUDAD_ACTUAL, colegiosDeFuera: CIUDAD_ACTUAL.colegiosDeFuera * k, aulasPorCurso: CIUDAD_ACTUAL.aulasPorCurso * k, vecinos: CIUDAD_ACTUAL.vecinos * k });
const paisPor = (k: number): PaisDef => {
  const id = `espana_x${k}`;
  const copia = structuredClone(PAIS_ESPANA) as PaisDef;
  return { ...copia, id, calendario: { ...copia.calendario, id }, ciudad: ciudadPor(k) };
};

interface Momento {
  clubesConEquipo: number[]; // de las (clubes de la zona × categorías)
  clubesTotal: number[];
  colegiosConEquipo: number[]; // de las (colegios con club × categorías)
  colegiosTotal: number[];
  propioConEquipo: number[]; // el colegio del personaje, de sus 5 categorías
  equiposPorEquipoMin: number[];
  jugadoresPorEquipo: number[];
  sinEquipo: number[];
  dejados: number[]; // acumulados (han dejado el fútbol para siempre)
  apartados: number[];
  futbolistas: number[];
  cambioDeCurso: number[]; // segundos
}
const vacio = (): Momento => ({ clubesConEquipo: [], clubesTotal: [], colegiosConEquipo: [], colegiosTotal: [], propioConEquipo: [], equiposPorEquipoMin: [], jugadoresPorEquipo: [], sinEquipo: [], dejados: [], apartados: [], futbolistas: [], cambioDeCurso: [] });

for (const k of FACTORES) {
  const pais = paisPor(k);
  registrarPais(pais);
  const momentos: Momento[] = Array.from({ length: VERANOS + 1 }, vacio);
  for (let seed = 1; seed <= SEMILLAS; seed++) {
    const g = nuevaPartida({ seed, pais: k === 1 ? undefined : pais.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    for (let v = 0; v <= VERANOS; v++) {
      let segundos = 0;
      if (v > 0) {
        const t0 = performance.now();
        advanceToWeek(g, 'gen.descansar', 52 * v + 2, 2, 15);
        segundos = (performance.now() - t0) / 1000;
      }
      const s = g.moduleState<NpcsState>('npcs') as NpcsState;
      const dia = v === 0 ? 0 : (g.time.week - g.time.schoolWeek) * 7;
      const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
      const m = momentos[v];
      let clubes = 0, clubesT = 0, colegios = 0, colegiosT = 0, propio = 0;
      for (const e of pob.equipos.filter((x) => x.plantillaPorCategoria)) {
        for (const c of pob.categorias!.filter((x) => CATEGORIAS.includes(x.id))) {
          const n = s.npcs.filter((x) => x.deporte === 'futbol' && x.equipo === e.club && (edadNpc(x, dia) ?? -1) >= c.edadMin && (edadNpc(x, dia) ?? -1) <= c.edadMax).length;
          const kk = e.equiposPorCategoria?.[c.id] ?? 1;
          if (e.colegio !== undefined) { colegiosT++; if (n >= 14) { colegios++; if (e.colegio === 'propio') propio++; } } else { clubesT++; if (n >= 14) clubes++; }
          if (n > 0) { m.equiposPorEquipoMin.push(n / kk); m.jugadoresPorEquipo.push(n / kk); }
        }
      }
      m.clubesConEquipo.push(clubes); m.clubesTotal.push(clubesT); m.colegiosConEquipo.push(colegios); m.colegiosTotal.push(colegiosT); m.propioConEquipo.push(propio);
      const interesados = (x: { rasgos?: { intereses: Record<string, number> } }) => Math.max(x.rasgos?.intereses.futbol ?? 0, x.rasgos?.intereses.deporte ?? 0) > 0;
      const enCategorias = (x: { nacimiento?: number } & Parameters<typeof edadNpc>[0]) => CATEGORIAS.some((cat) => { const c = pob.categorias!.find((y) => y.id === cat)!; const ed = edadNpc(x, dia) ?? -1; return ed >= c.edadMin && ed <= c.edadMax; });
      const libres = s.npcs.filter((x) => x.genetica && x.deporte === undefined && interesados(x) && enCategorias(x));
      m.sinEquipo.push(libres.filter((x) => !x.dejado?.includes('futbol')).length);
      m.apartados.push(libres.filter((x) => x.apartado?.includes('futbol') && !x.dejado?.includes('futbol')).length);
      // Los que lo dejan para siempre por no conseguir equipo en dos plazos seguidos, en este curso (`dejanSinClub`), sumados a los de cursos anteriores.
      m.dejados.push(Object.values(s.dejanSinClub ?? {}).reduce((a, b) => a + b, 0));
      m.futbolistas.push(s.npcs.filter((x) => x.deporte === 'futbol').length);
      m.cambioDeCurso.push(segundos);
    }
  }
  const clubes = momentos[0].clubesTotal[0] / CATEGORIAS.length;
  console.log(`\n×${k} (${SEMILLAS} semillas; ${f(clubes)} clubes de la zona; colegios con club: ${f(momentos[0].colegiosTotal[0] / CATEGORIAS.length)})`);
  console.log('| Momento | Clubes con equipo (de sus categorías) | Colegios con equipo (el del personaje, de 5) | Jugadores por equipo (media) | Futbolistas | Interesados sin equipo (apartados) | Dejan el fútbol por no tener equipo en dos plazos (acum.) |');
  console.log('|---|---|---|---|---|---|---|');
  momentos.forEach((m, v) => {
    console.log(`| ${v === 0 ? 'al crear' : `tras el verano ${v}`} | ${f(media(m.clubesConEquipo))} de ${f(media(m.clubesTotal))} | ${f(media(m.colegiosConEquipo))} de ${f(media(m.colegiosTotal))} (${f(media(m.propioConEquipo))}) | ${f(media(m.jugadoresPorEquipo))} | ${f(media(m.futbolistas))} | ${f(media(m.sinEquipo))} (${f(media(m.apartados))}) | ${f(media(m.dejados))} |`);
  });
}
