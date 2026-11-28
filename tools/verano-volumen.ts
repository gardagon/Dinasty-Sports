/**
 * El volumen de movimientos de un verano con las reglas de hoy (solo mide: no cambia el juego; `docs/relevo/veranos-volumen.md`).
 * `npx tsx tools/verano-volumen.ts <semilla> [grande|actual]` juega un curso entero con el personaje apuntado al colegio y, al llegar el verano, mira quién abandona, quién se va, quién llega y quién sube.
 * Salida: una línea `#V {json}` por semilla (la agrega `tools/verano-volumen-tabla.py`).
 *
 * Se ayuda de `DIAGNOSTICO.alVerano` (la lista de personas en cada paso de `renovarDeportistas`) y de los avisos que ya había (`alProbar`, `alDesplazar`).
 * Categoría y año: según la edad de juego en el curso que acaba (los que había) o en el que empieza (los que llegan).
 */
import { PAIS_CIUDAD_GRANDE, PAIS_ESPANA, registrarPais } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { DIAGNOSTICO, edadDeJuego, type NpcsState } from '@ds/mod-npcs';
import type { Npc } from '@ds/mod-npcs';
import { hacer, posible } from '../tests/ayudas';

const [semillaTxt = '33', ciudad = 'grande'] = process.argv.slice(2);
const seed = Number(semillaTxt);
const PAIS = ciudad === 'grande' ? PAIS_CIUDAD_GRANDE : PAIS_ESPANA;
registrarPais(PAIS);
const g = nuevaPartida({ seed, pais: PAIS.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
advanceToWeek(g, 'gen.descansar', 0, 2, 9);
if (posible(g, 'futbol.apuntarse_colegio')) hacer(g, 'futbol.apuntarse_colegio');

// El final del curso: un par de semanas antes del cambio de curso nada cambia ya en los equipos.
advanceToWeek(g, 'gen.descansar', 48, 2, 15);
const dia0 = (g.time.week - g.time.schoolWeek) * 7;
const s0 = g.moduleState<NpcsState>('npcs') as NpcsState;
const pob0 = s0.poblaciones!.find((p) => p.deporte === 'futbol')!;
const cats = pob0.categorias!;
const catDe = (edad: number): { id: string; anio: number } | undefined => { const c = cats.find((x) => edad >= x.edadMin && edad <= x.edadMax); return c ? { id: c.id, anio: edad - c.edadMin + 1 } : undefined; };
const clave = (c: { id: string; anio: number } | undefined): string => (c ? `${c.id}|${c.anio}` : 'fuera|0');
const esJugador = (n: Npc): boolean => n.deporte === 'futbol' && !!n.genetica && !n.id.startsWith('personaje@');
const antes = new Map<string, { club?: string; clave: string; apartado: boolean }>();
for (const n of s0.npcs) if (esJugador(n)) antes.set(n.id, { ...(n.equipo !== undefined ? { club: n.equipo } : {}), clave: clave(catDe(edadDeJuego(n, dia0) ?? -1)), apartado: false });
const existian = new Set(s0.npcs.map((n) => n.id));
const apartadosAntes = new Set(s0.npcs.filter((n) => n.apartado?.includes('futbol')).map((n) => n.id));

type Fila = Record<string, number>;
const filas = new Map<string, Fila>();
const fila = (k: string): Fila => filas.get(k) ?? filas.set(k, {}).get(k)!;
let sx: string | undefined;
const CAT_SEXO = ['infantil', 'cadete', 'juvenil'];
const suma = (k: string, campo: string, v = 1): void => {
  const f = fila(k); f[campo] = (f[campo] ?? 0) + v;
  // Desde infantil los equipos van separados por sexo: las mismas cifras por separado (solo como dato).
  if (sx && CAT_SEXO.includes(k.split('|')[0])) { const g2 = fila(`${k}@${sx}`); g2[campo] = (g2[campo] ?? 0) + v; }
};
const generoDe = new Map(s0.npcs.map((n) => [n.id, n.gender] as const));

// Los avisos del verano: quién va a probar a otro club y a quién le quitan la plaza.
const probar = new Map<string, { sentido: string; entra: boolean }>();
const desplazados = new Map<string, string>();
DIAGNOSTICO.alProbar = (d) => { if (antes.has(d.id)) probar.set(d.id, { sentido: d.sentido, entra: d.entra }); };
DIAGNOSTICO.alDesplazar = (d) => { if (antes.has(d.id) && !desplazados.has(d.id)) desplazados.set(d.id, d.motivo); };
const listas: Record<string, Map<string, Npc>> = {};
let diaNuevo = 0;
DIAGNOSTICO.alVerano = (fase, lista, dia) => { diaNuevo = dia; listas[fase] = new Map(lista.map((n) => [n.id, n])); };
advanceToWeek(g, 'gen.descansar', 54, 2, 15);
DIAGNOSTICO.alVerano = undefined; DIAGNOSTICO.alProbar = undefined; DIAGNOSTICO.alDesplazar = undefined;
const tras = listas['tras abandono'], fin = listas.fin, inicio = listas.inicio;
if (!tras || !fin || !inicio) throw new Error('No ha llegado el verano');
const edadNueva = (n: Npc): number => edadDeJuego(n, diaNuevo) ?? -1;
const edadMax = pob0.reclutamiento.edades.max;

// 1–4 y 6: los que había.
for (const [id, a] of antes) {
  const k = a.clave;
  sx = generoDe.get(id);
  suma(k, 'habia');
  const t = tras.get(id), f = fin.get(id);
  if (!inicio.has(id)) { suma(k, 'desaparece'); continue; }
  const edad = t ? (edadNueva(t) - 0) : -1;
  void edad;
  if (!t || t.deporte === undefined) {
    // Se fue en el primer paso: la edad (se retira), el abandono o el fin del colegio (queda libre).
    const n = tras.get(id)!;
    if (n.dejado?.includes('futbol')) suma(k, 'abandona');
    else if (edadNueva(n) > edadMax) suma(k, 'sale_por_arriba');
    else suma(k, 'libre_fin_colegio');
  } else {
    suma(k, 'sigue');
    const nueva = clave(catDe(edadNueva(t)));
    suma(k, `a:${nueva}`);
  }
  // Buscan cambiar de club: a probar fuera, desplazados o libres por fin de colegio (solo los que había).
  const buscaProbar = probar.has(id), buscaDesplazado = desplazados.has(id);
  const libre = tras.get(id)?.deporte === undefined && !tras.get(id)?.dejado?.includes('futbol') && edadNueva(tras.get(id)!) <= edadMax;
  if (buscaProbar || buscaDesplazado || libre) {
    suma(k, 'busca');
    if (buscaProbar) suma(k, `busca_probar_${probar.get(id)!.sentido}`);
    if (buscaDesplazado) suma(k, `busca_${desplazados.get(id)}`);
    if (libre) suma(k, 'busca_colegio');
    if (f?.deporte === 'futbol') suma(k, 'busca_consigue');
    if (f?.deporte === 'futbol' && f.equipo !== a.club) suma(k, 'busca_cambia_club');
  }
  if (f?.deporte === 'futbol') { if (f.equipo !== a.club) suma(k, 'cambia_club'); suma(k, 'al_final_juega'); }
  else if (t && t.deporte !== undefined) {
    if (f?.dejado?.includes('futbol')) suma(k, 'dejan_sin_club_dos_plazos');
    else suma(k, 'apartado_sin_club');
  }
}
// 5: quién entra (no jugaban y juegan al final).
for (const [id, f] of fin) {
  if (!esJugador(f) || antes.has(id)) continue;
  sx = f.gender;
  const k = clave(catDe(edadNueva(f)));
  if (!existian.has(id)) suma(k, 'entra_mudanza');
  else if (edadNueva(f) === 8) suma(k, 'entra_8_anos');
  else if (apartadosAntes.has(id)) suma(k, 'entra_apartado_vuelve');
  else suma(k, 'entra_no_jugaba');
}
// 7: antes de rehacer los equipos (tras abandono y edad) y al final, por categoría y año nuevos.
for (const [, n] of tras) if (esJugador(n)) { sx = n.gender; suma(clave(catDe(edadNueva(n))), 'empieza_sin_rehacer'); }
for (const [, n] of fin) if (esJugador(n)) { sx = n.gender; suma(clave(catDe(edadNueva(n))), 'empieza_final'); }
sx = undefined;
// Los que llegan con 8 años a benjamín: cuántos de 8 años hay en total y cuántos de ellos están interesados.
const ocho = [...fin.values()].filter((n) => n.genetica && edadNueva(n) === 8 && !n.id.startsWith('personaje@'));
const extra = { de8: ocho.length, de8Juegan: ocho.filter(esJugador).length, mudadosSinJugar: [...fin.values()].filter((n) => !existian.has(n.id) && n.genetica).length };
console.log(`#V ${JSON.stringify({ seed, ciudad, dia0, diaNuevo, extra, filas: Object.fromEntries(filas) })}`);
