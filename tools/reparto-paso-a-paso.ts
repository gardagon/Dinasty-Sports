/**
 * El reparto de una categoría del fútbol, paso a paso y en texto (para decidir con el usuario, `docs/relevo/reparto-paso-a-paso.md`). Solo cuenta: no cambia el juego.
 * `npm run reparto:paso -- <semilla> [grande|actual|prueba] [categoría] [club] [--sin-hogares] [--sin-verano] [--resumen]`
 * Ejemplo: `npm run reparto:paso -- 33 grande benjamin`.
 *
 * Cuenta, en este orden: 1) los niños (por edad y colegio), 2) los clubes, 3) cada ronda del reparto al crear la partida (qué club recluta, cuántos ve, cuántos van a probar, cuántos equipos
 * intenta montar y por qué se queda con N), 4) cómo quedan los equipos (A a D: cuántos hay, cuántos caben, cuántos faltan para 14, cuántos sobran del máximo), 5) quién queda fuera y 6) el verano
 * siguiente, paso a paso. Se apoya en `DIAGNOSTICO.traza` del draft (que solo mira).
 */
import { PAIS_CIUDAD_DE_PRUEBA, PAIS_CIUDAD_GRANDE, PAIS_CIUDAD_GRANDE_SIN_HOGARES, PAIS_ESPANA, registrarPais } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { convocarYAlinear, futbol } from '@ds/mod-futbol';
import { DIAGNOSTICO, atractivoDe, edadDeJuego, edadNpc, type EventoDeTraza, type FotoDeClub, type NpcsState } from '@ds/mod-npcs';

const iv = process.argv.indexOf('--variante');
const variante = iv >= 0 ? process.argv[iv + 1] : undefined;
const args = process.argv.slice(2).filter((x, i, xs) => !x.startsWith('--') && xs[i - 1] !== '--variante');
const flag = (n: string): boolean => process.argv.includes(`--${n}`);
const semilla = Number(args[0] ?? 33);
const ciudad = args[1] ?? 'grande';
const categoria = args[2] ?? 'benjamin';
const soloClub = args[3];
const PAIS = ciudad === 'actual' ? PAIS_ESPANA : ciudad === 'prueba' ? PAIS_CIUDAD_DE_PRUEBA : flag('sin-hogares') ? PAIS_CIUDAD_GRANDE_SIN_HOGARES : PAIS_CIUDAD_GRANDE;
registrarPais(PAIS);
if (variante === 'paso1-14x2' || variante === 'paso2-3') DIAGNOSTICO.variantePrimeraRonda = { porAnio: 14 };
if (variante === 'paso2-3') DIAGNOSTICO.variantePaso23 = { maxPorEquipo: { benjamin: 18, alevin: 18, infantil: 20, cadete: 20 }, subirTitulares: { infantil: true, cadete: true }, titulares: (js) => convocarYAlinear(js as never).titulares.map((x) => x.id) };
else if (variante && variante !== 'paso1-14x2') throw new Error(`Variante desconocida: ${variante} (paso1-14x2, paso2-3)`);
class Parar extends Error {}

const out: string[] = [];
const say = (t = ''): number => out.push(t);
const tabla = (cab: string[], filas: (string | number)[][]): void => {
  say(`| ${cab.join(' | ')} |`);
  say(`|${cab.map(() => '---').join('|')}|`);
  for (const f of filas) say(`| ${f.join(' | ')} |`);
  say();
};
const cierres: string[] = [];
type Acomodo = Parameters<NonNullable<typeof DIAGNOSTICO.alAcomodar>>[0];
let momento: 'crear' | 'verano' = 'crear';
const guardados: { momento: 'crear' | 'verano'; e: EventoDeTraza; fotos?: FotoDeClub[]; bolsa?: ReturnType<EventoDeTraza['bolsa']>; acomodo?: Acomodo }[] = [];
DIAGNOSTICO.traza = (e) => {
  if (e.categoria !== categoria) return;
  // Se calcula ya (las fotos son del momento): el estado cambia después.
  guardados.push({ momento, e, fotos: e.foto(), bolsa: e.fase === 'inicio' || (variante && e.fase === 'fin de la primera ronda') ? e.bolsa() : undefined });
  if (variante && e.fase === 'fin de la primera ronda') throw new Parar();
};
DIAGNOSTICO.alAcomodar = (d) => {
  if (d.categoria === categoria) guardados.push({ momento, e: { categoria, fase: 'acomodo', datos: {}, foto: () => [], bolsa: () => [] }, acomodo: d });
};
DIAGNOSTICO.alCerrar = (d) => { if (d.categoria === categoria && momento === 'verano') cierres.push(`${d.club}: se queda con ${d.jugadores} para ${d.equipos} equipos; con 14 por equipo caben ${d.montables}`); };

