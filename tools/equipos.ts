/**
 * Cuántos equipos hay por club y categoría y de qué tamaño, con la población de ahora y con la de ×5 (`CIUDAD_Y_LIGAS.md` §5 y §8).
 * `npm run equipos -- [semillas] [factores...]` (por defecto 3 semillas, ×1 y ×5). Muestra, al crear la partida y tras el primer verano, por club: equipos (k) y jugadores medios por categoría,
 * y en cuántas categorías el equipo del colegio llega a 14.
 */
import { CIUDAD_ACTUAL, PAIS_ESPANA, registrarPais, type CiudadDef, type PaisDef } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { edadNpc, type NpcsState } from '@ds/mod-npcs';

const SEMILLAS = Number(process.argv[2] ?? 3);
const FACTORES = process.argv.length > 3 ? process.argv.slice(3).map(Number) : [1, 5];
const CATEGORIAS = ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'];
const media = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const f = (x: number): string => x.toFixed(1);

const ciudadPor = (k: number): CiudadDef => ({ ...CIUDAD_ACTUAL, colegiosDeFuera: CIUDAD_ACTUAL.colegiosDeFuera * k, aulasPorCurso: CIUDAD_ACTUAL.aulasPorCurso * k, vecinos: CIUDAD_ACTUAL.vecinos * k });
const paisPor = (k: number): PaisDef => {
  const id = `espana_x${k}`;
  const copia = structuredClone(PAIS_ESPANA) as PaisDef;
  return { ...copia, id, calendario: { ...copia.calendario, id }, ciudad: ciudadPor(k) };
};

for (const k of FACTORES) {
  const pais = paisPor(k);
  registrarPais(pais);
  for (const momento of ['al crear', 'tras el primer verano'] as const) {
    const porClub: Record<string, Record<string, { k: number[]; n: number[] }>> = {};
    const colegioConEquipo: number[] = [];
    const sinEquipo: number[] = [];
    const minimos: number[] = [];
    for (let seed = 1; seed <= SEMILLAS; seed++) {
      const g = nuevaPartida({ seed, pais: k === 1 ? undefined : pais.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
      if (momento !== 'al crear') advanceToWeek(g, 'gen.descansar', 52 + 2, 2, 15);
      const s = g.moduleState<NpcsState>('npcs') as NpcsState;
      const dia = momento === 'al crear' ? 0 : (g.time.week - g.time.schoolWeek) * 7;
      const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
      let colegios = 0;
      for (const e of pob.equipos.filter((x) => x.plantillaPorCategoria)) {
        for (const c of pob.categorias!.filter((x) => CATEGORIAS.includes(x.id))) {
          const n = s.npcs.filter((x) => x.deporte === 'futbol' && x.equipo === e.club && (edadNpc(x, dia) ?? -1) >= c.edadMin && (edadNpc(x, dia) ?? -1) <= c.edadMax).length;
          const kk = e.equiposPorCategoria?.[c.id] ?? 1;
          const celda = ((porClub[e.club] ??= {})[c.id] ??= { k: [], n: [] });
          celda.k.push(kk);
          celda.n.push(n);
          if (n > 0) minimos.push(n / kk);
          if (e.colegio !== undefined && n >= 14) colegios++;
        }
      }
      colegioConEquipo.push(colegios);
      sinEquipo.push(s.npcs.filter((x) => x.genetica && x.deporte === undefined && Math.max(x.rasgos?.intereses.futbol ?? 0, x.rasgos?.intereses.deporte ?? 0) > 0 && !x.dejado?.includes('futbol') && CATEGORIAS.some((cat) => { const c = pob.categorias!.find((y) => y.id === cat)!; const ed = edadNpc(x, dia) ?? -1; return ed >= c.edadMin && ed <= c.edadMax; })).length);
    }
    console.log(`\n×${k}, ${momento} (${SEMILLAS} semillas): equipos (k) y jugadores por club y categoría`);
    console.log(`| Club | ${CATEGORIAS.join(' | ')} |`);
    console.log(`|---|${CATEGORIAS.map(() => '---').join('|')}|`);
    for (const [club, cats] of Object.entries(porClub)) console.log(`| ${club} | ${CATEGORIAS.map((c) => `k${f(media(cats[c].k))} · ${f(media(cats[c].n))}`).join(' | ')} |`);
    const colegios = Object.keys(porClub).filter((c) => c.startsWith('colegio')).length;
    console.log(`Categorías con equipo de colegio de 14 o más: ${f(media(colegioConEquipo))} de ${colegios * CATEGORIAS.length} · jugadores por equipo (mínimo medio): ${f(Math.min(...minimos))} · interesados que quedan sin equipo: ${f(media(sinEquipo))}`);
  }
}
