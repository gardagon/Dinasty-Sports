/**
 * Por qué pierden sus equipos los colegios (`CIUDAD_Y_LIGAS.md` §5), con la ciudad grande: por colegio, categoría y verano, cuántos jugadores pierde un equipo y por qué (suben de categoría, se van a otro
 * club, lo dejan, quedan apartados), cuántos le entran (de abajo, de la bolsa, de primer año, de otro club), cuántos equipos se cierran por quedar bajo 14 y con cuántos se quedaron, qué pasa al año siguiente
 * en la categoría de arriba de un equipo que se cerró, y cuánto se descompensan por puestos los equipos nuevos y los heredados. `npm run colegios -- [semillas] [veranos]`.
 */
import { PAIS_CIUDAD_GRANDE, cuposPorGrupo, grupoDePuesto, registrarPais } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { DIAGNOSTICO, edadNpc, type NpcsState } from '@ds/mod-npcs';

const SEMILLAS = Number(process.argv[2] ?? 3);
const VERANOS = Number(process.argv[3] ?? 3);
const CATEGORIAS = ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'];
registrarPais(PAIS_CIUDAD_GRANDE);

interface Ficha { dep?: string; equipo?: string; edad: number; dejado: boolean; apartado: boolean }
const f1 = (x: number): string => x.toFixed(1);
const media = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

/** Lo que se cuenta de un equipo de colegio en un verano. */
interface Fila {
  seed: number; verano: number; club: string; cat: string;
  antes: number; // jugadores antes del verano
  quedan: number; sube: number; otroClub: number; deja: number; apartado: number; retirado: number; // salidas
  deAbajo: number; deOtroClub: number; bolsaPrimero: number; bolsaMayores: number; // entradas
  despues: number;
  cerrado: boolean; tamanoAlCerrar?: number;
}

