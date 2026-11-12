/**
 * ¿Empieza el personaje «del montón» (`VISION.md`, principio 6)? Con la ciudad grande y varias semillas, al crear la partida: su valor en su mejor puesto y la media de sus habilidades de fútbol frente a los niños de fútbol de su año
 * (percentil), y —ya en el club— su puesto dentro de su equipo. `npm run personaje-del-monton -- [semillas]`.
 */
import { PAIS_CIUDAD_GRANDE, SERVICES, registrarPais, type IdentityService, type NpcDirectory } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol, rendimientoPorPuestos, type FutbolState } from '@ds/mod-futbol';
import { edadDeJuego, type NpcsState } from '@ds/mod-npcs';
import { hacer, posible } from '../tests/ayudas';

registrarPais(PAIS_CIUDAD_GRANDE);
const semillas = (process.argv[2] ?? '31,32,33,34,35,36,37,38,39,40').split(',').map(Number);
const f = (x: number, d = 1): string => x.toFixed(d);
const media = (v: number[]): number => v.reduce((a, b) => a + b, 0) / v.length;
const percentil = (valor: number, otros: number[]): number => (100 * otros.filter((x) => x < valor).length) / otros.length;
const filas: { seed: number; edad: number; mejor: number; pMejor: number; media: number; pMedia: number; mediaPares: number; mejorPares: number; rango?: string }[] = [];
for (const seed of semillas) {
  const g = nuevaPartida({ seed, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  const s = g.moduleState<NpcsState>('npcs') as NpcsState;
  const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
  const edad = g.service<IdentityService>(SERVICES.identidad)!.view().seasonAge;
  const lector = { stat: (id: string) => g.stat(id), norm: (id: string) => g.stat(id) / 100 };
  const yo = rendimientoPorPuestos(lector);
  const mejor = Math.max(...Object.values(yo));
  const ids = pob.rutina!.stats.map((x) => x.id);
  const habilidades = media(ids.map((id) => g.stat(id)));
  const pares = s.npcs.filter((n) => n.deporte === 'futbol' && n.hab?.futbol && (edadDeJuego(n, 0) ?? -1) === edad && n.vp?.futbol?.puestos);
  const mejoresPares = pares.map((n) => Math.max(...Object.values(n.vp!.futbol!.puestos!)));
  const mediasPares = pares.map((n) => media(n.hab!.futbol.v));
  const fila: (typeof filas)[number] = { seed, edad, mejor, pMejor: percentil(mejor, mejoresPares), media: habilidades, pMedia: percentil(habilidades, mediasPares), mediaPares: media(mediasPares), mejorPares: media(mejoresPares) };
  // Su puesto en el equipo (ya apuntado).
  advanceToWeek(g, 'gen.descansar', 0, 2, 9);
  if (posible(g, 'futbol.apuntarse_colegio')) hacer(g, 'futbol.apuntarse_colegio');
  const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
  const e = dir.equipoDelPersonaje!('futbol');
  const puesto = (g.moduleState<NpcsState>('npcs') as NpcsState).puestoDelPersonaje?.futbol;
  if (e && puesto) {
    const plantilla = dir.plantillaDelEquipo!('futbol', e.club, e.categoria, e.letra);
    const miValor = rendimientoPorPuestos(lector)[puesto];
    const mejores = plantilla.filter((j) => j.valor > miValor).length;
    fila.rango = `${mejores + 1}.º de ${plantilla.length + 1} (${e.club} ${e.categoria} ${e.letra}, puesto ${puesto})`;
  }
  filas.push(fila);
  const estado = g.moduleState<FutbolState>('futbol') as FutbolState;
  void estado;
  console.log(`Semilla ${seed} (${edad} años): mejor puesto ${f(mejor)} (pares ${f(fila.mejorPares)}; percentil ${f(fila.pMejor, 0)}); media de habilidades ${f(habilidades)} (pares ${f(fila.mediaPares)}; percentil ${f(fila.pMedia, 0)}; ${pares.length} pares); equipo: ${fila.rango ?? 'sin equipo'}`);
}
console.log(`\nMedia de los percentiles: mejor puesto ${f(media(filas.map((x) => x.pMejor)), 0)}, habilidades ${f(media(filas.map((x) => x.pMedia)), 0)}. En su equipo es el último en ${filas.filter((x) => x.rango && /^(\d+)\.º de \1 /.test(x.rango)).length} de ${filas.filter((x) => x.rango).length}.`);
