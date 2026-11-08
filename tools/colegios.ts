/**
 * Por qué pierden sus equipos los colegios (`CIUDAD_Y_LIGAS.md` §5), con la ciudad grande. `npm run colegios -- [semillas] [veranos]`. Por colegio, categoría y verano mide:
 * - lo que pierde cada equipo (suben de categoría, se van a otro club —y por qué: probaron y los cogieron, otro mejor les quitó la plaza, cerró su equipo—, lo dejan, quedan apartados) y lo que le entra
 *   (de la categoría de abajo, de otro club, de la bolsa de primer año o de mayores);
 * - los equipos que se cierran por quedar bajo el mínimo y con cuántos jugadores se quedaron, y qué pasa al año siguiente en la categoría de arriba;
 * - quién va a probar a otro club, a quién lo cogen y si alguien se queda sin equipo por haber ido a probar (debe salir 0);
 * - los equipos (A a D) descompensados por puestos, **nuevos** (el club abrió ese equipo este verano) y **heredados** (ya existían: los jugadores llegan con el cambio de categoría); el cupo es el que usa
 *   el juego para repartir cada equipo (`cuposPorGrupo` de su tamaño); y cuántos puestos se rechazan.
 */
import { PAIS_CIUDAD_GRANDE, cuposPorGrupo, grupoDePuesto, registrarPais } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { DIAGNOSTICO, edadNpc, equiposDelClub, valoracionDe, type NpcsState } from '@ds/mod-npcs';

const SEMILLAS = Number(process.argv[2] ?? 3);
const VERANOS = Number(process.argv[3] ?? 3);
const CATEGORIAS = ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'];
registrarPais(PAIS_CIUDAD_GRANDE);

const f1 = (x: number): string => x.toFixed(1);
const media = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const suma = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

interface Ficha { dep?: string; equipo?: string; edad: number; dejado: boolean; apartado: boolean }
interface Fila {
  seed: number; verano: number; club: string; cat: string; colegio: boolean;
  antes: number; quedan: number; sube: number; otroClub: number; deja: number; apartado: number; retirado: number;
  otroPorProbar: number; otroPorMerito: number; otroPorCierre: number; otroPorOtros: number;
  deAbajo: number; deOtroClub: number; bolsaPrimero: number; bolsaMayores: number; despues: number; cerrado: boolean;
}
interface Descomp { total: number; ok: number; mas1: number; mas2: number; mas3: number; vacios: number }
const nuevoDescomp = (): Descomp => ({ total: 0, ok: 0, mas1: 0, mas2: 0, mas3: 0, vacios: 0 });

const filas: Fila[] = [];
const pendientes: { seed: number; v: number; club: string; cat: string }[] = [];
const cierres: { seed: number; verano: number; club: string; cat: string; jugadores: number; equipos: number; montables: number }[] = [];
const siguiente: { cerrado: boolean; tamano: number; suben: number }[] = [];
const descomp = { 'colegios · nuevos': nuevoDescomp(), 'colegios · heredados': nuevoDescomp(), 'clubes · nuevos': nuevoDescomp(), 'clubes · heredados': nuevoDescomp() };
const probar = { intentos: 0, entran: 0, sinEquipoPorProbar: 0, porVerano: [] as number[][] };
const ofertas = { total: 0, rechazadas: 0, suyas: 0, suyasRechazadas: 0, ultima: 0, ultimaRechazadas: 0 };
const cambios = { colegio: { equipos: 0, voluntarios: 0 }, club: { equipos: 0, voluntarios: 0 } };

