/**
 * Niños que se quedan sin equipo en el colegio del personaje (solo mide, no cambia el juego), con la ciudad grande: por categoría, cuántos alumnos del colegio hay de esa edad, cuántos están en el equipo del colegio,
 * cuántos juegan en un club de fuera, cuántos se quedan sin equipo (con interés por el fútbol / sin él) y si los que sobran darían para otro equipo (mínimo de la plantilla). Y, con la semilla indicada, por qué el personaje
 * no entra en cada club (`--clubes`). `npm run ninos-sin-equipo -- [semillas] [veranos]`.
 */
import { PAIS_CIUDAD_GRANDE, SERVICES, registrarPais, type ClubDirectory, type NpcDirectory } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol, PUESTOS_DE_FUTBOL, convocarYAlinear, paraConvocar, rendimiento, rendimientoPorPuestos } from '@ds/mod-futbol';
import { DIAGNOSTICO, delColegio, edadNpc, type NpcsState } from '@ds/mod-npcs';

registrarPais(PAIS_CIUDAD_GRANDE);
const CLUBES = process.argv[2] === 'clubes';
const CONVOCATORIAS = process.argv[2] === 'convocatorias';
const COLEGIO = process.argv[2] === 'colegio';
const SEMILLAS = (process.argv[2] ?? '31,33,35,36,37,38').split(',').map(Number);
const VERANOS = Number(process.argv[3] ?? 1);
const CATEGORIAS = ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'];
const f = (x: number, d = 1): string => x.toFixed(d);
const media = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

