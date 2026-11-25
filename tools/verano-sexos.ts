/**
 * El verano con la población nueva (chicas al ~10 %, chicos y chicas por separado desde infantil, equipos femeninos solo en clubes externos), con las reglas de hoy o con el método nuevo
 * (`docs/relevo/veranos-sexos.md`). Solo mide: no cambia el juego (todo son banderas apagadas).
 * `npx tsx tools/verano-sexos.ts <semilla> <m|f> <hoy|nuevo>`: un mundo de la semilla (`m`: chicos desde infantil y benjamín y alevín mixtos; `f`: chicas desde infantil, sin equipos de colegio), el reparto
 * nuevo de inicio (con equilibrar), un curso entero y el verano siguiente. Salida: una línea `#W {json}` (la agrega `tools/verano-sexos-tabla.ts`).
 */
import { PAIS_CIUDAD_GRANDE, registrarPais } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { convocarYAlinear } from '@ds/mod-futbol';
import { DIAGNOSTICO, LETRAS_FIJADAS, MEDIDA, SESGO_DE_SEXO, edadDeJuego, interesDe, type NpcsState } from '@ds/mod-npcs';
import type { Npc } from '@ds/mod-npcs';

const [semillaTxt = '51', mundo = 'm', verano = 'hoy', respetar = 'no'] = process.argv.slice(2);
MEDIDA.respetarReparto = respetar === 'si';
const seed = Number(semillaTxt);
registrarPais(PAIS_CIUDAD_GRANDE);
const titulares = (js: unknown): string[] => convocarYAlinear(js as never).titulares.map((x) => x.id);
// El reparto nuevo de inicio.
DIAGNOSTICO.variantePrimeraRonda = { porAnio: 14 };
DIAGNOSTICO.variantePaso23 = { completarBMixto: 20, reagrupar: true, paso7: true, bolsaBA: true, equilibrar: true, maxPorEquipo: { benjamin: 18, alevin: 18, infantil: 20, cadete: 20 }, subirTitulares: { infantil: true, cadete: true }, titulares } as never;
DIAGNOSTICO.variantJuvenil = { cascada: 'usuario', titulares } as never;
SESGO_DE_SEXO.deportes = ['futbol'];
SESGO_DE_SEXO.chicas = 0.11;
SESGO_DE_SEXO.solo = mundo === 'f' ? 'f' : 'm';
SESGO_DE_SEXO.desdeEdad = 12;
if (mundo === 'f') SESGO_DE_SEXO.sinColegios = true;