for (let seed = 1; seed <= SEMILLAS; seed++) {
  const g = nuevaPartida({ seed, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  const tomar = (verano: number) => {
    const s = g.moduleState<NpcsState>('npcs') as NpcsState;
    const dia = verano === 0 ? 0 : (g.time.week - g.time.schoolWeek) * 7;
    const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
    const fichas = new Map<string, Ficha>();
    for (const n of s.npcs) if (n.genetica) fichas.set(n.id, { dep: n.deporte, equipo: n.equipo, edad: edadNpc(n, dia) ?? -1, dejado: !!n.dejado?.includes('futbol'), apartado: !!n.apartado?.includes('futbol') });
    return { s, pob, fichas, dia };
  };
  const catDe = (pob: ReturnType<typeof tomar>['pob'], edad: number): string | undefined => pob.categorias!.find((c) => edad >= c.edadMin && edad <= c.edadMax)?.id;
  /** Cuántos equipos (de 0 a 4) tenía un club en una categoría según sus jugadores: los de su club y categoría entre el mínimo. */
  const equiposQueHabia = (t: ReturnType<typeof tomar>, club: string, cat: string): number => {
    const e = t.pob.equipos.find((x) => x.club === club)!;
    const jugadores = [...t.fichas.values()].filter((x) => x.dep === 'futbol' && x.equipo === club && catDe(t.pob, x.edad) === cat).length;
    return Math.min(e.equiposPorCategoria?.[cat] ?? 1, Math.floor(jugadores / (e.plantillaPorCategoria?.min ?? 14)));
  };
  let previa = tomar(0);
  for (let v = 1; v <= VERANOS; v++) {
    const cerrados: typeof cierres = [];
    const probados = new Map<string, { entra: boolean; desde: string; hacia: string }>();
    const desplazados = new Map<string, string>();
    DIAGNOSTICO.alCerrar = (d) => cerrados.push({ seed, verano: v, club: d.club, cat: d.categoria, jugadores: d.jugadores, equipos: d.equipos, montables: d.montables });
    DIAGNOSTICO.alProbar = (d) => probados.set(d.id, { entra: d.entra, desde: d.desde, hacia: d.hacia });
    DIAGNOSTICO.alDesplazar = (d) => desplazados.set(d.id, d.motivo);
    const vistos = new Set<string>();
    DIAGNOSTICO.alOfertar = (d) => {
      // Cada niño cuenta una vez por club (un mismo niño puede mirar varias veces el mismo club al buscar equipo).
      ofertas.total++;
      if (!d.aceptada) ofertas.rechazadas++;
      if (d.esSuyo) { ofertas.suyas++; if (!d.aceptada) ofertas.suyasRechazadas++; }
      if (d.ultimaOpcion) { ofertas.ultima++; if (!d.aceptada) ofertas.ultimaRechazadas++; }
      vistos.add(d.id);
    };
    advanceToWeek(g, 'gen.descansar', 52 * v + 2, 2, 15);
    DIAGNOSTICO.alCerrar = DIAGNOSTICO.alProbar = DIAGNOSTICO.alDesplazar = DIAGNOSTICO.alOfertar = undefined;
    cierres.push(...cerrados);
    const ahora = tomar(v);
    const catMin = (id: string): number => ahora.pob.categorias!.find((c) => c.id === id)!.edadMin;
    // Quién fue a probar y si se quedó sin equipo por ello (los que probaron, no los cogieron y no tienen equipo, sin que otro mejor les quitara la plaza ni cerrara su equipo).
    let intentos = 0, sin = 0;
    for (const [id, p] of probados) {
      intentos++;
      probar.intentos++;
      if (p.entra) probar.entran++;
      const x = ahora.fichas.get(id);
      if (!p.entra && x && x.dep !== 'futbol' && !desplazados.has(id)) { sin++; probar.sinEquipoPorProbar++; }
    }
    probar.porVerano.push([intentos, [...probados.values()].filter((p) => p.entra).length, sin]);
    const colegios = ahora.pob.equipos.filter((e) => e.plantillaPorCategoria && e.colegio !== undefined);
    for (const e of colegios) {
      for (const c of CATEGORIAS) {
        const antes = [...previa.fichas].filter(([, x]) => x.dep === 'futbol' && x.equipo === e.club && catDe(previa.pob, x.edad) === c);
        const despues = [...ahora.fichas].filter(([, x]) => x.dep === 'futbol' && x.equipo === e.club && catDe(ahora.pob, x.edad) === c);
        const f: Fila = { seed, verano: v, club: e.club, cat: c, colegio: true, antes: antes.length, quedan: 0, sube: 0, otroClub: 0, deja: 0, apartado: 0, retirado: 0, otroPorProbar: 0, otroPorMerito: 0, otroPorCierre: 0, otroPorOtros: 0, deAbajo: 0, deOtroClub: 0, bolsaPrimero: 0, bolsaMayores: 0, despues: despues.length, cerrado: antes.length >= 14 && despues.length === 0 };
        for (const [id] of antes) {
          const x = ahora.fichas.get(id);
          if (!x) { f.retirado++; continue; }
          if (x.dep === 'futbol' && x.equipo === e.club) { if (catDe(ahora.pob, x.edad) === c) f.quedan++; else if (catDe(ahora.pob, x.edad)) f.sube++; else f.retirado++; }
          else if (x.dep === 'futbol') {
            f.otroClub++;
            if (probados.get(id)?.entra) f.otroPorProbar++;
            else if (desplazados.get(id) === 'merito') f.otroPorMerito++;
            else if (desplazados.get(id) === 'cierre') f.otroPorCierre++;
            else f.otroPorOtros++;
          } else if (x.dejado) f.deja++;
          else if (x.apartado) f.apartado++;
          else f.retirado++;
        }
        for (const [id, x] of despues) {
          if (antes.some(([i]) => i === id)) continue;
          const p = previa.fichas.get(id);
          if (p?.dep === 'futbol' && p.equipo === e.club) f.deAbajo++;
          else if (p?.dep === 'futbol') f.deOtroClub++;
          else if (x.edad === catMin(c)) f.bolsaPrimero++;
          else f.bolsaMayores++;
        }
        filas.push(f);
      }
    }
    // Los cambios voluntarios de club: cuántos de cada equipo (club y categoría con equipo antes) probaron y los cogieron en otro.
    for (const e of ahora.pob.equipos.filter((x) => x.plantillaPorCategoria)) {
      for (const c of CATEGORIAS) {
        const antes = [...previa.fichas].filter(([, x]) => x.dep === 'futbol' && x.equipo === e.club && catDe(previa.pob, x.edad) === c);
        if (antes.length < 14) continue;
        const k = e.colegio !== undefined ? cambios.colegio : cambios.club;
        k.equipos += equiposQueHabia(previa, e.club, c);
        k.voluntarios += antes.filter(([id]) => probados.get(id)?.entra).length;
      }
    }
    // Equipos que se cierran: la categoría de arriba al verano siguiente (de los colegios).
    for (const d of cerrados.filter((x) => x.club.startsWith('colegio'))) pendientes.push({ seed, v, club: d.club, cat: d.cat });
    // Descompensados por puestos, equipo a equipo (A a D) con los equipos que reparte el juego y el cupo de cada uno; nuevos si el club no tenía ese equipo el curso pasado.
    const val = valoracionDe(new Map());
    const porId = new Map(ahora.s.npcs.map((n) => [n.id, n]));
    for (const e of ahora.pob.equipos.filter((x) => x.plantillaPorCategoria)) {
      for (const c of CATEGORIAS) {
        const def = ahora.pob.categorias!.find((x) => x.id === c)!;
        const edades = Array.from({ length: def.edadMax - def.edadMin + 1 }, (_, i) => def.edadMin + i);
        const k = e.equiposPorCategoria?.[c] ?? 1;
        const { equipos, miembros } = equiposDelClub(porId, ahora.pob, e, { id: c, edades }, ahora.dia, val);
        if (!miembros.length) continue;
        const habia = equiposQueHabia(previa, e.club, c);
        for (const [i, letra] of (['A', 'B', 'C', 'D'] as const).slice(0, k).entries()) {
          const ids = equipos[letra];
          if (ids.length < (e.plantillaPorCategoria?.min ?? 14)) continue;
          const cupos = cuposPorGrupo(ahora.pob.puestos!, ids.length);
          const cuenta: Record<string, number> = {};
          for (const id of ids) { const gr = grupoDePuesto(ahora.pob.puestos!, miembros.find((x) => x.n.id === id)!.m.puesto) ?? '?'; cuenta[gr] = (cuenta[gr] ?? 0) + 1; }
          const desv = Math.max(...ahora.pob.puestos!.reparto.map((r) => Math.abs((cuenta[r.grupo] ?? 0) - (cupos[r.grupo] ?? 0))));
          const vacio = ahora.pob.puestos!.reparto.some((r) => (cupos[r.grupo] ?? 0) > 0 && (cuenta[r.grupo] ?? 0) === 0);
          const t = descomp[`${e.colegio !== undefined ? 'colegios' : 'clubes'} · ${i >= habia ? 'nuevos' : 'heredados'}` as keyof typeof descomp];
          t.total++;
          if (vacio) t.vacios++;
          if (desv <= 0) t.ok++; else if (desv === 1) t.mas1++; else if (desv === 2) t.mas2++; else t.mas3++;
        }
      }
    }
    previa = ahora;
  }
  for (const p of pendientes.filter((x) => x.seed === seed)) {
    const arriba = CATEGORIAS[CATEGORIAS.indexOf(p.cat) + 1];
    const fila = filas.find((r) => r.seed === seed && r.verano === p.v + 1 && r.club === p.club && r.cat === arriba);
    if (fila) siguiente.push({ cerrado: true, tamano: fila.despues, suben: fila.deAbajo });
  }
  for (const r of filas.filter((x) => x.seed === seed && x.verano > 1)) {
    const abajo = CATEGORIAS[CATEGORIAS.indexOf(r.cat) - 1];
    const previo = filas.find((x) => x.seed === seed && x.verano === r.verano - 1 && x.club === r.club && x.cat === abajo);
    if (previo && !previo.cerrado && previo.despues >= 14) siguiente.push({ cerrado: false, tamano: r.despues, suben: r.deAbajo });
  }
}
void media;

const agrupar = (xs: Fila[], clave: (r: Fila) => string): Map<string, Fila[]> => {
  const m = new Map<string, Fila[]>();
  for (const r of xs) (m.get(clave(r)) ?? m.set(clave(r), []).get(clave(r))!).push(r);
  return m;
};
const cab = '| | Antes | Quedan | Suben de categoría | A otro club | (de ellos: probaron | les quitó la plaza otro | cerró su equipo | otros) | Lo dejan | Apartados | Retirados | Entran de abajo | Entran de otro club | Entran de la bolsa (1.er año) | Entran de la bolsa (mayores) | Después | Cerrados (de los que había con 14+) |';
const lin = (nombre: string, rs: Fila[]): string => {
  const n = rs.length || 1;
  const m = (g: (r: Fila) => number): string => f1(suma(rs.map(g)) / n);
  return `| ${nombre} | ${m((r) => r.antes)} | ${m((r) => r.quedan)} | ${m((r) => r.sube)} | ${m((r) => r.otroClub)} | ${m((r) => r.otroPorProbar)} | ${m((r) => r.otroPorMerito)} | ${m((r) => r.otroPorCierre)} | ${m((r) => r.otroPorOtros)} | ${m((r) => r.deja)} | ${m((r) => r.apartado)} | ${m((r) => r.retirado)} | ${m((r) => r.deAbajo)} | ${m((r) => r.deOtroClub)} | ${m((r) => r.bolsaPrimero)} | ${m((r) => r.bolsaMayores)} | ${m((r) => r.despues)} | ${rs.filter((r) => r.cerrado).length} de ${rs.filter((r) => r.antes >= 14).length} |`;
};
console.log(`Colegios con la ciudad grande, ${SEMILLAS} semillas, ${VERANOS} veranos: jugadores por equipo de colegio (media por equipo; los equipos sin jugadores antes cuentan 0)\n`);
for (const [titulo, clave] of [['Por categoría y verano', (r: Fila) => `verano ${r.verano} · ${r.cat}`], ['Por colegio y verano', (r: Fila) => `verano ${r.verano} · ${r.club}`]] as const) {
  console.log(`### ${titulo}\n\n${cab}\n|${'---|'.repeat(18)}`);
  for (const [k, rs] of [...agrupar(filas, clave)].sort((a, b) => (a[0] < b[0] ? -1 : 1))) console.log(lin(k, rs));
  console.log('');
}
console.log('### Colegios con equipo (de 5 por semilla) por categoría y verano (14 jugadores o más)\n');
console.log(`| | ${CATEGORIAS.join(' | ')} |\n|${'---|'.repeat(CATEGORIAS.length + 1)}`);
for (let v = 1; v <= VERANOS; v++) console.log(`| tras el verano ${v} | ${CATEGORIAS.map((c) => f1(suma(filas.filter((r) => r.verano === v && r.cat === c && r.despues >= 14).map(() => 1)) / SEMILLAS)).join(' | ')} |`);
console.log('\n### Equipos que se cierran por quedar bajo 14 (con cuántos se quedaron)\n');
const tam = new Map<number, number>();
const deColegio = cierres.filter((x) => x.club.startsWith('colegio'));
for (const c of deColegio) tam.set(c.jugadores, (tam.get(c.jugadores) ?? 0) + 1);
console.log(`Cierres de colegio: ${deColegio.length} (de ${cierres.length} cierres en total, ${cierres.length - deColegio.length} de clubes). Con N jugadores: ${[...tam].sort((a, b) => b[0] - a[0]).map(([n, c]) => `${n}: ${c}`).join(' · ')}`);
console.log(`Al cerrar: ${deColegio.filter((c) => c.montables === 0).length} se cierran enteros (menos de 14), ${deColegio.filter((c) => c.montables > 0).length} pierden solo un equipo de varios.\n`);
console.log('### La categoría de arriba al año siguiente de un equipo que se cerró (colegios)\n');
const cer = siguiente.filter((x) => x.cerrado), noc = siguiente.filter((x) => !x.cerrado);
console.log(`Tras un cierre (${cer.length} casos): la categoría de arriba tiene ${f1(media(cer.map((x) => x.tamano)))} jugadores, de los que ${f1(media(cer.map((x) => x.suben)))} suben de abajo, y hay equipo (14+) en ${cer.filter((x) => x.tamano >= 14).length} de ${cer.length}.`);
console.log(`Sin cierre abajo (${noc.length} casos): ${f1(media(noc.map((x) => x.tamano)))} jugadores, ${f1(media(noc.map((x) => x.suben)))} suben de abajo, y hay equipo en ${noc.filter((x) => x.tamano >= 14).length} de ${noc.length}.\n`);
console.log('### Probar fuera y cambiar de club\n');
console.log(`Fueron a probar a otro club ${probar.intentos} niños (por verano y semilla: ${probar.porVerano.map((p) => `${p[0]} probaron, ${p[1]} cogidos, ${p[2]} sin equipo por probar`).join(' · ')}). Cogidos: ${probar.entran}. **Se quedaron sin equipo por haber ido a probar: ${probar.sinEquipoPorProbar}** (debe ser 0).`);
console.log(`Cambian de club por su cuenta (probaron y los cogieron), por equipo y verano: colegios ${f1((100 * cambios.colegio.voluntarios) / Math.max(1, cambios.colegio.equipos * 16))} % de un equipo de 16 (${cambios.colegio.voluntarios} en ${cambios.colegio.equipos} equipos), clubes ${f1((100 * cambios.club.voluntarios) / Math.max(1, cambios.club.equipos * 16))} % (${cambios.club.voluntarios} en ${cambios.club.equipos} equipos).\n`);
console.log('### Puestos rechazados\n');
console.log(`Ofertas de puesto: ${ofertas.total}; rechazadas ${ofertas.rechazadas} (${f1((100 * ofertas.rechazadas) / Math.max(1, ofertas.total))} %). En su puesto o grupo: ${ofertas.suyas} (rechazadas ${ofertas.suyasRechazadas}). Como última opción (sin equipo): ${ofertas.ultima} (rechazadas ${ofertas.ultimaRechazadas}).\n`);
console.log('### Descompensados por puestos, equipo a equipo (cupo del juego para el tamaño del equipo)\n');
console.log('| | Equipos | Todos los grupos en su cupo | Un grupo con ±1 | Con ±2 | Con ±3 o más | Con algún grupo vacío |\n|---|---|---|---|---|---|---|');
for (const [n, d] of Object.entries(descomp)) console.log(`| ${n} | ${d.total} | ${d.ok} | ${d.mas1} | ${d.mas2} | ${d.mas3} | ${d.vacios} |`);