const filas: Fila[] = [];
const cierres: { seed: number; verano: number; club: string; cat: string; jugadores: number; equipos: number; montables: number }[] = [];
const siguiente: { cerrado: boolean; tamano: number; suben: number }[] = [];
const descomp: Record<'nuevo' | 'heredado', { total: number; ok: number; mas1: number; mas2: number; mas3: number; vacios: number }> = { nuevo: { total: 0, ok: 0, mas1: 0, mas2: 0, mas3: 0, vacios: 0 }, heredado: { total: 0, ok: 0, mas1: 0, mas2: 0, mas3: 0, vacios: 0 } };
const descompClubes: typeof descomp = { nuevo: { total: 0, ok: 0, mas1: 0, mas2: 0, mas3: 0, vacios: 0 }, heredado: { total: 0, ok: 0, mas1: 0, mas2: 0, mas3: 0, vacios: 0 } };

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
  let previa = tomar(0);
  for (let v = 1; v <= VERANOS; v++) {
    const cerrados: typeof cierres = [];
    DIAGNOSTICO.alCerrar = (d) => cerrados.push({ seed, verano: v, club: d.club, cat: d.categoria, jugadores: d.jugadores, equipos: d.equipos, montables: d.montables });
    advanceToWeek(g, 'gen.descansar', 52 * v + 2, 2, 15);
    DIAGNOSTICO.alCerrar = undefined;
    cierres.push(...cerrados);
    const ahora = tomar(v);
    const cat = (pob: typeof ahora.pob, edad: number): string | undefined => pob.categorias!.find((c) => edad >= c.edadMin && edad <= c.edadMax)?.id;
    const catMin = (id: string): number => ahora.pob.categorias!.find((c) => c.id === id)!.edadMin;
    const colegios = ahora.pob.equipos.filter((e) => e.plantillaPorCategoria && e.colegio !== undefined);
    for (const e of colegios) {
      for (const c of CATEGORIAS) {
        const antes = [...previa.fichas].filter(([, x]) => x.dep === 'futbol' && x.equipo === e.club && cat(previa.pob, x.edad) === c);
        const despues = [...ahora.fichas].filter(([, x]) => x.dep === 'futbol' && x.equipo === e.club && cat(ahora.pob, x.edad) === c);
        const f: Fila = { seed, verano: v, club: e.club, cat: c, antes: antes.length, quedan: 0, sube: 0, otroClub: 0, deja: 0, apartado: 0, retirado: 0, deAbajo: 0, deOtroClub: 0, bolsaPrimero: 0, bolsaMayores: 0, despues: despues.length, cerrado: antes.length >= 14 && despues.length === 0 };
        for (const [id] of antes) {
          const x = ahora.fichas.get(id);
          if (!x) { f.retirado++; continue; }
          if (x.dep === 'futbol' && x.equipo === e.club) { if (cat(ahora.pob, x.edad) === c) f.quedan++; else if (cat(ahora.pob, x.edad)) f.sube++; else f.retirado++; }
          else if (x.dep === 'futbol') f.otroClub++;
          else if (x.dejado) f.deja++;
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
        const cierre = cerrados.find((d) => d.club === e.club && d.cat === c);
        if (cierre) f.tamanoAlCerrar = cierre.jugadores;
        filas.push(f);
      }
    }
    // Qué pasa al año siguiente en la categoría de arriba de un equipo que se cerró: lo miramos en el verano siguiente (cuando lo hay).
    if (v >= 1) {
      for (const d of cerrados) {
        const arriba = CATEGORIAS[CATEGORIAS.indexOf(d.cat) + 1];
        if (arriba) (globalThis as { __pend?: unknown[] }).__pend = [...((globalThis as { __pend?: unknown[] }).__pend ?? []), { seed, v, club: d.club, arriba, fichasV: ahora.fichas }];
      }
    }
    // Descompensados por puestos de los equipos de colegio y de club, nuevos (el club abrió equipo este verano) y heredados.
    const clubesTodos = ahora.pob.equipos.filter((e) => e.plantillaPorCategoria);
    for (const e of clubesTodos) {
      for (const c of CATEGORIAS) {
        const edades = (id: string) => ahora.pob.categorias!.find((x) => x.id === id)!;
        const miembros = [...ahora.s.npcs].filter((n) => n.deporte === 'futbol' && n.equipo === e.club && (edadNpc(n, ahora.dia) ?? -1) >= edades(c).edadMin && (edadNpc(n, ahora.dia) ?? -1) <= edades(c).edadMax);
        if (!miembros.length) continue;
        const kAntes = previa.pob.equipos.find((x) => x.club === e.club)?.equiposPorCategoria?.[c] ?? (previa.pob.equipos.find((x) => x.club === e.club) ? 1 : 0);
        const kAhora = e.equiposPorCategoria?.[c] ?? 1;
        const hubo = [...previa.fichas].some(([, x]) => x.dep === 'futbol' && x.equipo === e.club && cat(previa.pob, x.edad) === c);
        const clase: 'nuevo' | 'heredado' = !hubo || kAhora > kAntes ? 'nuevo' : 'heredado';
        const cupos = cuposPorGrupo(ahora.pob.puestos!, (e.plantillaPorCategoria?.max ?? 18) * kAhora);
        const cuenta: Record<string, number> = {};
        for (const n of miembros) { const gr = grupoDePuesto(ahora.pob.puestos!, n.puesto?.futbol ?? '') ?? '?'; cuenta[gr] = (cuenta[gr] ?? 0) + 1; }
        const desv = Math.max(...ahora.pob.puestos!.reparto.map((r) => Math.abs((cuenta[r.grupo] ?? 0) - cupos[r.grupo])));
        const vacio = ahora.pob.puestos!.reparto.some((r) => (cuenta[r.grupo] ?? 0) === 0);
        const objetivo = e.colegio !== undefined ? descomp : descompClubes;
        const t = objetivo[clase];
        t.total++;
        if (vacio) t.vacios++;
        if (desv <= 0) t.ok++; else if (desv === 1) t.mas1++; else if (desv === 2) t.mas2++; else t.mas3++;
      }
    }
    previa = ahora;
  }
  // El año siguiente de los cierres: miramos el último estado.
  const pend = ((globalThis as { __pend?: { seed: number; v: number; club: string; arriba: string; fichasV: Map<string, Ficha> }[] }).__pend ?? []).filter((p) => p.seed === seed);
  const finales = previa;
  void finales;
  for (const p of pend) {
    // En el verano p.v se cerró un equipo; la categoría de arriba, un año después, ya no existe en `finales` salvo que p.v < VERANOS: se compara con los estados guardados en `filas`.
    const fila = filas.find((r) => r.seed === seed && r.verano === p.v + 1 && r.club === p.club && r.cat === p.arriba);
    if (fila) siguiente.push({ cerrado: true, tamano: fila.despues, suben: fila.deAbajo });
  }
  // Para comparar: los equipos de colegio de las mismas categorías que no se cerraron el verano anterior.
  for (const r of filas.filter((x) => x.seed === seed && x.verano > 1)) {
    const cat = CATEGORIAS[CATEGORIAS.indexOf(r.cat) - 1];
    const previo = filas.find((x) => x.seed === seed && x.verano === r.verano - 1 && x.club === r.club && x.cat === cat);
    if (previo && !previo.cerrado && previo.despues >= 14) siguiente.push({ cerrado: false, tamano: r.despues, suben: r.deAbajo });
  }
}