const nombreDeClub = (f: { club: string; colegio?: string }): string => (f.colegio !== undefined ? `${f.club} (colegio${f.colegio === 'propio' ? ' del personaje' : ''})` : f.club);
const tablaDeFoto = (fotos: readonly FotoDeClub[], antes?: readonly FotoDeClub[]): void => {
  const filas = fotos.filter((f) => !soloClub || f.club === soloClub).map((f) => {
    const a = antes?.find((x) => x.club === f.club);
    const cambio = a && (a.total !== f.total || a.k !== f.k) ? ` (antes ${a.k} eq. · ${a.total})` : '';
    const caben = (f.max + f.plazasDeMas) * f.k;
    return [nombreDeClub(f), f.k || '—', `${f.total}${cambio}`, f.primeros, f.total - f.primeros, f.k ? caben : '—', f.k ? Math.max(0, f.min * f.k - f.total) : '—', f.k ? Math.max(0, f.total - caben) : '—'];
  });
  tabla(['Club', 'Equipos', 'Niños', '…de 1.er año', '…de 2.º', 'Caben (máx × equipos)', 'Faltan para 14 × equipos (la cuenta del club)', 'Sobran del máximo'], filas);
};

if (variante === 'paso2-3') {
  type Ev = { fase: string; categoria: string; club?: string; datos: Record<string, unknown>; bolsa?: ReturnType<EventoDeTraza['bolsa']> };
  const evs: Ev[] = [];
  DIAGNOSTICO.traza = (e) => {
    if (['paso 2', 'paso 3', 'fin del paso 3'].includes(e.fase)) evs.push({ fase: e.fase, categoria: e.categoria, ...(e.club ? { club: e.club } : {}), datos: e.datos, ...(e.fase === 'fin del paso 3' ? { bolsa: e.bolsa() } : {}) });
    if (e.fase === 'fin del paso 3' && e.categoria === 'cadete') throw new Parar();
  };
  try { nuevaPartida({ seed: semilla, pais: PAIS.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]); } catch (err) { if (!(err instanceof Parar)) throw err; }
  say(`# Variante paso2-3 · semilla ${semilla} · ${PAIS.id}`);
  say();
  say('Paso 1: 14 de 1.er año y 14 del resto por club. Paso 2 (solo infantil y cadete): los de 1.er año que serían titulares en el A (con la alineación del juego sobre los 28) suben al A. Paso 3: cada equipo se completa desde la bolsa (A con el resto de años, B con 1.er año) hasta 18 (benjamín y alevín) o 20 (infantil y cadete), con el mismo orden, atractivo y colegios; sin prueba.');
  say();
  for (const cat of ['benjamin', 'alevin', 'infantil', 'cadete']) {
    say(`## ${cat}`);
    say();
    const p2 = evs.filter((x) => x.fase === 'paso 2' && x.categoria === cat);
    if (p2.length) {
      say('### Paso 2: los de 1.er año que suben al A');
      say();
      tabla(['Club', 'Suben', 'A', 'B', '¿B por debajo de 14?'], p2.map((x) => [x.club!, Number(x.datos.subidos), Number(x.datos.a), Number(x.datos.b), Number(x.datos.b) < 14 ? '**sí**' : 'no']));
      say(`Total que suben: **${p2.reduce((t, x) => t + Number(x.datos.subidos), 0)}** de ${p2.length * 14}; clubes con el B por debajo de 14: **${p2.filter((x) => Number(x.datos.b) < 14).length}** de ${p2.length}.`);
      say();
    }
    const p3 = evs.filter((x) => x.fase === 'paso 3' && x.categoria === cat);
    const tam = p3.flatMap((x) => [Number(x.datos.a), Number(x.datos.b)]).filter((n) => n > 0);
    say('### Paso 3: completar desde la bolsa');
    say();
    tabla(['Club', 'A', 'B', 'Cogidos para A', 'Cogidos para B', 'Veía (resto · 1.º)'], p3.map((x) => [x.club!, Number(x.datos.a), Number(x.datos.b), Number(x.datos.cogidosA), Number(x.datos.cogidosB), `${x.datos.veA} · ${x.datos.veB}`]));
    const fin = evs.find((x) => x.fase === 'fin del paso 3' && x.categoria === cat)!;
    const quedan = new Set(fin.datos.quedan as string[]);
    const min1 = Math.min(...fin.bolsa!.map((a) => a.edad));
    const gr = (primero: boolean): NonNullable<typeof fin.bolsa> => fin.bolsa!.filter((a) => (a.edad === min1) === primero);
    tabla(['Resumen', ''], [
      ['Equipos', tam.length],
      ['Niños por equipo: mínimo · máximo · media', `${Math.min(...tam)} · ${Math.max(...tam)} · ${(tam.reduce((a, b) => a + b, 0) / tam.length).toFixed(1)}`],
      ['Equipos por debajo de 14', tam.filter((n) => n < 14).length],
      ['Niños asignados', tam.reduce((a, b) => a + b, 0)],
    ]);
    const colegios = [...new Set(fin.bolsa!.map((a) => a.colegio))].sort();
    tabla(['Bolsa tras el paso 3', 'Quedan', 'Se quedan en su colegio', 'Quieren probar fuera', ...colegios.map((c) => `…de ${c}`)], ([['1.er año', true], ['Resto de años', false]] as [string, boolean][]).map(([n, pr]) => { const xs = gr(pr); return [n, xs.length, xs.filter((a) => quedan.has(a.id)).length, xs.filter((a) => !quedan.has(a.id)).length, ...colegios.map((c) => xs.filter((a) => a.colegio === c).length)]; }));
  }
  DIAGNOSTICO.traza = undefined; DIAGNOSTICO.variantePrimeraRonda = undefined; DIAGNOSTICO.variantePaso23 = undefined;
  console.log(out.join('\n'));
  process.exit(0);
}
if (variante) {
  const base = { seed: semilla, pais: PAIS.id, deportes: ['atletismo', 'futbol'] };
  try { nuevaPartida(base, [...MODULOS, futbol]); } catch (err) { if (!(err instanceof Parar)) throw err; }
  const fin = guardados.find((x) => x.e.fase === 'fin de la primera ronda');
  const ini = guardados.find((x) => x.e.fase === 'inicio');
  if (!fin?.fotos || !fin.bolsa || !ini?.bolsa) throw new Error('No se llegó al final de la primera ronda');
  const quedan = new Set(fin.e.datos.quedan as string[]);
  say(`# Variante ${variante} · ${categoria} · semilla ${semilla} · ${PAIS.id}`);
  say();
  say('Primera ronda con 14 de 1.er año y 14 del resto de años por club (el resto igual: mismo orden de clubes, atractivo, colegios solo con sus alumnos). Sin completar con el otro año.');
  say();
  const filas = fin.fotos.map((f) => { const r = f.total - f.primeros; const eq = (f.primeros >= 14 ? 1 : 0) + (r >= 14 ? 1 : 0); return { f, r, eq }; });
  tabla(['Club', '1.er año', 'Faltan', 'Resto de años', 'Faltan', 'Equipos (uno por año con 14 o más)'], filas.map(({ f, r, eq }) => [nombreDeClub(f), f.primeros, Math.max(0, 14 - f.primeros), r, Math.max(0, 14 - r), eq]));
  tabla(['Totales', ''], [['Equipos formados', filas.reduce((t, x) => t + x.eq, 0)], ['Niños asignados', filas.reduce((t, x) => t + x.f.total, 0)], ['…en equipos de 14 o más', filas.reduce((t, x) => t + (x.f.primeros >= 14 ? x.f.primeros : 0) + (x.r >= 14 ? x.r : 0), 0)], ['Niños asignados que no llegan a 14 de su año', filas.reduce((t, x) => t + (x.f.primeros < 14 ? x.f.primeros : 0) + (x.r < 14 ? x.r : 0), 0)], ['Niños en la bolsa al empezar', ini.bolsa.length], ['Niños en la bolsa tras la primera ronda', fin.bolsa.length]]);
  const grupos = (b: typeof fin.bolsa, primero: boolean): typeof fin.bolsa => b.filter((a) => (a.edad === Math.min(...edadesDe())) === primero);
  function edadesDe(): number[] { const c = ini!.bolsa!.map((a) => a.edad); return [Math.min(...c), Math.max(...c)]; }
  const cols = [...new Set(fin.bolsa.map((a) => a.colegio))].sort();
  say('## Los que quedan en la bolsa');
  say();
  tabla(['Año', 'Quedan', ...cols.map((c) => `…de ${c}`), 'Se quedan en su colegio', 'Quieren probar fuera (o no tienen colegio con club)'], ([['1.er año', true], ['Resto de años', false]] as [string, boolean][]).map(([nombre, p]) => { const xs = grupos(fin.bolsa!, p); return [nombre, xs.length, ...cols.map((c) => xs.filter((a) => a.colegio === c).length), xs.filter((a) => quedan.has(a.id)).length, xs.filter((a) => !quedan.has(a.id)).length]; }));
  DIAGNOSTICO.traza = undefined; DIAGNOSTICO.variantePrimeraRonda = undefined;
  console.log(out.join('\n'));
  process.exit(0);
}

