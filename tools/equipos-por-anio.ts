/**
 * Si los equipos siguen las normas por año (`CIUDAD_Y_LIGAS.md` §5) igual en los colegios que en los clubes de fuera (solo mide, no cambia el juego), con la ciudad grande: por categoría y número de equipos del club,
 * cuántos de primer año y de segundo hay en cada equipo (A, B, C, D), para los colegios y para los clubes de fuera, al crear y tras cada verano. Y el equipo (letra) en que queda el personaje si se apunta al club
 * del colegio. `npm run equipos-por-anio -- [semillas] [veranos]`.
 */
import { PAIS_CIUDAD_GRANDE, SERVICES, registrarPais, type NpcDirectory } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { categoriasDelEquipo, edadDeJuego, type NpcsState } from '@ds/mod-npcs';
import { hacer, posible } from '../tests/ayudas';

registrarPais(PAIS_CIUDAD_GRANDE);
const SEMILLAS = (process.argv[2] ?? '31,33,35,36').split(',').map(Number);
const VERANOS = Number(process.argv[3] ?? 1);
const f = (x: number, d = 1): string => x.toFixed(d);
type Cuenta = { p1: number; p2: number };
// [colegio|fuera, categoría, equipos][letra] → jugadores de primer y de segundo año (suma sobre semillas y momentos).
const acum = new Map<string, Map<string, Cuenta>>();
const contados = new Map<string, Set<string>>();

for (const seed of SEMILLAS) {
  const g = nuevaPartida({ seed, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  advanceToWeek(g, 'gen.descansar', 0, 2, 9);
  if (posible(g, 'futbol.apuntarse_colegio')) hacer(g, 'futbol.apuntarse_colegio');
  const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
  for (let v = 0; v <= VERANOS; v++) {
    if (v > 0) advanceToWeek(g, 'gen.descansar', 52 * v + 2, 2, 15);
    const s = g.moduleState<NpcsState>('npcs') as NpcsState;
    const dia = v === 0 ? 0 : (g.time.week - g.time.schoolWeek) * 7;
    const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
    for (const e of pob.equipos.filter((x) => x.plantillaPorCategoria)) {
      for (const cx of categoriasDelEquipo(pob, e)) {
        const k = Math.max(1, e.equiposPorCategoria?.[cx.id] ?? 1);
        const primero = Math.min(...cx.edades);
        const miembros = s.npcs.filter((n) => n.deporte === 'futbol' && n.equipo === e.club && cx.edades.includes(edadDeJuego(n, dia) ?? -1));
        if (!miembros.length) continue;
        const clave = `${e.colegio === undefined ? 'fuera  ' : 'colegio'} · ${cx.id === 'juvenil' ? 'juvenil' : 'resto  '} · ${k} equipo${k > 1 ? 's' : ' '}`;
        const m = acum.get(clave) ?? acum.set(clave, new Map()).get(clave)!;
        for (const n of miembros) {
          const c = m.get(n.letra?.futbol ?? '-') ?? m.set(n.letra?.futbol ?? '-', { p1: 0, p2: 0 }).get(n.letra?.futbol ?? '-')!;
          if ((edadDeJuego(n, dia) ?? 0) === primero) c.p1++; else c.p2++;
        }
        (contados.get(clave) ?? contados.set(clave, new Set()).get(clave)!).add(`${seed}|${v}|${e.club}|${cx.id}`);
      }
    }
    const yo = dir.equipoDelPersonaje?.('futbol');
    const cuando = v === 0 ? 'al crear' : `verano ${v}`;
    if (yo) {
      const cx = pob.categorias!.find((c) => c.id === yo.categoria)!;
      const plantilla = dir.plantillaDelEquipo!('futbol', yo.club, yo.categoria, yo.letra);
      const k = pob.equipos.find((e) => e.club === yo.club)?.equiposPorCategoria?.[yo.categoria] ?? 1;
      console.log(`semilla ${seed} ${cuando}: el personaje entra en ${yo.club} ${yo.categoria} ${yo.letra} (el club tiene ${k} equipo${k > 1 ? 's' : ''} en la categoría; ${plantilla.length} en la plantilla; categoría de ${cx.edadMin} a ${cx.edadMax} años)`);
    } else console.log(`semilla ${seed} ${cuando}: el personaje no tiene equipo`);
  }
}
console.log('\nJugadores por equipo (media por club-categoría; primer año / segundo año):');
for (const [clave, m] of [...acum].sort()) {
  const n = contados.get(clave)!.size;
  console.log(`${clave} (${n} club-categorías): ` + [...m].sort().map(([l, c]) => `${l} ${f(c.p1 / n)}/${f(c.p2 / n)}`).join('  '));
}
