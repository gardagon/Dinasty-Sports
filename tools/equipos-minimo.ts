/**
 * Cuántos equipos de fútbol quedan por debajo del mínimo de la liga (14) tras el reparto, por ciudad, categoría y semilla (`docs/relevo/equipos-minimo.md`). Solo mide: no cambia el juego.
 * `npx tsx tools/equipos-minimo.ts <grande|actual> <con|sin> [semillas, p. ej. 31,32 o 1-10] [--traza]`
 *
 * Un «equipo» es lo que comparte club, categoría y letra (`Npc.letra`, que fija `fijarEquipos` al acabar el reparto). Se cuenta en dos momentos: al empezar el curso (todos los que el reparto
 * ha puesto, `apuntado` aparte) y tras los días 1 a 6 (los que ya se han apuntado: `Npc.apuntado`, solo presentación). Y, con el personaje apuntado al club de su colegio, en qué equipo cae y cuántos son.
 * Salida: líneas `#BAJO` (cada equipo bajo el mínimo, con los demás equipos de su club) y `#RESUMEN` (por categoría), para agregar con otro script.
 */
import { PAIS_CIUDAD_ACTUAL_SIN_HOGARES, PAIS_CIUDAD_GRANDE, PAIS_CIUDAD_GRANDE_SIN_HOGARES, PAIS_ESPANA, SERVICES, registrarPais, type ClubDirectory, type NpcDirectory } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { DIAGNOSTICO, SESGO_DE_SEXO, interesDe, edadDeJuego, type NpcsState } from '@ds/mod-npcs';
import { convocarYAlinear } from '@ds/mod-futbol';
import { hacer, posible } from '../tests/ayudas';

const [ciudad = 'grande', hogares = 'con', lista = '31,32,33'] = process.argv.slice(2).filter((x) => !x.startsWith('--'));
const TRAZA = process.argv.includes('--traza');
// `--nuevo`: el reparto nuevo entero (medida, apagado por defecto): benjamín/alevín paso 2-3 + 7, infantil/cadete paso 2-3 + 4 (B mixto hasta 20) + 5-6 + 7, juvenil en cascada.
// Sexos (medida; `docs/relevo/reparto-nuevo-reglas.md`): `--chicas=0.111` deja ~10 % de chicas entre los que quieren jugar; `--solo=m|f` reparte desde infantil (12) solo a chicos o solo a chicas (dos mundos de la misma semilla).
const argChicas = process.argv.find((x) => x.startsWith('--chicas'));
const argSolo = process.argv.find((x) => x.startsWith('--solo='))?.slice(7) as 'm' | 'f' | undefined;
if (argChicas || argSolo) SESGO_DE_SEXO.deportes = ['futbol'];
if (argChicas) SESGO_DE_SEXO.chicas = Number(argChicas.split('=')[1] ?? 0.111);
if (argSolo) { SESGO_DE_SEXO.solo = argSolo; SESGO_DE_SEXO.desdeEdad = 12; }
const EQUILIBRAR = process.argv.includes('--equilibrar');
const NUEVO = process.argv.includes('--nuevo') || EQUILIBRAR;
if (NUEVO) {
  const titulares = (js: unknown): string[] => convocarYAlinear(js as never).titulares.map((x) => x.id);
  DIAGNOSTICO.variantePrimeraRonda = { porAnio: 14 };
  DIAGNOSTICO.variantePaso23 = { completarBMixto: 20, reagrupar: true, paso7: true, bolsaBA: true, ...(EQUILIBRAR ? { equilibrar: true } : {}), maxPorEquipo: { benjamin: 18, alevin: 18, infantil: 20, cadete: 20 }, subirTitulares: { infantil: true, cadete: true }, titulares } as never;
  DIAGNOSTICO.variantJuvenil = { cascada: 'usuario', titulares } as never;
}
// Los equipos que deja cada variante (la traza de su último paso): `fijarEquipos` reparte después las letras por el total del club, así que con `--nuevo` se leen de aquí.
let seed_ = 0;
const DEBUG = process.argv.includes('--clubes');
const FUERA_J: Record<string, number[]> = {};
const FINALES: Record<string, { A: number; B: number; C: number; D: number }[]> = {};
if (NUEVO) DIAGNOSTICO.traza = (e) => { if (DEBUG && (e.fase === 'fin del paso 7' || e.fase === 'fin BA' || e.fase === 'fin equilibrio' || e.fase === 'fin J3')) console.log(`#CLUBES ${e.categoria} ${e.fase} ${JSON.stringify(e.datos.equipos)}`); if (DEBUG && e.fase === 'equilibrio' && e.datos.revertido) console.log(`#REVERT ${seed_} ${e.categoria} ${e.club} ${e.datos.tipo} ${JSON.stringify(e.datos.tamanos)}`); if (e.fase === 'fin J3') FUERA_J[e.categoria] = e.datos.abandonanPorAnio as number[]; if (e.fase === 'fin equilibrio') console.log(`#EQ ${seed_} ${e.categoria} cambian=${e.datos.cambian} bajan=${e.datos.bajan} revertidos=${e.datos.revertidos} sinA=${e.datos.sinA} sinAUnidos=${e.datos.sinAUnidos} sinAExceso=${e.datos.sinAExceso} desaparecen=${e.datos.desaparecen} cDesbordan=${e.datos.cDesbordan} expulsados=${e.datos.expulsadosC} desaparecidos=${e.datos.desaparecidos} colocados=${e.datos.colocados} sinSitio=${e.datos.sinSitio} clubesConC=${e.datos.clubesConC} clubesConD=${e.datos.clubesConD} CA=${e.datos.antesCA}>${e.datos.despuesCA} DB=${e.datos.antesDB}>${e.datos.despuesDB} CAonce=${e.datos.antesCAonce}>${e.datos.despuesCAonce} DBonce=${e.datos.antesDBonce}>${e.datos.despuesDBonce}`); if (e.fase === 'fin del paso 7' || e.fase === 'fin BA' || e.fase === 'fin equilibrio' || e.fase === 'fin J3') FINALES[e.categoria] = (e.datos.equipos as { A: number; B: number; C?: number; D?: number }[]).map((q) => ({ A: q.A, B: q.B, C: q.C ?? 0, D: q.D ?? 0 })); };
const PAIS = ciudad === 'grande' ? (hogares === 'sin' ? PAIS_CIUDAD_GRANDE_SIN_HOGARES : PAIS_CIUDAD_GRANDE) : hogares === 'sin' ? PAIS_CIUDAD_ACTUAL_SIN_HOGARES : PAIS_ESPANA;
registrarPais(PAIS);
const semillas = lista.includes('-') ? Array.from({ length: Number(lista.split('-')[1]) - Number(lista.split('-')[0]) + 1 }, (_, i) => Number(lista.split('-')[0]) + i) : lista.split(',').map(Number);
const CATEGORIAS = ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'];
const etiqueta = `${ciudad}-${hogares}${EQUILIBRAR ? '-equilibrado' : NUEVO ? '-nuevo' : ''}${argSolo ? `-solo${argSolo}` : ''}`;