const fila = (xs: Fila[], clave: (r: Fila) => string): Map<string, Fila[]> => {
  const m = new Map<string, Fila[]>();
  for (const r of xs) (m.get(clave(r)) ?? m.set(clave(r), []).get(clave(r))!).push(r);
  return m;
};
const cab = '| | Antes | Quedan | Suben de categoría | A otro club | Lo dejan | Apartados | Retirados | Entran de abajo | Entran de otro club | Entran de la bolsa (1.er año) | Entran de la bolsa (mayores) | Después | Equipos cerrados (de los que había con 14+) |';
const lin = (nombre: string, rs: Fila[]): string => {
  const n = rs.length || 1;
  const conEquipoAntes = rs.filter((r) => r.antes >= 14);
  return `| ${nombre} | ${f1(rs.reduce((a, r) => a + r.antes, 0) / n)} | ${f1(rs.reduce((a, r) => a + r.quedan, 0) / n)} | ${f1(rs.reduce((a, r) => a + r.sube, 0) / n)} | ${f1(rs.reduce((a, r) => a + r.otroClub, 0) / n)} | ${f1(rs.reduce((a, r) => a + r.deja, 0) / n)} | ${f1(rs.reduce((a, r) => a + r.apartado, 0) / n)} | ${f1(rs.reduce((a, r) => a + r.retirado, 0) / n)} | ${f1(rs.reduce((a, r) => a + r.deAbajo, 0) / n)} | ${f1(rs.reduce((a, r) => a + r.deOtroClub, 0) / n)} | ${f1(rs.reduce((a, r) => a + r.bolsaPrimero, 0) / n)} | ${f1(rs.reduce((a, r) => a + r.bolsaMayores, 0) / n)} | ${f1(rs.reduce((a, r) => a + r.despues, 0) / n)} | ${rs.filter((r) => r.cerrado).length} de ${conEquipoAntes.length} |`;
};
console.log(`Colegios con la ciudad grande, ${SEMILLAS} semillas, ${VERANOS} veranos: jugadores por equipo de colegio (media por equipo; los equipos sin jugadores antes cuentan 0)\n`);
for (const [titulo, clave] of [['Por categoría y verano', (r: Fila) => `verano ${r.verano} · ${r.cat}`], ['Por colegio y verano', (r: Fila) => `verano ${r.verano} · ${r.club}`]] as const) {
  console.log(`### ${titulo}\n`);
  console.log(cab);
  console.log(`|${'---|'.repeat(14)}`);
  for (const [k, rs] of [...fila(filas, clave)].sort((a, b) => (a[0] < b[0] ? -1 : 1))) console.log(lin(k, rs));
  console.log('');
}
console.log('### Equipos de colegio que se cierran por quedar bajo 14 (con cuántos se quedaron)\n');
const tam = new Map<number, number>();
for (const c of cierres.filter((x) => x.club.startsWith('colegio'))) tam.set(c.jugadores, (tam.get(c.jugadores) ?? 0) + 1);
console.log(`Cierres de colegio: ${[...tam.values()].reduce((a, b) => a + b, 0)} (de ${cierres.length} cierres en total, ${cierres.filter((c) => !c.club.startsWith('colegio')).length} de clubes). Con N jugadores: ${[...tam].sort((a, b) => b[0] - a[0]).map(([n, c]) => `${n}: ${c}`).join(' · ')}`);
console.log(`Al cerrar: ${cierres.filter((c) => c.club.startsWith('colegio') && c.montables === 0).length} se cierran enteros (menos de 14), ${cierres.filter((c) => c.club.startsWith('colegio') && c.montables > 0).length} pierden solo un equipo de varios.\n`);
console.log('### La categoría de arriba al año siguiente de un equipo que se cerró (colegios)\n');
const cer = siguiente.filter((x) => x.cerrado);
const noc = siguiente.filter((x) => !x.cerrado);
console.log(`Tras un cierre (${cer.length} casos): la categoría de arriba tiene ${f1(media(cer.map((x) => x.tamano)))} jugadores, de los que ${f1(media(cer.map((x) => x.suben)))} suben de abajo, y hay equipo (14+) en ${cer.filter((x) => x.tamano >= 14).length} de ${cer.length}.`);
console.log(`Sin cierre abajo (${noc.length} casos): ${f1(media(noc.map((x) => x.tamano)))} jugadores, ${f1(media(noc.map((x) => x.suben)))} suben de abajo, y hay equipo en ${noc.filter((x) => x.tamano >= 14).length} de ${noc.length}.\n`);
console.log('### Descompensados por puestos: nuevos (el club abrió equipo ese verano) y heredados (llegan con el cambio de categoría)\n');
console.log('| | Equipos | Todos los grupos en su cupo | Un grupo con ±1 | Con ±2 | Con ±3 o más | Con algún grupo vacío |');
console.log('|---|---|---|---|---|---|---|');
for (const [n, d] of [['colegios · nuevos', descomp.nuevo], ['colegios · heredados', descomp.heredado], ['clubes · nuevos', descompClubes.nuevo], ['clubes · heredados', descompClubes.heredado]] as const) console.log(`| ${n} | ${d.total} | ${d.ok} | ${d.mas1} | ${d.mas2} | ${d.mas3} | ${d.vacios} |`);