if (COLEGIO) {
  // Diagnóstico caso por caso del equipo del colegio: por categoría, de dónde salen y adónde van sus alumnos con interés por el fútbol, al crear y tras cada verano.
  const semillas = (process.argv[3] ?? '33,38').split(',').map(Number);
  const veranos = Number(process.argv[4] ?? 1);
  for (const seed of semillas) {
    const g = nuevaPartida({ seed, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    let previo = new Map<string, { equipo?: string; deporte?: string; edad: number }>();
    for (let v = 0; v <= veranos; v++) {
      const cierres: string[] = [];
      if (v > 0) {
        DIAGNOSTICO.alCerrar = (d) => { if (d.club === 'colegio') cierres.push(`${d.categoria}: se queda con ${d.jugadores} jugadores (equipos que tenía: ${d.equipos}; montables: ${d.montables})`); };
        advanceToWeek(g, 'gen.descansar', 52 * v + 2, 2, 15);
        DIAGNOSTICO.alCerrar = undefined;
      }
      const s = g.moduleState<NpcsState>('npcs') as NpcsState;
      const dia = v === 0 ? 0 : (g.time.week - g.time.schoolWeek) * 7;
      const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
      if (cierres.length) console.log(`(el verano cierra en el colegio del personaje: ${cierres.join('; ')})`);
      console.log(`\n### Semilla ${seed}, ${v === 0 ? 'al crear' : `tras el verano ${v}`}`);
      const alumnos = s.npcs.filter((n) => delColegio(n) && n.genetica);
      const ahora = new Map(s.npcs.filter((n) => n.genetica).map((n) => [n.id, { equipo: n.deporte === 'futbol' ? n.equipo : undefined, deporte: n.deporte, edad: edadNpc(n, dia) ?? -1 }]));
      for (const cat of CATEGORIAS.slice(0, 3)) {
        const c = pob.categorias!.find((y) => y.id === cat)!;
        const enCat = alumnos.filter((n) => (edadNpc(n, dia) ?? -1) >= c.edadMin && (edadNpc(n, dia) ?? -1) <= c.edadMax);
        const interesados = enCat.filter((n) => (n.rasgos?.intereses.futbol ?? 0) > 0 && !n.dejado?.includes('futbol'));
        const porClub = new Map<string, number>();
        for (const n of interesados) porClub.set(n.deporte === 'futbol' ? (n.equipo ?? '?') : '(sin equipo)', (porClub.get(n.deporte === 'futbol' ? (n.equipo ?? '?') : '(sin equipo)') ?? 0) + 1);
        const porEdad = Object.fromEntries(Array.from({ length: c.edadMax - c.edadMin + 1 }, (_, i) => [c.edadMin + i, interesados.filter((n) => edadNpc(n, dia) === c.edadMin + i).length]));
        // Con interés por el fútbol o por el deporte en general (los que entran en la bolsa de los clubes): de primer año de la categoría y de segundo, y dónde juegan.
        const enBolsa = enCat.filter((n) => Math.max(n.rasgos?.intereses.futbol ?? 0, n.rasgos?.intereses.deporte ?? 0) > 0 && !n.dejado?.includes('futbol'));
        const donde = (xs: typeof enBolsa): string => { const c = { colegio: 0, 'club de fuera': 0, 'sin equipo': 0 }; for (const n of xs) c[n.deporte === 'futbol' ? (n.equipo === 'colegio' ? 'colegio' : 'club de fuera') : 'sin equipo']++; return `${xs.length} (colegio ${c.colegio}, club de fuera ${c['club de fuera']}, sin equipo ${c['sin equipo']})`; };
        console.log(`  con interés por el fútbol o el deporte (la bolsa de los clubes): primer año ${donde(enBolsa.filter((n) => edadNpc(n, dia) === c.edadMin))}; resto ${donde(enBolsa.filter((n) => edadNpc(n, dia) !== c.edadMin))}`);
        const dejaron = enCat.filter((n) => n.dejado?.includes('futbol')).length;
        console.log(`- ${cat} (edades ${c.edadMin}–${c.edadMax}): ${enCat.length} alumnos, ${interesados.length} con interés por el fútbol (por edad: ${JSON.stringify(porEdad)}; han dejado el fútbol: ${dejaron}); dónde juegan: ${[...porClub].map(([k, n]) => `${k} ${n}`).join(', ')}`);
        if (v > 0) {
          const eran = [...previo].filter(([id, x]) => x.equipo === 'colegio' && alumnos.some((a) => a.id === id) && x.edad + 1 >= c.edadMin && x.edad + 1 <= c.edadMax && x.edad < c.edadMax + 1 && x.edad >= c.edadMin - 1);
          const destino = new Map<string, number>();
          for (const [id, x] of eran) {
            const y = ahora.get(id);
            const d = !y ? 'ya no está' : y.equipo === 'colegio' ? 'sigue en el colegio' : y.equipo ? 'otro club' : y.deporte ? 'otro deporte' : 'sin equipo';
            destino.set(`${d} (tenía ${x.edad} años)`, (destino.get(`${d} (tenía ${x.edad} años)`) ?? 0) + 1);
          }
          console.log(`  los que jugaban en el colegio el curso anterior y hoy tienen edad de ${cat}: ${[...destino].sort().map(([k, n]) => `${k}: ${n}`).join('; ') || 'ninguno'}`);
        }
      }
      previo = ahora;
    }
  }
  process.exit(0);
}

if (CONVOCATORIAS) {
  // Cuántos convoca el entrenador por partido y cuántos de la plantilla se quedan fuera, en todos los equipos de la ciudad (sábado de una semana de liga, con las bajas y la asistencia de entonces).
  const semillas = (process.argv[3] ?? '31,33,35').split(',').map(Number);
  const porTamano = new Map<number, { equipos: number; fuera: number; convocados: number }>();
  let equipos = 0, jugadores = 0, convocados = 0, fuera = 0, bajas = 0;
  for (const seed of semillas) {
    const g = nuevaPartida({ seed, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    advanceToWeek(g, 'gen.descansar', 6, 5, 8);
    const s = g.moduleState<NpcsState>('npcs') as NpcsState;
    const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
    const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
    for (const e of pob.equipos.filter((x) => x.plantillaPorCategoria)) {
      for (const cat of CATEGORIAS) {
        for (const letra of ['A', 'B', 'C', 'D']) {
          const plantilla = dir.plantillaDelEquipo!('futbol', e.club, cat, letra);
          if (plantilla.length < 14) continue;
          const c = convocarYAlinear(plantilla.map((j) => paraConvocar(j)));
          const citados = c.titulares.length + c.suplentes.length;
          const f1 = plantilla.length - citados;
          equipos++; jugadores += plantilla.length; convocados += citados; fuera += f1; bajas += plantilla.filter((j) => (j.estado.baja ?? 0) > 0).length;
          const t = porTamano.get(plantilla.length) ?? { equipos: 0, fuera: 0, convocados: 0 };
          t.equipos++; t.fuera += f1; t.convocados += citados;
          porTamano.set(plantilla.length, t);
        }
      }
    }
    console.error(`semilla ${seed} medida`);
  }
  console.log(`Convocatoria por partido (ciudad grande, semillas ${semillas.join(', ')}, sábado de la semana 6, todos los equipos con plantilla de 14 o más: ${equipos} equipos; el entrenador convoca como mucho 16: 11 titulares y 5 suplentes)\n`);
  console.log('| Plantilla | Equipos | Convocados (media) | Se quedan fuera (media) |');
  console.log('|---|---|---|---|');
  for (const [n, t] of [...porTamano].sort((a, b) => a[0] - b[0])) console.log(`| ${n} | ${t.equipos} | ${f(t.convocados / t.equipos)} | ${f(t.fuera / t.equipos)} |`);
  console.log(`| **Todos** | ${equipos} | ${f(convocados / equipos)} (plantilla media ${f(jugadores / equipos)}) | ${f(fuera / equipos)} (${f((100 * fuera) / jugadores, 0)} % de la plantilla); lesionados ese sábado: ${f(bajas / equipos)} por equipo |`);
  process.exit(0);
}

if (CLUBES) {
  // Por qué no coge a un personaje cada club de fuera: con lo que vale hoy (sin el azar del día de la prueba), el puesto en que más vale y lo que ofrece cada equipo.
  const seed = Number(process.argv[3] ?? 33);
  const g = nuevaPartida({ seed, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  advanceToWeek(g, 'gen.descansar', 3, 1, 9);
  const lector = { stat: (id: string) => g.stat(id), norm: (id: string) => g.stat(id) / 100 };
  const valores = rendimientoPorPuestos(lector);
  const nivel = rendimiento(lector);
  const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
  const clubes = g.service<ClubDirectory>(SERVICES.clubes)!.list('futbol');
  const mejor = Object.entries(valores).sort((a, b) => b[1] - a[1])[0];
  console.log(`Semilla ${seed}, semana 3 (plazo abierto). Nivel del personaje: ${f(nivel)} (comprobación: el club del colegio dice «${g.preview('futbol.apuntarse_colegio')?.reason?.match(/tú (\d+)/)?.[1] ?? '?'}»). Mejor puesto: ${mejor[0]} (${f(mejor[1])}); valores: ${Object.entries(valores).map(([k, v]) => `${k} ${f(v, 0)}`).join(', ')}.\n`);
  console.log('| Club | Estado de su plaza (con lo que vale) | Puesto que le ofrecen | Peor del equipo en ese grupo (nombre, valor) | Personaje en ese puesto | Huecos del equipo (puestos) | Valor del personaje en los huecos | Nivel mínimo del club |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const c of clubes.filter((x) => !x.esColegio)) {
    const pl = dir.plaza!('futbol', c.id, nivel, valores, {});
    const ceros = Object.fromEntries(PUESTOS_DE_FUTBOL.puestos.map((p) => [p.id, 0]));
    const huecos = PUESTOS_DE_FUTBOL.puestos.filter((p) => dir.plaza!('futbol', c.id, 100, { ...ceros, [p.id]: 100 }, { puesto: p.id }).estado === 'libre').map((p) => p.id);
    const enHuecos = huecos.map((h) => `${h} ${f(valores[h], 0)}`).join(', ');
    console.log(`| ${c.id} | ${pl.estado} | ${pl.puesto ?? '—'} | ${pl.peor ? `${pl.peor.nombre}, ${f(pl.peor.nivel)}` : '—'} | ${pl.puesto ? f(valores[pl.puesto], 0) : '—'} | ${huecos.length ? huecos.join(', ') : 'ninguno'} | ${enHuecos || '—'} | ${c.acceso?.futbol ? `nivel ${c.acceso.futbol.nivel}, ${c.acceso.futbol.edadMin} años` : 'sin mínimo'} |`);
  }
  process.exit(0);
}

type Fila = { alumnos: number; enEquipo: number; enClub: number; sinFutbol: number; sinGeneral: number; sinInteres: number };
const filas: Record<string, Record<string, Fila[]>> = {};
for (const seed of SEMILLAS) {
  const g = nuevaPartida({ seed, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  for (let v = 0; v <= VERANOS; v++) {
    if (v > 0) advanceToWeek(g, 'gen.descansar', 52 * v + 2, 2, 15);
    const s = g.moduleState<NpcsState>('npcs') as NpcsState;
    const dia = v === 0 ? 0 : (g.time.week - g.time.schoolWeek) * 7;
    const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
    for (const cat of CATEGORIAS) {
      const c = pob.categorias!.find((y) => y.id === cat)!;
      const alumnos = s.npcs.filter((n) => delColegio(n) && n.genetica && (edadNpc(n, dia) ?? -1) >= c.edadMin && (edadNpc(n, dia) ?? -1) <= c.edadMax);
      const fila: Fila = { alumnos: alumnos.length, enEquipo: 0, enClub: 0, sinFutbol: 0, sinGeneral: 0, sinInteres: 0 };
      for (const n of alumnos) {
        const fut = n.rasgos?.intereses.futbol ?? 0, dep = n.rasgos?.intereses.deporte ?? 0;
        if (n.deporte === 'futbol' && n.equipo === 'colegio') fila.enEquipo++;
        else if (n.deporte === 'futbol') fila.enClub++;
        else if (fut > 0) fila.sinFutbol++;
        else if (dep > 0) fila.sinGeneral++;
        else fila.sinInteres++;
      }
      (((filas[`verano ${v}`] ??= {})[cat]) ??= []).push(fila);
    }
  }
  console.error(`semilla ${seed} medida`);
}
console.log(`Alumnos del colegio del personaje por categoría (media de ${SEMILLAS.length} semillas: ${SEMILLAS.join(', ')}; ciudad grande; plantilla del colegio: mín. 14, máx. 18 por equipo)\n`);
for (const [momento, porCat] of Object.entries(filas)) {
  console.log(`\n**${momento === 'verano 0' ? 'Al crear la partida' : `Tras el ${momento}`}**\n`);
  console.log('| Categoría | Alumnos | En el equipo del colegio | En un club de fuera | Sin equipo, con interés por el fútbol | Sin equipo, solo interés por el deporte | Sin interés | ¿Daría para otro equipo (≥ 14 sin equipo con interés)? |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const cat of CATEGORIAS) {
    const x = porCat[cat];
    const por = (k: keyof Fila) => f(media(x.map((r) => r[k])));
    const dan = x.filter((r) => r.sinFutbol >= 14).length;
    const danConGeneral = x.filter((r) => r.sinFutbol + r.sinGeneral >= 14).length;
    const sinEquipoDelColegio = x.filter((r) => r.enEquipo < 14).length;
    console.log(`| ${cat} (colegio sin equipo en ${sinEquipoDelColegio} de ${x.length} semillas) | ${por('alumnos')} | ${por('enEquipo')} | ${por('enClub')} | ${por('sinFutbol')} | ${por('sinGeneral')} | ${por('sinInteres')} | ${dan} de ${x.length} semillas (con los de interés general: ${danConGeneral}) |`);
  }
  console.log('\nPor semilla (alumnos / en el equipo / en club / sin equipo con interés fútbol):');
  for (let i = 0; i < SEMILLAS.length; i++) console.log(`- semilla ${SEMILLAS[i]}: ${['benjamin', 'alevin'].map((cat) => { const r = porCat[cat][i]; return `${cat} ${r.alumnos} / ${r.enEquipo} / ${r.enClub} / ${r.sinFutbol}`; }).join('; ')}`);
}