for (const seed of semillas) {
  seed_ = seed;
  const g = nuevaPartida({ seed, pais: PAIS.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  const medir = (momento: string, dia: number | undefined): void => {
    const s = g.moduleState<NpcsState>('npcs') as NpcsState;
    const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
    const jugadores = s.npcs.filter((n) => n.deporte === 'futbol' && n.equipo && (dia === undefined || n.apuntado === undefined || n.apuntado <= dia));
    const porCat: Record<string, { equipos: number; bajo: number; jugBajo: number; sinLetra: number; jug: number }> = {};
    // Opciones (solo en «empezar»), por categoría: equipos bajo, jugadores en ellos, y qué pasaría con cada opción.
    const sim: Record<string, Record<string, number>> = {};
    const valorDe = (n: (typeof s.npcs)[number]): number => n.vp?.futbol?.puestos?.[n.puesto?.futbol ?? ''] ?? n.vp?.futbol?.valor ?? n.levels.futbol ?? 0;
    const fuerza = (xs: number[]): number => { const t = [...xs].sort((a, b) => b - a).slice(0, 11); return t.length ? t.reduce((a, b) => a + b, 0) / t.length : 0; };
    for (const cat of CATEGORIAS) {
      const c = pob.categorias!.find((x) => x.id === cat)!;
      const r = (porCat[cat] = { equipos: 0, bajo: 0, jugBajo: 0, sinLetra: 0, jug: 0 });
      const z = (sim[cat] = { clubCatConBajo: 0, deficit: 0, movidos: 0, donantesFuerzaAntes: 0, donantesFuerzaDespues: 0, donantes: 0, bajoFuerzaAntes: 0, bajoFuerzaDespues: 0, bajoN: 0, abs18: 0, abs20: 0, abs22: 0, libres18: 0, libres20: 0, libres22: 0, equiposQueCierran: 0, room: 0, excedente: 0, bolsa: 0 });
      for (const e of pob.equipos.filter((x) => x.plantillaPorCategoria)) {
        const suyos = jugadores.filter((n) => n.equipo === e.club && (edadDeJuego(n, 0) ?? -1) >= c.edadMin && (edadDeJuego(n, 0) ?? -1) <= c.edadMax);
        if (!suyos.length) continue;
        const min = e.plantillaPorCategoria!.min;
        const k = e.equiposPorCategoria?.[cat] ?? 1;
        const porLetra: Record<string, typeof suyos> = {};
        for (const n of suyos) (porLetra[n.letra?.futbol ?? '-'] ??= []).push(n);
        r.jug += suyos.length;
        const dato = Object.entries(porLetra).filter(([l]) => l !== '-').map(([l, xs]) => ({ l, xs: xs.map(valorDe), n: xs.length }));
        const max = e.plantillaPorCategoria!.max;
        const bajos = dato.filter((d) => d.n < min);
        for (const d of dato.filter((d) => d.n >= min)) { z.room += Math.max(0, max - d.n); z.excedente += Math.max(0, d.n - min); }
        if (bajos.length && momento === 'empezar') {
          z.clubCatConBajo++;
          const n0 = bajos.reduce((t, d) => t + d.n, 0);
          z.equiposQueCierran += bajos.length;
          // B. Equilibrar: los 14 justos, quitando de los que más sobran (los que menos valen).
          const don = dato.filter((d) => d.n >= min).map((d) => ({ ...d, xs: [...d.xs].sort((a, b) => b - a) }));
          const rec = bajos.map((d) => ({ ...d, xs: [...d.xs] }));
          const antesD = don.map((d) => fuerza(d.xs)), antesR = rec.map((d) => fuerza(d.xs));
          let movidos = 0;
          for (const t of rec) while (t.xs.length < min) { const d = don.sort((a, b) => b.xs.length - a.xs.length)[0]; if (!d || d.xs.length <= min) break; t.xs.push(d.xs.pop()!); movidos++; }
          z.movidos += movidos; z.deficit += bajos.reduce((t, d) => t + (min - d.n), 0);
          don.forEach((d, i) => { const k0 = dato.filter((x) => x.n >= min).findIndex((x) => x.l === d.l); void k0; z.donantesFuerzaDespues += fuerza(d.xs); z.donantes++; });
          z.donantesFuerzaAntes += dato.filter((d) => d.n >= min).reduce((t, d) => t + fuerza(d.xs), 0);
          void antesD; void antesR;
          rec.forEach((d, i) => { z.bajoFuerzaDespues += fuerza(d.xs); z.bajoFuerzaAntes += fuerza(bajos[i].xs); z.bajoN++; });
          // C y D. Deshacer el equipo bajo: sus jugadores buscan sitio en los otros equipos del club (hasta M) y lo que no cabe queda libre.
          const hueco = (M: number): number => dato.filter((d) => d.n >= min).reduce((t, d) => t + Math.max(0, M - d.n), 0);
          const cabe = (M: number): number => Math.min(n0, hueco(M));
          z.abs18 += cabe(max); z.abs20 += cabe(max + 2); z.abs22 += cabe(22);
          z.libres18 += n0 - cabe(max); z.libres20 += n0 - cabe(max + 2); z.libres22 += n0 - cabe(22);
        }
        r.sinLetra += (porLetra['-'] ?? []).length;
        for (const [letra, xs] of Object.entries(porLetra)) {
          if (letra === '-') continue;
          r.equipos++;
          if (xs.length < min) {
            r.bajo++;
            r.jugBajo += xs.length;
            const anios = (xs: typeof suyos): string => `${xs.filter((n) => edadDeJuego(n, 0) === c.edadMin).length}+${xs.filter((n) => edadDeJuego(n, 0) !== c.edadMin).length}`;
            const demas = Object.entries(porLetra).filter(([l]) => l !== letra).map(([l, ys]) => `${l}${l === '-' ? '' : ''}:${ys.length}(${anios(ys)})`).join(' ');
            if (TRAZA || momento === 'empezar') console.log(`#BAJO ${etiqueta} ${seed} ${momento} ${cat} ${e.club}${e.colegio !== undefined ? '[colegio]' : ''} k=${k} total=${suyos.length} max=${e.plantillaPorCategoria!.max} ${letra}:${xs.length}(${anios(xs)}) otros: ${demas}`);
          }
        }
      }
    }
    if (momento === 'empezar') {
      for (const cat of CATEGORIAS) {
        const c = pob.categorias!.find((x) => x.id === cat)!;
        sim[cat].bolsa = s.npcs.filter((x) => x.genetica && x.deporte === undefined && !x.dejado?.includes('futbol') && interesDe(x, 'futbol', edadDeJuego(x, 0)) > 0 && (edadDeJuego(x, 0) ?? -1) >= c.edadMin && (edadDeJuego(x, 0) ?? -1) <= c.edadMax).length;
        console.log(`#SIM ${etiqueta} ${seed} ${cat} ${Object.entries(sim[cat]).map(([k, v]) => `${k}=${Math.round(v * 100) / 100}`).join(' ')}`);
      }
    }
    if (momento === 'empezar') {
      for (const cat of CATEGORIAS) {
        const c = pob.categorias!.find((x) => x.id === cat)!;
        const q = { m: 0, f: 0 };
        for (const n of s.npcs) { const ed = edadDeJuego(n, 0) ?? -1; if (n.genetica && ed >= c.edadMin && ed <= c.edadMax && interesDe(n, 'futbol', ed) > 0) q[n.gender === 'f' ? 'f' : 'm']++; }
        const est = { juegan: 0, apartados: 0, dejaron: 0, libres: 0 };
        for (const n of s.npcs) { const ed = edadDeJuego(n, 0) ?? -1; if (n.genetica && ed >= c.edadMin && ed <= c.edadMax && interesDe(n, 'futbol', ed) > 0) { if (n.deporte === 'futbol') est.juegan++; else if (n.apartado?.includes('futbol')) est.apartados++; else if (n.dejado?.includes('futbol')) est.dejaron++; else est.libres++; } }
        console.log(`#QUIEREN ${etiqueta} ${seed} ${cat} chicos=${q.m} chicas=${q.f} juegan=${est.juegan} apartados=${est.apartados} dejaron=${est.dejaron} libres=${est.libres}`);
      }
      for (const cat of CATEGORIAS) {
        const c = pob.categorias!.find((x) => x.id === cat)!;
        const equipos = new Map<string, number>();
        for (const n of jugadores) { const ed = edadDeJuego(n, 0) ?? -1; if (n.equipo && n.letra?.futbol && ed >= c.edadMin && ed <= c.edadMax) { const k = `${n.equipo}|${n.letra.futbol}`; equipos.set(k, (equipos.get(k) ?? 0) + 1); } }
        const porLetra: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
        for (const k of equipos.keys()) porLetra[k.split('|')[1]] = (porLetra[k.split('|')[1]] ?? 0) + 1;
        let tams = [...equipos.values()];
        if (NUEVO && FINALES[cat]) {
          for (const l of ['A', 'B', 'C', 'D'] as const) porLetra[l] = FINALES[cat].filter((q) => q[l] > 0).length;
          tams = FINALES[cat].flatMap((q) => [q.A, q.B, q.C, q.D].filter((x) => x > 0));
        }
        const fuera: number[] = [0, 0, 0];
        let sinLetra = 0;
        for (const n of s.npcs) {
          const ed = edadDeJuego(n, 0) ?? -1;
          if (!n.genetica || ed < c.edadMin || ed > c.edadMax) continue;
          if (n.deporte === 'futbol' && n.equipo && !n.letra?.futbol) sinLetra++;
          if (n.deporte === undefined && !n.dejado?.includes('futbol') && interesDe(n, 'futbol', ed) > 0) fuera[Math.min(2, ed - c.edadMin)]++;
        }
        console.log(`#CAT ${etiqueta} ${seed} ${cat} A=${porLetra.A} B=${porLetra.B} C=${porLetra.C} D=${porLetra.D} min=${tams.length ? Math.min(...tams) : 0} max=${tams.length ? Math.max(...tams) : 0} bajo=${tams.filter((x) => x < 14).length} jugadores=${tams.reduce((a, b) => a + b, 0)} sinLetra=${sinLetra} fuera=${(NUEVO && FUERA_J[cat] ? FUERA_J[cat] : fuera).join('/')}`);
      }
    }
    for (const cat of CATEGORIAS) { const r = porCat[cat]; console.log(`#RESUMEN ${etiqueta} ${seed} ${momento} ${cat} equipos=${r.equipos} bajo=${r.bajo} jugadoresEnBajo=${r.jugBajo} sinLetra=${r.sinLetra} jugadores=${r.jug}`); }
  };
  medir('empezar', undefined);
  advanceToWeek(g, 'gen.descansar', 0, 2, 9);
  const apuntado = posible(g, 'futbol.apuntarse_colegio');
  const motivo = apuntado ? '' : g.preview('futbol.apuntarse_colegio')?.reason;
  if (apuntado) hacer(g, 'futbol.apuntarse_colegio');
  advanceToWeek(g, 'gen.descansar', 1, 0, 9);
  medir('dia6', 6);
  const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
  const p = dir.equipoDelPersonaje?.('futbol');
  if (p) {
    const n = dir.plantillaDelEquipo!('futbol', p.club, p.categoria, p.letra).length;
    const club = g.service<ClubDirectory>(SERVICES.clubes)!.list('futbol').find((c) => c.id === p.club);
    console.log(`#PERSONAJE ${etiqueta} ${seed} ${p.club}${club?.esColegio ? '[colegio]' : ''} ${p.categoria} ${p.letra} plantilla=${n} ${n < 14 ? 'BAJO' : 'ok'}`);
  } else console.log(`#PERSONAJE ${etiqueta} ${seed} sin-equipo (${motivo})`);
}
