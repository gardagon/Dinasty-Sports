/**
 * Cuánta gente de origen extranjero sale en el mundo del juego y cómo se emparejan los padres. `npm run demografia -- [semillas] [pais]`.
 * Solo mide: no cambia nada del juego. Informe en docs/relevo/demografia-origenes.md.
 * - Con la población real de una partida (compañeros, niños de otros colegios, adultos, hermanos, padres, personaje).
 * - Con la generación por separado (miles de padres y de hijos) para ver el emparejamiento y las mezclas con precisión.
 */
import { PAIS_CIUDAD_GRANDE, demografiaDelLugar, ORIGENES, origenAlAzar, origenHeredado, origenDeJugador, padresDeSemilla, registrarPais, paisPorId, rngEstable, type OrigenFamiliar } from '@ds/contracts';
import { MODULOS, nuevaPartida } from '@ds/game';
import { edadNpc, type NpcsState } from '@ds/mod-npcs';

const SEMILLAS = Number(process.argv[2] ?? 5);
const PAIS = process.argv[3] ?? PAIS_CIUDAD_GRANDE.id;
registrarPais(PAIS_CIUDAD_GRANDE);
const esLocal = (id: string): boolean => id.startsWith('espana_');
const pct = (n: number, d: number): string => (d ? ((100 * n) / d).toFixed(1) : '-').padStart(5) + ' %';