/** Los equipos que deja cada paso final del reparto (la traza), antes de que el resto de la creación mueva a nadie. */
const tamanosDe = (eqs: { A: number; B: number; C?: number; D?: number }[]): number[] => eqs.flatMap((q) => [q.A, q.B, q.C ?? 0, q.D ?? 0].filter((x) => x > 0));
const trazaCrea: Record<string, number[]> = {};
const trazaVera: Record<string, number[]> = {};
const usuario: Record<string, Record<string, number>> = {};
DIAGNOSTICO.traza = (e) => { if (e.fase === 'fin equilibrio' || e.fase === 'fin J3') trazaCrea[e.categoria] = tamanosDe(e.datos.equipos as never); };
const g = nuevaPartida({ seed, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
advanceToWeek(g, 'gen.descansar', 0, 2, 9);
advanceToWeek(g, 'gen.descansar', 48, 2, 15);
const dia0 = (g.time.week - g.time.schoolWeek) * 7;
const s0 = g.moduleState<NpcsState>('npcs') as NpcsState;
const pob0 = s0.poblaciones!.find((p) => p.deporte === 'futbol')!;
const cats = pob0.categorias!;
const catDe = (edad: number): { id: string; anio: number } | undefined => { const c = cats.find((x) => edad >= x.edadMin && edad <= x.edadMax); return c ? { id: c.id, anio: edad - c.edadMin + 1 } : undefined; };
const clave = (c: { id: string; anio: number } | undefined): string => (c ? `${c.id}|${c.anio}` : 'fuera|0');
const esJugador = (n: Npc): boolean => n.deporte === 'futbol' && !!n.genetica && !n.id.startsWith('personaje@');
const relevante = (catId: string): boolean => mundo === 'm' || ['infantil', 'cadete', 'juvenil'].includes(catId);
const sexoDe = (n: Npc): string => (n.gender === 'f' ? 'f' : 'm');
const valorDe = (n: Npc): number => n.vp?.futbol?.puestos?.[n.puesto?.futbol ?? ''] ?? n.vp?.futbol?.valor ?? n.levels.futbol ?? 0;

/** Los equipos de una foto de la población: club, categoría y letra; tamaños y nivel. */
type Equipo = { club: string; cat: string; letra: string; ids: string[] };
const equiposDe2 = (npcs: readonly Npc[], dia: number): Equipo[] => {
  const mapa = new Map<string, Equipo>();
  for (const n of npcs) {
    if (!esJugador(n) || !n.equipo || !n.letra?.futbol) continue;
    const cat = catDe(edadDeJuego(n, dia) ?? -1);
    if (!cat || !relevante(cat.id)) continue;
    const k = `${n.equipo}|${cat.id}|${n.letra.futbol}`;
    const e = mapa.get(k) ?? mapa.set(k, { club: n.equipo, cat: cat.id, letra: n.letra.futbol, ids: [] }).get(k)!;
    e.ids.push(n.id);
  }
  return [...mapa.values()];
};
const porId0 = new Map(s0.npcs.map((n) => [n.id, n]));
const equiposAntes = equiposDe2(s0.npcs, dia0);
type Nivel = { clubesConC: number; cMejorA: number; cMejorAOnce: number; clubesConD: number; dMejorB: number; dMejorBOnce: number };
const nivelEquipos = (equipos: Equipo[], porId: ReadonlyMap<string, Npc>): Record<string, Nivel> => {
  const out: Record<string, Nivel> = {};
  const media = (ids: string[], n = ids.length): number => { const v = ids.map((i) => valorDe(porId.get(i)!)).sort((a, b) => b - a).slice(0, n); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };
  const porClubCat = new Map<string, Record<string, string[]>>();
  for (const e of equipos) { const k = `${e.club}|${e.cat}`; (porClubCat.get(k) ?? porClubCat.set(k, {}).get(k)!)[e.letra] = e.ids; }
  for (const [k, t] of porClubCat) {
    const r = out[k.split('|')[1]] ?? (out[k.split('|')[1]] = { clubesConC: 0, cMejorA: 0, cMejorAOnce: 0, clubesConD: 0, dMejorB: 0, dMejorBOnce: 0 });
    if (t.C && t.A) { r.clubesConC++; if (media(t.C) > media(t.A)) r.cMejorA++; if (media(t.C, 11) > media(t.A, 11)) r.cMejorAOnce++; }
    if (t.D && t.B) { r.clubesConD++; if (media(t.D) > media(t.B)) r.dMejorB++; if (media(t.D, 11) > media(t.B, 11)) r.dMejorBOnce++; }
  }
  return out;
};
const kAntes = new Map<string, number>();
for (const e of pob0.equipos.filter((x) => x.plantillaPorCategoria)) for (const [c, k] of Object.entries(e.equiposPorCategoria ?? {})) kAntes.set(`${e.club}|${c}`, k);

const antes = new Map<string, { club?: string; clave: string; sexo: string }>();
for (const n of s0.npcs) if (esJugador(n)) antes.set(n.id, { ...(n.equipo !== undefined ? { club: n.equipo } : {}), clave: clave(catDe(edadDeJuego(n, dia0) ?? -1)), sexo: sexoDe(n) });
const existian = new Set(s0.npcs.map((n) => n.id));
const apartadosAntes = new Set(s0.npcs.filter((n) => n.apartado?.includes('futbol')).map((n) => n.id));

type Fila = Record<string, number>;
const filas = new Map<string, Fila>();
const suma = (k: string, campo: string, v = 1): void => { const f = filas.get(k) ?? filas.set(k, {}).get(k)!; f[campo] = (f[campo] ?? 0) + v; };
const probar = new Map<string, { sentido: string; entra: boolean }>();
const desplazados = new Map<string, string>();
const cierres: Record<string, number> = {};
const eq: Record<string, Record<string, number>> = {};
LETRAS_FIJADAS.clear();
MEDIDA.respetarReparto = verano !== 'hoy';
DIAGNOSTICO.veranoNuevo = verano === 'nuevo';
DIAGNOSTICO.veranoUsuario = verano === 'usuario';
DIAGNOSTICO.alProbar = (d) => { if (antes.has(d.id)) probar.set(d.id, { sentido: d.sentido, entra: d.entra }); };
DIAGNOSTICO.alDesplazar = (d) => { if (antes.has(d.id)) desplazados.set(d.id, d.motivo); };
DIAGNOSTICO.alCerrar = (d) => { cierres[d.categoria] = (cierres[d.categoria] ?? 0) + Math.max(1, d.equipos - d.montables); };
DIAGNOSTICO.traza = (e) => {
  if (e.fase === 'verano usuario') usuario[e.categoria] = Object.fromEntries(Object.entries(e.datos).filter(([, v]) => typeof v === 'number')) as Record<string, number>;
  if (e.fase === 'fin equilibrio') trazaVera[e.categoria] = tamanosDe(e.datos.equipos as never);
  if (e.fase === 'fin equilibrio') eq[e.categoria] = Object.fromEntries(Object.entries(e.datos).filter(([, v]) => typeof v === 'number')) as Record<string, number>;
};
const listas: Record<string, Map<string, Npc>> = {};
let diaNuevo = 0;
DIAGNOSTICO.alVerano = (fase, lista, dia) => { diaNuevo = dia; listas[fase] = new Map(lista.map((n) => [n.id, n])); };
advanceToWeek(g, 'gen.descansar', 54, 2, 15);
DIAGNOSTICO.alVerano = undefined; DIAGNOSTICO.alProbar = undefined; DIAGNOSTICO.alDesplazar = undefined; DIAGNOSTICO.alCerrar = undefined; DIAGNOSTICO.traza = undefined;
const tras = listas['tras abandono'], fin = listas.fin, inicio = listas.inicio;
if (!tras || !fin || !inicio) throw new Error('No ha llegado el verano');
const s1 = g.moduleState<NpcsState>('npcs') as NpcsState;
const edadNueva = (n: Npc): number => edadDeJuego(n, diaNuevo) ?? -1;
const edadMax = pob0.reclutamiento.edades.max;

// Los que había: abandono, cambio de club, sube, fuera y por qué.
for (const [id, a] of antes) {
  const [catId] = a.clave.split('|');
  if (!relevante(catId)) continue;
  const k = a.clave;
  const sx = ['infantil', 'cadete', 'juvenil'].includes(catId) ? a.sexo : 'mixto';
  const s = (campo: string, v = 1): void => { suma(k, campo, v); suma(`${k}#${sx}`, campo, v); };
  s('habia');
  const t = tras.get(id), f = fin.get(id);
  if (!inicio.has(id)) { s('desaparece'); continue; }
  const antiguo = t?.deporte === undefined;
  let motivoFuera: string | undefined;
  if (antiguo) {
    const n = tras.get(id)!;
    if (n.dejado?.includes('futbol')) s('abandona');
    else if (edadNueva(n) > edadMax) s('sale_por_arriba');
    else if (SESGO_DE_SEXO.solo && edadNueva(n) >= 12 && n.gender !== SESGO_DE_SEXO.solo) s('pasa_otro_sexo');
    else { s('libre_fin_colegio'); motivoFuera = 'fin_colegio'; }
  } else { s('sigue'); s(`a:${clave(catDe(edadNueva(t!)))}`); }
  const busca = probar.has(id) || desplazados.has(id) || motivoFuera === 'fin_colegio';
  if (busca) { s('busca'); if (f?.deporte === 'futbol') { s('busca_consigue'); if (f.equipo !== a.club) s('busca_cambia_club'); } }
  if (desplazados.has(id)) s(`busca_${desplazados.get(id)}`);
  if (probar.has(id)) s(`busca_probar_${probar.get(id)!.sentido}`);
  if (f?.deporte === 'futbol') { if (f.equipo !== a.club) s('cambia_club'); s('al_final_juega'); }
  else if (!antiguo || motivoFuera) {
    // Se queda fuera: por qué.
    if (f?.dejado?.includes('futbol')) s('fuera_dejo_dos_plazos');
    else s(`fuera_${desplazados.get(id) ?? motivoFuera ?? 'sin_hueco'}`);
  }
}
// Quién entra (no jugaban y juegan).
for (const [id, f] of fin) {
  if (!esJugador(f) || antes.has(id)) continue;
  const catId = catDe(edadNueva(f))?.id ?? '';
  if (!relevante(catId)) continue;
  const k = clave(catDe(edadNueva(f)));
  const sx = ['infantil', 'cadete', 'juvenil'].includes(catId) ? sexoDe(f) : 'mixto';
  const s = (campo: string): void => { suma(k, campo); suma(`${k}#${sx}`, campo); };
  if (!existian.has(id)) s('entra_mudanza'); else if (edadNueva(f) === 8) s('entra_8_anos'); else if (apartadosAntes.has(id)) s('entra_apartado_vuelve'); else s('entra_no_jugaba');
}
// Los que quieren y siguen sin equipo tras el verano, por año (de la nueva categoría).
for (const [, n] of fin) {
  if (!n.genetica || n.deporte !== undefined || n.dejado?.includes('futbol')) continue;
  const edad = edadNueva(n);
  const cat = catDe(edad);
  if (!cat || !relevante(cat.id)) continue;
  if (interesDe(n, 'futbol', edad) <= 0) continue;
  { const sx = ['infantil', 'cadete', 'juvenil'].includes(cat.id) ? sexoDe(n) : 'mixto'; suma(`${clave(cat)}#${sx}`, 'bolsa_final'); }
  suma(clave(cat), 'bolsa_final');
}
for (const [, n] of fin) if (esJugador(n)) { const c = catDe(edadNueva(n)); if (c && relevante(c.id)) { suma(clave(c), 'empieza_final'); suma(`${clave(c)}#${['infantil', 'cadete', 'juvenil'].includes(c.id) ? sexoDe(n) : 'mixto'}`, 'empieza_final'); } }
for (const [, n] of tras) if (esJugador(n)) { const c = catDe(edadNueva(n)); if (c && relevante(c.id)) suma(clave(c), 'empieza_sin_rehacer'); }

// Los equipos antes y después.
const porId1 = new Map(s1.npcs.map((n) => [n.id, n]));
const equiposDespues = equiposDe2(s1.npcs, diaNuevo);
const resumen = (equipos: Equipo[]): Record<string, { equipos: number; bajo: number; porLetra: Record<string, number>; min: number; max: number; jugadores: number }> => {
  const out: Record<string, { equipos: number; bajo: number; porLetra: Record<string, number>; min: number; max: number; jugadores: number }> = {};
  for (const e of equipos) {
    const r = out[e.cat] ?? (out[e.cat] = { equipos: 0, bajo: 0, porLetra: {}, min: 999, max: 0, jugadores: 0 });
    r.equipos++; r.porLetra[e.letra] = (r.porLetra[e.letra] ?? 0) + 1; r.jugadores += e.ids.length; r.min = Math.min(r.min, e.ids.length); r.max = Math.max(r.max, e.ids.length);
    if (e.ids.length < 14) r.bajo++;
  }
  return out;
};
// Equipos que se deshacen / se abren (por club y categoría).
const nEquipos = (equipos: Equipo[]): Map<string, number> => { const m = new Map<string, Set<string>>(); for (const e of equipos) (m.get(`${e.club}|${e.cat}`) ?? m.set(`${e.club}|${e.cat}`, new Set()).get(`${e.club}|${e.cat}`)!).add(e.letra); return new Map([...m].map(([k, v]) => [k, v.size])); };
const antesN = nEquipos(equiposAntes), despuesN = nEquipos(equiposDespues);
const cambiosEq: Record<string, { cierran: number; abren: number }> = {};
for (const k of new Set([...antesN.keys(), ...despuesN.keys()])) {
  const cat = k.split('|')[1];
  const a = antesN.get(k) ?? 0, d = despuesN.get(k) ?? 0;
  const r = cambiosEq[cat] ?? (cambiosEq[cat] = { cierran: 0, abren: 0 });
  if (d < a) r.cierran += a - d; else if (d > a) r.abren += d - a;
}
void kAntes;
const tiposDe = (equipos: Equipo[]): Record<string, Record<string, number>> => { const out: Record<string, Record<string, number>> = {}; for (const e of equipos) { const t = e.club.startsWith('colegio') ? 'colegio' : e.club.startsWith('club_pequeno') ? 'pequeno' : e.club.startsWith('club_mediano') ? 'mediano' : 'grande'; const sx = ['infantil', 'cadete', 'juvenil'].includes(e.cat) ? 'x' : 'mixto'; void sx; (out[e.cat] ??= {})[t] = (out[e.cat][t] ?? 0) + 1; } return out; };
// El mercado: quién sale (abandona o busca otras oportunidades) y cómo queda cada equipo sin ellos, por tipo de club.
const tipoDe = (club: string): string => (club.startsWith('colegio') ? 'colegio' : club.startsWith('club_pequeno') ? 'pequeno' : club.startsWith('club_mediano') ? 'mediano' : 'grande');
const mercado: Record<string, Record<string, { equipos: number; tam: number; tamSinAband: number; tamSinTodos: number; bajoAband: number; bajoTodos: number; bajo0: number }>> = {};
for (const e of equiposAntes) {
  const sx = ['infantil', 'cadete', 'juvenil'].includes(e.cat) ? (porId0.get(e.ids[0]) ? sexoDe(porId0.get(e.ids[0])!) : 'm') : 'mixto';
  const aband = e.ids.filter((id) => tras.get(id)?.dejado?.includes('futbol') && tras.get(id)?.deporte === undefined).length;
  const busca = e.ids.filter((id) => probar.has(id) && !(tras.get(id)?.dejado?.includes('futbol'))).length;
  const k = `${e.cat}#${sx}`;
  const t = ((mercado[k] ??= {})[tipoDe(e.club)] ??= { equipos: 0, tam: 0, tamSinAband: 0, tamSinTodos: 0, bajoAband: 0, bajoTodos: 0, bajo0: 0 });
  t.equipos++; t.tam += e.ids.length; t.tamSinAband += e.ids.length - aband; t.tamSinTodos += e.ids.length - aband - busca;
  if (e.ids.length < 14) t.bajo0++; if (e.ids.length - aband < 14) t.bajoAband++; if (e.ids.length - aband - busca < 14) t.bajoTodos++;
}
// Subidas y bajadas entre letras (los que siguen en el mismo club): letra de antes > letra de después, por categoría nueva y sexo.
const letras: Record<string, Record<string, number>> = {};
for (const [id, a] of antes) {
  const n1 = porId1.get(id), n0 = porId0.get(id);
  if (!n0 || !n1 || !esJugador(n1) || n1.equipo !== a.club || !n0.letra?.futbol || !n1.letra?.futbol) continue;
  const c = catDe(edadDeJuego(n1, diaNuevo) ?? -1);
  if (!c || !relevante(c.id)) continue;
  const sx = ['infantil', 'cadete', 'juvenil'].includes(c.id) ? sexoDe(n1) : 'mixto';
  const k = `${c.id}#${sx}`;
  const t = `${n0.letra.futbol}>${n1.letra.futbol}`;
  (letras[k] ??= {})[t] = (letras[k][t] ?? 0) + 1;
}
console.log(`#W ${JSON.stringify({ seed, mundo, verano, filas: Object.fromEntries(filas), antes: resumen(equiposAntes), despues: resumen(equiposDespues), nivelAntes: nivelEquipos(equiposAntes, porId0), nivelDespues: nivelEquipos(equiposDespues, porId1), cambiosEq, cierres, eq, trazaCrea, trazaVera, letras, mercado, usuario, tiposAntes: tiposDe(equiposAntes), tiposDespues: tiposDe(equiposDespues) })}`);
