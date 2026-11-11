/**
 * Cuántos campos hacen falta en el complejo municipal (`MOTOR_PARTIDOS.md` §15): con la ciudad grande, las jornadas reales de la liga (todas las categorías) repartidas en franjas y campos, con cadete el sábado y con cadete el
 * domingo, y con el reparto de los datos (cadete el sábado si cabe). `npm run calendario -- [prueba|grande]`.
 */
import { PAIS_CIUDAD_GRANDE, PAIS_CIUDAD_DE_PRUEBA, PAIS_ESPANA, SERVICES, registrarPais, type CalendarioDeJornada, type NpcDirectory } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { camposNecesarios, repartirLosPartidos, type PartidoPorColocar } from '@ds/kit-deporte';
import { DATOS_FUTBOL, futbol, partidosDeLaSemana, type FutbolState } from '@ds/mod-futbol';

const QUE = process.argv[2] ?? 'grande';
const GRANDE = QUE === 'grande';
const PAIS = GRANDE ? PAIS_CIUDAD_GRANDE : QUE === 'actual' ? PAIS_ESPANA : PAIS_CIUDAD_DE_PRUEBA;
registrarPais(PAIS);
const f = (x: number, d = 1): string => x.toFixed(d);

const g = nuevaPartida({ seed: 31, ...(GRANDE ? { pais: PAIS_CIUDAD_GRANDE.id } : {}), deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
advanceToWeek(g, 'gen.descansar', 4, 0, 9);
const estado = () => g.moduleState<FutbolState>('futbol') as FutbolState;
const liga0 = estado().liga!;
const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
const datos = DATOS_FUTBOL.paises.espana;
const cal = datos.competiciones.jornada.calendario!;
const f0 = datos.temporada.liga!.divisiones!;
const equipos = Object.fromEntries(Object.keys(liga0.categorias).map((c) => [c, new Map(dir.equiposDeLaCategoria!('futbol', c).map((e) => [e.id, e]))]));

// Los partidos de cada jornada de la liga (sin el playoff), tal como los da el calendario a doble vuelta de cada grupo.
const jornadas = Math.max(...Object.values(liga0.categorias).map((l) => Math.max(...l.divisiones.map((d) => Math.max(...d.grupos.map((gr) => (gr.equipos.length % 2 === 0 ? gr.equipos.length - 1 : gr.equipos.length) * 2))))));
const porJornada: PartidoPorColocar[][] = [];
for (let j = 0; j < jornadas; j++) {
  porJornada.push(Object.entries(liga0.categorias).flatMap(([cat, l]) => partidosDeLaSemana({ ...l, jornada: j }, f0).map((p) => ({ id: `${cat}|${p.ref}`, categoria: cat, club: p.local.split('|')[0], campoPropio: !!equipos[cat].get(p.local)?.campoPropio }))));
}
const porCat = (ps: PartidoPorColocar[]) => Object.entries(ps.reduce<Record<string, number>>((t, p) => ({ ...t, [p.categoria]: (t[p.categoria] ?? 0) + 1 }), {})).map(([c, n]) => `${c} ${n}`).join(', ');
console.log(`Calendario de partidos (${GRANDE ? 'ciudad grande' : QUE === 'actual' ? 'ciudad de ahora' : 'ciudad de prueba'}): ${Object.values(liga0.categorias).reduce((t, l) => t + l.divisiones.reduce((u, d) => u + d.grupos.reduce((v, gr) => v + gr.equipos.length, 0), 0), 0)} equipos, ${jornadas} jornadas; franjas ${cal.franjas.join(', ')}`);
const j0 = porJornada[0];
console.log(`Una jornada: ${j0.length} partidos (${porCat(j0)}); en campo propio ${j0.filter((p) => p.campoPropio).length}, en el complejo ${j0.filter((p) => !p.campoPropio).length}\n`);

const conCadete = (dia: number): CalendarioDeJornada => ({ franjas: cal.franjas, dias: cal.dias.map((d) => (d.dia === dia ? { ...d, categorias: [...d.categorias, 'cadete'] } : d)) });
const variantes: [string, CalendarioDeJornada][] = [['cadete el sábado', conCadete(5)], ['cadete el domingo', conCadete(6)], ['cadete el sábado si cabe (datos)', cal]];
for (const [nombre, c] of variantes) {
  const necesarios = porJornada.map((ps) => camposNecesarios(ps, c));
  const max = Math.max(...necesarios);
  const sabado = (n: number) => porJornada.map((ps) => { const r = repartirLosPartidos(ps, c, n); return [...r.partidos.values()].filter((h) => h.campo.startsWith('complejo') && h.dia === 5).length; });
  const domingo = (n: number) => porJornada.map((ps) => { const r = repartirLosPartidos(ps, c, n); return [...r.partidos.values()].filter((h) => h.campo.startsWith('complejo') && h.dia === 6).length; });
  const peor = necesarios.indexOf(max);
  console.log(`${nombre}: campos necesarios en el complejo: máximo ${max} (jornada ${peor + 1}), media ${f(necesarios.reduce((a, b) => a + b, 0) / necesarios.length)}; partidos del complejo con ${max} campos: sábado hasta ${Math.max(...sabado(max))}, domingo hasta ${Math.max(...domingo(max))}`);
}
// Con los datos, con el número de campos que tiene la ciudad: ¿todo cabe? ¿cuántas jornadas pasan cadete al domingo?
const ciudadCampos = PAIS.ciudad?.camposDelComplejo;
console.log(`\nCampos del complejo en los datos de la ciudad: ${ciudadCampos ?? 'por defecto (2)'}`);
const n = ciudadCampos ?? 2;
const r = porJornada.map((ps) => repartirLosPartidos(ps, cal, n));
console.log(`Con ${n} campos: jornadas en que todo cabe ${r.filter((x) => !x.sinSitio.length).length} de ${r.length}; cadete juega el sábado en ${r.filter((x) => x.diaDeCategoria.cadete === 5).length} y el domingo en ${r.filter((x) => x.diaDeCategoria.cadete === 6).length}; partidos sin sitio en la peor jornada: ${Math.max(...r.map((x) => x.sinSitio.length))}`);
const propios = porJornada.map((ps) => { const m = new Map<string, number>(); for (const p of ps.filter((x) => x.campoPropio)) m.set(p.club, (m.get(p.club) ?? 0) + 1); return Math.max(0, ...m.values()); });
console.log(`Partidos en casa de un mismo club con campo propio en una jornada: hasta ${Math.max(...propios)} (caben ${cal.franjas.length} por día)`);

// Cuántos de los partidos en casa de un club con campo propio se desbordan al complejo (un club con muchos equipos tiene más partidos en casa que franjas).
const desbordados = porJornada.map((ps) => { const r0 = repartirLosPartidos(ps, cal, 99); return ps.filter((p) => p.campoPropio && r0.partidos.get(p.id)!.campo.startsWith('complejo')).length; });
console.log(`Partidos de campo propio que se juegan en el complejo por falta de franjas: hasta ${Math.max(...desbordados)} por jornada (media ${f(desbordados.reduce((a, b) => a + b, 0) / desbordados.length)})`);
console.log('\nSegún los campos del complejo (con los datos: cadete el sábado si cabe):');
for (const k of [5, 6, 7, 8, 9, 10]) {
  const rs = porJornada.map((ps) => repartirLosPartidos(ps, cal, k));
  console.log(`  ${k} campos: todo cabe en ${rs.filter((x) => !x.sinSitio.length).length} de ${rs.length} jornadas; cadete el sábado en ${rs.filter((x) => x.diaDeCategoria.cadete === 5).length}, el domingo en ${rs.filter((x) => x.diaDeCategoria.cadete === 6).length}`);
}