const g = nuevaPartida({ seed: semilla, pais: PAIS.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
const estado = (): NpcsState => g.moduleState<NpcsState>('npcs') as NpcsState;
const pob = (): NonNullable<NpcsState['poblaciones']>[number] => estado().poblaciones!.find((p) => p.deporte === 'futbol')!;
const cat = pob().categorias!.find((c) => c.id === categoria);
if (!cat) throw new Error(`No hay categoría ${categoria}`);
const edades = Array.from({ length: cat.edadMax - cat.edadMin + 1 }, (_, i) => cat.edadMin + i);

say(`# Reparto de ${cat.nombre} · semilla ${semilla} · ${PAIS.id}${soloClub ? ` · club ${soloClub}` : ''}`);
say();
say(`Categoría ${cat.nombre}: de ${cat.edadMin} a ${cat.edadMax} años (${edades.length} años: el primero es «primer año», el resto «segundo año»${edades.length > 2 ? ' y tercero' : ''}). Una plantilla necesita 14 (mínimo de la liga) y admite 18 (más hasta 2 «plazas de más»).`);
say();

// 1. Los niños.
say('## 1. Los niños de la ciudad');
say();
const dia0 = 0;
const todos = estado().npcs.filter((n) => n.genetica && edades.includes(edadNpc(n, dia0) ?? -1));
const interes = (n: (typeof todos)[number]): number => Math.max(n.rasgos?.intereses.futbol ?? 0, n.rasgos?.intereses.deporte ?? 0);
const inicio = guardados.find((x) => x.e.fase === 'inicio' && x.momento === 'crear');
const bolsaIni = inicio?.bolsa ?? [];
const colegios = [...new Set(bolsaIni.map((b) => b.colegio))].sort();
tabla(['Edad', 'Niños en la ciudad', 'Con interés por el fútbol o el deporte (>0)', 'En la bolsa al empezar el reparto', ...colegios.map((c) => `…de ${c}`)], [
  ...edades.map((e) => [e, todos.filter((n) => edadNpc(n, dia0) === e).length, todos.filter((n) => edadNpc(n, dia0) === e && interes(n) > 0).length, bolsaIni.filter((b) => b.edad === e).length, ...colegios.map((c) => bolsaIni.filter((b) => b.edad === e && b.colegio === c).length)]),
  ['Total', todos.length, todos.filter((n) => interes(n) > 0).length, bolsaIni.length, ...colegios.map((c) => bolsaIni.filter((b) => b.colegio === c).length)],
]);
say(`«La bolsa» son los que quieren jugar y aún no tienen equipo: es de donde sacan niños los clubes. Se quedan en el club de su colegio (no van a probar fuera) ${inicio?.e.datos.quedanEnSuColegio ?? '?'} de ellos (el resto va a probar a los clubes de fuera: ${Math.round(100 * Number(cat.probarFuera ?? 0))} % de base, más si son ambiciosos o buenos).`);
say();

// 2. Los clubes.
say('## 2. Los clubes de esta categoría');
say();
const clubes = pob().equipos.filter((e) => e.plantillaPorCategoria);
tabla(['Club', 'Tipo', 'Atractivo (a cuántos de la bolsa llega)', 'Mínimo', 'Máximo'], clubes.filter((e) => !soloClub || e.club === soloClub).map((e) => [e.club, e.colegio !== undefined ? `colegio ${e.colegio}` : (e.tamano ?? 'club'), e.colegio !== undefined ? 'todos sus alumnos' : `${Math.round(100 * atractivoDe(e))} %`, e.plantillaPorCategoria!.min, e.plantillaPorCategoria!.max]));

// 3. El reparto al crear.
say('## 3. El reparto al crear la partida (ronda a ronda)');
say();
const crear = guardados.filter((x) => x.momento === 'crear');
let previa: FotoDeClub[] | undefined;
let ronda = '';
const cuentas: string[] = [];
const cierraRonda = (): void => { if (ronda) say(`${ronda} Cuentas que hace: ${cuentas.join(' · ')}.`); ronda = ''; cuentas.length = 0; };
let ajustes: string[] = [], ajustesSinCambio = 0;
const cierraAjustes = (): void => { if (ajustes.length || ajustesSinCambio) { say(`- **Ajuste de cada club** (los que no caben en ningún equipo por año o por puesto vuelven a la bolsa; luego, tantos equipos como «niños ÷ 14»): ${ajustes.length ? ajustes.join('; ') : 'ningún cambio'}${ajustesSinCambio ? `; sin cambios en ${ajustesSinCambio} clubes` : ''}.`); say(); } ajustes = []; ajustesSinCambio = 0; };
const imprime = (xs: typeof guardados): void => {
  for (const x of xs) {
    const d = x.e.datos;
    const c = x.e.club;
    if (x.acomodo) {
      cierraRonda(); cierraAjustes();
      const a = x.acomodo;
      if (soloClub && a.club !== soloClub) continue;
      say(`- **Acomodar a los que no caben (${a.club})**: ${a.noCabian} niño(s) no caben en ningún equipo por año o por puestos y dejan el club (buscan otro); quedan ${a.quedan} para ${a.equiposAntes} equipo(s) (hacen falta ${a.minimoParaLosEquipos}) → **${a.equiposDespues} equipo(s)**.${a.definitivo ? ' (última ronda: los que no caben quedan apartados ese curso)' : ''}`);
      continue;
    }
    if (soloClub && c && c !== soloClub) continue;
    switch (x.e.fase) {
      case 'inicio': break;
      case 'ronda':
        cierraRonda(); cierraAjustes();
        ronda = `- **${d.etapa} · ${c}**: tiene ${d.kAntes || 0} equipo(s) y quiere llegar a **${d.objetivo}**. En la bolsa hay ${d.enBolsa}, puede mirar ${d.elegibles}${d.porcentaje === null ? ' (el colegio ve a todos sus alumnos)' : ` y van a probar ${d.van} (su atractivo es ${Math.round(100 * Number(d.porcentaje))} %, y pide al menos 14 por equipo nuevo)`}: ${d.vanPrimeros} de primer año.`;
        break;
      case 'paso':
        cuentas.push(`equipo ${d.equipo}: ${d.miembros} niños en el club ${d.seMonta ? '≥' : '<'} 14 × ${d.equipo} = ${d.necesita} → ${d.seMonta ? 'sigue' : '**se deshace**'}`);
        break;
      case 'ajuste':
        cierraRonda();
        if (Number(d.liberados) > 0 || d.kAntes !== d.kDespues) ajustes.push(`${c}: ${d.totalAntes} → ${d.totalDespues} niños (${d.liberados} vuelven a la bolsa), ${d.kAntes} → ${d.kDespues} equipo(s)`); else ajustesSinCambio++;
        break;
      case 'sorteo de C y D':
        cierraRonda(); cierraAjustes();
        say(`- **Sorteo de los equipos C y D**: en la bolsa quedan ${d.enBolsa}; a 14 por equipo salen ${d.equiposQueSalen} equipos nuevos (como mucho 2 por club: ${d.clubes} clubes). Sorteo: ${(d.reparto as string[]).join(', ') || 'ninguno'}.`);
        say();
        break;
      default:
        cierraRonda(); cierraAjustes();
        say();
        say(`#### ${x.e.fase}${d.fallidos !== undefined ? ` (equipos que no se montaron: ${d.fallidos})` : ''}${d.apartados !== undefined ? ` (recogidos por clubes con equipo: ${d.recogidosEnClubesConEquipo}; apartados ese curso: ${d.apartados})` : ''}`);
        say();
        if (x.fotos && (!previa || JSON.stringify(x.fotos) !== JSON.stringify(previa) || !flag('resumen'))) tablaDeFoto(x.fotos, previa); else say('(sin cambios)\n');
        previa = x.fotos;
    }
  }
  cierraRonda(); cierraAjustes();
};
imprime(crear);

// 4. Cómo quedan los equipos.
const fotoFinal = (dia: number, titulo: string): void => {
  say(titulo);
  say();
  const p = pob();
  const filas: (string | number)[][] = [];
  const sinEquipo: string[] = [];
  for (const e of p.equipos.filter((x) => x.plantillaPorCategoria && (!soloClub || x.club === soloClub))) {
    const suyos = estado().npcs.filter((n) => n.deporte === 'futbol' && n.equipo === e.club && edades.includes(edadDeJuego(n, dia) ?? -1));
    if (!suyos.length) { filas.push([nombreDeClub(e), '—', 0, '—', '—', '—', '—', '—', '—']); continue; }
    const max = (e.plantillaPorCategoria!.max) + (e.plazasDeMas?.[categoria] ?? 0);
    const k = e.equiposPorCategoria?.[categoria] ?? 1;
    for (const l of ['A', 'B', 'C', 'D']) {
      const xs = suyos.filter((n) => n.letra?.futbol === l);
      if (!xs.length) continue;
      const pr = xs.filter((n) => edadDeJuego(n, dia) === cat.edadMin).length;
      filas.push([nombreDeClub(e), k, l, xs.length, pr, xs.length - pr, `${max}`, xs.length < 14 ? `**${14 - xs.length}**` : 0, Math.max(0, xs.length - max)]);
    }
    const sin = suyos.filter((n) => !n.letra?.futbol).length;
    if (sin) sinEquipo.push(`${e.club}: ${sin}`);
  }
  tabla(['Club', 'Equipos', 'Equipo', 'Jugadores', '…de 1.er año', '…de 2.º+', 'Máximo (con plazas de más)', 'Faltan para 14', 'Sobran del máximo'], filas);
  if (sinEquipo.length) say(`Niños de un club sin letra de equipo (no caben en ninguno): ${sinEquipo.join(' · ')}.`);
  const enBajo = filas.filter((f) => typeof f[7] === 'string').length;
  say(`**Equipos que no llegan a 14: ${enBajo}** (esos no entran en la liga).`);
  say();
};
say('## 4. Cómo quedan los equipos (A a D) al acabar la creación');
say();
fotoFinal(0, 'Estado final (con las letras que se fijan al acabar):');

// 4b. Qué saldría con otras reglas (solo cuentas, con los niños que tiene cada club al acabar la creación).
const partir = (n: number, t: number): number[] => Array.from({ length: t }, (_, i) => Math.floor(n / t) + (i < n % t ? 1 : 0));
const texto = (xs: number[]): string => (xs.length ? xs.map((x) => (x < 14 ? `**${x}**` : `${x}`)).join('+') : '—');
/** Por año: cada año de nacimiento (el primero, y los demás juntos) en equipos iguales de como mucho `max`. */
const porAnio = (a: number, b: number, max: number): number[] => [a, b].flatMap((n) => (n ? partir(n, Math.ceil(n / max)) : []));
/** Mezclando años: tantos equipos iguales como quepan de 14 (si no se pasan del máximo). */
const mezclado = (n: number, max: number): number[] => { const t = Math.max(Math.ceil(n / max), Math.floor(n / 14), 1); return n ? partir(n, t) : []; };
say('## 4b. Qué saldría con otras reglas (solo las cuentas de cada club con sus niños de ahora)');
say();
say('Los números en **negrita** son equipos que no llegarían a 14. «Hoy» es lo que ha salido. «Por año» pone cada año de nacimiento en sus propios equipos iguales; «mezclando» junta todos los años y hace tantos equipos como quepan de 14 (como en un club de verdad con una sola categoría). No mueve a nadie de club.');
say();
{
  const filas: (string | number)[][] = [];
  const tot = { hoy: [0, 0], a18: [0, 0], a22: [0, 0], mez18: [0, 0], mez22: [0, 0] } as Record<string, number[]>;
  const cuenta = (k: string, xs: number[]): void => { tot[k][0] += xs.filter((x) => x >= 14).length; tot[k][1] += xs.filter((x) => x < 14).reduce((u, v) => u + v, 0); };
  for (const e of pob().equipos.filter((x) => x.plantillaPorCategoria && (!soloClub || x.club === soloClub))) {
    const suyos = estado().npcs.filter((n) => n.deporte === 'futbol' && n.equipo === e.club && edades.includes(edadDeJuego(n, 0) ?? -1));
    if (!suyos.length) continue;
    const pr = suyos.filter((n) => edadDeJuego(n, 0) === cat.edadMin).length;
    const re = suyos.length - pr;
    const hoy = ['A', 'B', 'C', 'D'].map((l) => suyos.filter((n) => n.letra?.futbol === l).length).filter((x) => x > 0);
    const t18 = porAnio(pr, re, 18), t22 = porAnio(pr, re, 22), m18 = mezclado(suyos.length, 18), m22 = mezclado(suyos.length, 22);
    cuenta('hoy', hoy); cuenta('a18', t18); cuenta('a22', t22); cuenta('mez18', m18); cuenta('mez22', m22);
    filas.push([nombreDeClub(e), `${pr} + ${re}`, texto(hoy), texto(t18), texto(t22), texto(m18)]);
  }
  tabla(['Club', 'Niños (1.er año + resto)', 'Hoy', 'Por año, máx 18', 'Por año, máx 22', 'Mezclando años, máx 18'], filas);
  tabla(['Regla', 'Equipos que llegan a 14', 'Niños en equipos que no llegan'], [['Hoy', tot.hoy[0], tot.hoy[1]], ['Por año, máx 18', tot.a18[0], tot.a18[1]], ['Por año, máx 22', tot.a22[0], tot.a22[1]], ['Mezclando años, máx 18', tot.mez18[0], tot.mez18[1]], ['Mezclando años, máx 22', tot.mez22[0], tot.mez22[1]]]);
}

// 5. Quién queda fuera.
say('## 5. Quién queda fuera y por qué');
say();
const fin = crear.filter((x) => x.e.fase === 'fin del reparto de la categoría').pop();
const libres = estado().npcs.filter((n) => n.genetica && n.deporte === undefined && edades.includes(edadNpc(n, 0) ?? -1) && interes(n) > 0);
const apartados = libres.filter((n) => n.apartado?.includes('futbol'));
tabla(['Edad', 'Quieren jugar y no tienen equipo', '…de ellos apartados ese curso'], edades.map((e) => [e, libres.filter((n) => edadNpc(n, 0) === e).length, apartados.filter((n) => edadNpc(n, 0) === e).length]));
say(`Al acabar el reparto de la categoría quedaban ${fin?.e.datos.apartados ?? '?'} niños sin sitio en ningún club con equipo: ninguna de las rondas les monta un equipo si no son al menos 14 en la misma categoría (y, para un colegio, del mismo colegio). Los clubes de fuera solo recogen descartes si ya tienen un equipo con el mínimo.`);
say();

// 6. El verano siguiente.
if (!flag('sin-verano')) {
  momento = 'verano';
  const n0 = guardados.length;
  advanceToWeek(g, 'gen.descansar', 54, 2, 15);
  const dia = (g.time.week - g.time.schoolWeek) * 7;
  say('## 6. El verano siguiente');
  say();
  const verano = guardados.slice(n0).filter((x) => x.momento === 'verano');
  previa = undefined;
  imprime(verano);
  if (cierres.length) { say('Equipos que se cierran por quedar con menos de 14 por equipo (paso 2):'); say(); for (const c of cierres) say(`- ${c}`); say(); }
  fotoFinal(dia, '### Estado final tras el verano');
}
DIAGNOSTICO.traza = undefined;
DIAGNOSTICO.alCerrar = undefined;
DIAGNOSTICO.alAcomodar = undefined;
console.log(out.join('\n'));