interface Acum { n: number; propio: number; mezcla: number; mezclaExt: number; extPeso: number; porOrigen: Record<string, number>; conPadreExt: number; conPadres: number }
const nuevo = (): Acum => ({ n: 0, propio: 0, mezcla: 0, mezclaExt: 0, extPeso: 0, porOrigen: {}, conPadreExt: 0, conPadres: 0 });
/** Origen propio extranjero = algún origen no español en su mezcla («visible»: nombre o apellido o aspecto distinto); extPeso = fracción de sangre extranjera. */
function sumar(a: Acum, o: OrigenFamiliar): void {
  a.n++;
  const ext = o.filter((x) => !esLocal(x.id));
  if (ext.length) a.propio++;
  if (o.length > 1) a.mezcla++;
  if (o.length > 1 && ext.length) a.mezclaExt++;
  a.extPeso += ext.reduce((s, x) => s + x.peso, 0);
  for (const x of ext) a.porOrigen[x.id] = (a.porOrigen[x.id] ?? 0) + 1;
}
function imprimir(titulo: string, a: Acum): void {
  const orig = Object.entries(a.porOrigen).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ${pct(v, a.n).trim()}`).join(' · ');
  console.log(`${titulo.padEnd(34)} n=${String(a.n).padStart(6)}  extranjero propio ${pct(a.propio, a.n)}  sangre ext. ${pct(a.extPeso, a.n)}  mezclas ${pct(a.mezcla, a.n)} (con ext. ${pct(a.mezclaExt, a.n)})${a.conPadres ? `  ≥1 padre ext. ${pct(a.conPadreExt, a.conPadres)}` : ''}\n    ${orig}`);
}

const grupos: Record<string, Acum> = {};
const g_ = (k: string): Acum => (grupos[k] ??= nuevo());
// Muestra de 20 conocidos: cuántos son visiblemente extranjeros (los del colegio del personaje).
const conocidos20: number[] = [];

for (let seed = 1; seed <= SEMILLAS; seed++) {
  const g = nuevaPartida({ seed, pais: PAIS, deportes: ['atletismo'] }, MODULOS);
  const s = g.moduleState<NpcsState>('npcs') as NpcsState;
  const pais = paisPorId(PAIS);
  const padres = padresDeSemilla(seed, pais);
  sumar(g_('personaje (al crear partida)'), origenDeJugador(seed, pais));
  const pa = g_('padres del personaje');
  sumar(pa, padres.padre.origen); sumar(pa, padres.madre.origen);
  const p0 = g_('personaje: ≥1 padre extranjero');
  p0.n++; if (padres.padre.origen.some((x) => !esLocal(x.id)) || padres.madre.origen.some((x) => !esLocal(x.id))) p0.propio++;
  const companeros: OrigenFamiliar[] = [];
  for (const n of s.npcs) {
    const o = n.rasgos?.origen;
    if (!o) continue;
    const e = edadNpc(n, 0);
    if (e === undefined) continue;
    const esHermano = n.tags.includes('hermano');
    if (esHermano) { sumar(g_('hermanos del personaje'), o); continue; }
    if (n.role === 'familia') continue;
    if (n.role === 'companero' && /^alumno_/.test(n.id)) { sumar(g_('alumnos del colegio (8-17)'), o); if (e >= 8 && e <= 9) sumar(g_('alumnos de la edad del personaje'), o); if (e === 8 || e === 9) companeros.push(o); continue; }
    if (/^nino_/.test(n.id)) { sumar(g_('niños de otros colegios'), o); continue; }
    if (e < 18) sumar(g_('otros menores'), o);
    else sumar(g_(`adultos (${n.role})`), o), sumar(g_('adultos (todos)'), o);
  }
  // Sus 20 conocidos: 20 al azar de los compañeros de 8-9 años y adultos cercanos.
  const rng = rngEstable('muestra20', seed);
  for (let r = 0; r < 200; r++) { let k = 0; for (let i = 0; i < 20; i++) { const o = companeros[rng.int(0, companeros.length - 1)]; if (o?.some((x) => !esLocal(x.id))) k++; } conocidos20.push(k); }
}
console.log(`\n=== Población real de una partida (${PAIS}, ${SEMILLAS} semillas) ===`);
for (const [k, a] of Object.entries(grupos)) { if (k === 'personaje: ≥1 padre extranjero') console.log(`${k.padEnd(34)} n=${a.n}  ${pct(a.propio, a.n)}`); else imprimir(k, a); }
const media = conocidos20.reduce((a, b) => a + b, 0) / conocidos20.length;
console.log(`De 20 compañeros de 8-9 años: media ${media.toFixed(1)} con origen extranjero; ≥4: ${pct(conocidos20.filter((k) => k >= 4).length, conocidos20.length)}`);

// ------------------------------------------------------------------------------------- el personaje al crear partida (muchas semillas)
{
  const pais = paisPorId(PAIS);
  const SEM = 20000;
  const pj = nuevo(), pd = nuevo();
  let unPadre = 0, dosPadres = 0, mismo = 0, apellidoExt = 0, mestizo = 0;
  for (let seed = 1; seed <= SEM; seed++) {
    const { padre, madre } = padresDeSemilla(seed, pais);
    sumar(pd, padre.origen); sumar(pd, madre.origen);
    const o = origenDeJugador(seed, pais);
    sumar(pj, o);
    const a = padre.origen.some((x) => !esLocal(x.id)), b = madre.origen.some((x) => !esLocal(x.id));
    if (a || b) unPadre++;
    if (a && b) { dosPadres++; if (padre.origen.length === 1 && madre.origen.length === 1 && padre.origen[0].id === madre.origen[0].id) mismo++; }
    if (a !== b) mestizo++;
    if (a || b) apellidoExt++;
  }
  console.log(`\n=== El personaje al crear partida (${SEM} semillas, ${PAIS}) ===`);
  imprimir('padres (padre y madre)', pd);
  imprimir('personaje', pj);
  console.log(`≥1 padre extranjero ${pct(unPadre, SEM)}; los dos ${pct(dosPadres, SEM)} (mismo origen ${pct(mismo, Math.max(1, dosPadres))}); solo uno (personaje mestizo) ${pct(mestizo, SEM)}`);
}

// ------------------------------------------------------------------------------------- generación aislada (muestra grande)
const N = 200000;
const demografia = demografiaDelLugar(paisPorId(PAIS));
const rng = rngEstable('muestra-grande', 1);
const ext = (o: OrigenFamiliar): boolean => o.some((x) => !esLocal(x.id));
const adultos = nuevo();
const hijos = nuevo();
let mixtos = 0, parejasExtExt = 0, parejasExt = 0, parejasMismo = 0;
for (let i = 0; i < N; i++) {
  const a = origenAlAzar(rng, demografia);
  sumar(adultos, a);
  const b = origenAlAzar(rng, demografia);
  const h = origenHeredado(a, b);
  sumar(hijos, h);
  hijos.conPadres++; if (ext(a) || ext(b)) hijos.conPadreExt++;
  if (ext(a) !== ext(b)) mixtos++;
  if (ext(a) && ext(b)) { parejasExtExt++; if (a.length === 1 && b.length === 1 && a[0].id === b[0].id) parejasMismo++; }
  if (ext(a) || ext(b)) parejasExt++;
}
console.log(`\n=== Generación aislada (${N} adultos y ${N} parejas, demografía de ${PAIS}) ===`);
imprimir('adulto sorteado', adultos);
imprimir('hijo de dos adultos sorteados por separado', hijos);
console.log(`Parejas con ≥1 extranjero ${pct(parejasExt, N)}; con los dos extranjeros ${pct(parejasExtExt, N)} (del mismo origen ${pct(parejasMismo, Math.max(1, parejasExtExt))}); un extranjero y otro no (hijo mestizo) ${pct(mixtos, N)}`);
const total = Object.values(demografia).reduce((a, b) => a + b, 0);
console.log(`Peso extranjero en la demografía: ${pct(Object.entries(demografia).filter(([k]) => !esLocal(k)).reduce((a, [, v]) => a + v, 0), total)}`);

// ------------------------------------------------------------------------------------- propuesta (NO está activada en el juego)
/** Demografía propuesta (adultos): ~19 % de origen extranjero. España repartida como hoy (15/30/30 → 20/40/40 del 81 %). */
const PROPUESTA: Record<string, number> = { espana_norte: 0.162, espana_centro: 0.324, espana_sur: 0.324, latinoamerica: 0.06, magreb: 0.04, africa_subsahariana: 0.017, europa_este: 0.035, europa_norte: 0.02, asia_oriental: 0.018 };
/** Emparejamiento propuesto: si el primero es extranjero, la pareja comparte su origen con esta probabilidad (si no, sorteo libre). */
const ENDOGAMIA = Number(process.env.ENDOGAMIA ?? 0.6);
/** Pareja por tipo (propuesta): ambos de fuera, mixta (uno de fuera) o ambos de aquí; en las de fuera, el mismo origen con `MISMO` probabilidad. */
const AMBOS_EXT = Number(process.env.AMBOS_EXT ?? 0.13), MIXTA = Number(process.env.MIXTA ?? 0.12), MISMO = Number(process.env.MISMO ?? 0.7);
const soloFuera = (dem: Record<string, number>) => Object.fromEntries(Object.entries(dem).filter(([k]) => !esLocal(k)));
const soloAqui = (dem: Record<string, number>) => Object.fromEntries(Object.entries(dem).filter(([k]) => esLocal(k)));
function parejaDe(rng: ReturnType<typeof rngEstable>, dem: Record<string, number>, endogamia: number): [OrigenFamiliar, OrigenFamiliar] {
  if (endogamia === 0) return [origenAlAzar(rng, dem), origenAlAzar(rng, dem)];
  const u = rng.next();
  const fuera = soloFuera(dem), aqui = soloAqui(dem);
  if (u < AMBOS_EXT) { const a = origenAlAzar(rng, fuera); return [a, rng.chance(MISMO) ? a : origenAlAzar(rng, fuera)]; }
  if (u < AMBOS_EXT + MIXTA) { const f = origenAlAzar(rng, fuera), l = origenAlAzar(rng, aqui); return rng.chance(0.5) ? [f, l] : [l, f]; }
  return [origenAlAzar(rng, aqui), origenAlAzar(rng, aqui)];
}
function medir(titulo: string, dem: Record<string, number>, endogamia: number): void {
  const r = rngEstable('propuesta', 7);
  const ad = nuevo(), hi = nuevo();
  let dos = 0, uno = 0, tot = 0;
  for (let i = 0; i < N; i++) {
    const [a, b] = parejaDe(r, dem, endogamia);
    sumar(ad, a);
    const h = origenHeredado(a, b);
    sumar(hi, h);
    tot++;
    const ea = ext(a), eb = ext(b);
    if (ea && eb) dos++; else if (ea || eb) uno++;
  }
  console.log(`\n--- ${titulo} (${endogamia ? 'parejas por tipo' : 'parejas libres'}) ---`);
  imprimir('adulto', ad);
  imprimir('hijo de una pareja', hi);
  console.log(`≥1 progenitor extranjero ${pct(dos + uno, tot)}; los dos ${pct(dos, tot)}; solo uno ${pct(uno, tot)}; de los hijos con algún progenitor extranjero, mestizos ${pct(uno, dos + uno)}`);
}
console.log('\n=== Comparación de variantes (200000 parejas cada una) ===');
medir('Hoy (demografía actual, parejas libres)', demografia, 0);
medir('Propuesta: demografía nueva + endogamia', PROPUESTA, ENDOGAMIA);
medir('Solo demografía nueva (parejas libres)', PROPUESTA, 0);
medir('Propuesta con demografía actual por tipo de pareja', demografia, ENDOGAMIA);
