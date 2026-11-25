/**
 * ¿Por qué el resto de la creación deshace el reparto nuevo? (`docs/relevo/veranos-metodo.md`, parte A). Solo mide: no cambia el juego.
 * `npx tsx tools/creacion-deshace.ts <semilla> <m|f>`: el reparto nuevo de inicio (como `tools/verano-sexos.ts`) y, al acabar la creación, qué ha cambiado cada niño respecto al reparto
 * (`REPARTO_DE_INICIO`: club y letra), con lo que cuenta `acomodarSobrantes`; y qué cambia durante el curso (semana 0, 6 y 48). Salida: `#C {json}`.
 */
import { PAIS_CIUDAD_GRANDE, registrarPais } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { convocarYAlinear, futbol } from '@ds/mod-futbol';
import { DIAGNOSTICO, REPARTO_DE_INICIO, SESGO_DE_SEXO, edadDeJuego, type NpcsState } from '@ds/mod-npcs';
import type { Npc } from '@ds/mod-npcs';

const [semillaTxt = '51', mundo = 'm'] = process.argv.slice(2);
const seed = Number(semillaTxt);
registrarPais(PAIS_CIUDAD_GRANDE);
const titulares = (js: unknown): string[] => convocarYAlinear(js as never).titulares.map((x) => x.id);
DIAGNOSTICO.variantePrimeraRonda = { porAnio: 14 };
DIAGNOSTICO.variantePaso23 = { completarBMixto: 20, reagrupar: true, paso7: true, bolsaBA: true, equilibrar: true, maxPorEquipo: { benjamin: 18, alevin: 18, infantil: 20, cadete: 20 }, subirTitulares: { infantil: true, cadete: true }, titulares } as never;
DIAGNOSTICO.variantJuvenil = { cascada: 'usuario', titulares } as never;
SESGO_DE_SEXO.deportes = ['futbol'];
SESGO_DE_SEXO.chicas = 0.11;
SESGO_DE_SEXO.solo = mundo === 'f' ? 'f' : 'm';
SESGO_DE_SEXO.desdeEdad = 12;
if (mundo === 'f') SESGO_DE_SEXO.sinColegios = true;

const acomodos: Record<string, { noCabian: number; cierranEquipos: number; clubes: number; ejemplos: string[] }> = {};
DIAGNOSTICO.alAcomodar = (d) => {
  const a = (acomodos[d.categoria] ??= { noCabian: 0, cierranEquipos: 0, clubes: 0, ejemplos: [] });
  a.noCabian += d.noCabian; a.clubes++;
  if (d.equiposDespues < d.equiposAntes) a.cierranEquipos += d.equiposAntes - d.equiposDespues;
  if (a.ejemplos.length < 6) a.ejemplos.push(`${d.club}: equipos ${d.equiposAntes}→${d.equiposDespues}, no caben ${d.noCabian}, quedan ${d.quedan} (mínimo para los equipos ${d.minimoParaLosEquipos})`);
};
const g = nuevaPartida({ seed, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
DIAGNOSTICO.alAcomodar = undefined;
const s0 = g.moduleState<NpcsState>('npcs') as NpcsState;
const pob = s0.poblaciones!.find((p) => p.deporte === 'futbol')!;
const cats = pob.categorias!;
const catDe = (edad: number): string | undefined => cats.find((x) => edad >= x.edadMin && edad <= x.edadMax)?.id;
const esJ = (n: Npc): boolean => n.deporte === 'futbol' && !!n.genetica;
const relevante = (c: string | undefined): c is string => !!c && (mundo === 'm' || ['infantil', 'cadete', 'juvenil'].includes(c));
const porCat: Record<string, Record<string, number>> = {};
const suma = (c: string, k: string, v = 1): void => { (porCat[c] ??= {})[k] = (porCat[c][k] ?? 0) + v; };
const enReparto = new Set(REPARTO_DE_INICIO.keys());
for (const n of s0.npcs) {
  const c = catDe(edadDeJuego(n, 0) ?? -1);
  if (!relevante(c) || !n.genetica) continue;
  const r = REPARTO_DE_INICIO.get(n.id);
  if (r) {
    suma(c, 'reparto');
    const [club, letra] = r.split('|');
    if (n.deporte !== 'futbol') suma(c, n.apartado?.includes('futbol') ? 'ahora_apartado' : 'ahora_sin_club');
    else if (n.equipo !== club) suma(c, 'cambia_de_club');
    else if (n.letra?.futbol !== letra) suma(c, 'misma_club_otra_letra');
    else suma(c, 'igual');
  } else if (esJ(n)) suma(c, 'entra_despues_del_reparto');
}
// Equipos del reparto (por la traza) frente a los del estado, y durante el curso.
const equiposDe = (npcs: readonly Npc[]): Record<string, { equipos: number; bajo: number; max: number; min: number }> => {
  const m = new Map<string, number>();
  for (const n of npcs) { if (!esJ(n) || !n.equipo || !n.letra?.futbol) continue; const c = catDe(edadDeJuego(n, 0) ?? -1); if (!relevante(c)) continue; m.set(`${c}|${n.equipo}|${n.letra.futbol}`, (m.get(`${c}|${n.equipo}|${n.letra.futbol}`) ?? 0) + 1); }
  const out: Record<string, { equipos: number; bajo: number; max: number; min: number }> = {};
  for (const [k, v] of m) { const c = k.split('|')[0]; const o = out[c] ??= { equipos: 0, bajo: 0, max: 0, min: 999 }; o.equipos++; if (v < 14) o.bajo++; o.max = Math.max(o.max, v); o.min = Math.min(o.min, v); }
  return out;
};
const repartoEquipos: Record<string, { equipos: number; bajo: number; max: number; min: number }> = {};
{ const m = new Map<string, number>(); for (const [id, r] of REPARTO_DE_INICIO) { const n = s0.npcs.find((x) => x.id === id); void n; m.set(r, (m.get(r) ?? 0) + 1); void id; } void m; }
const inicio = equiposDe(s0.npcs);
// La semana 6 y la 48: ¿cambia algo durante el curso?
advanceToWeek(g, 'gen.descansar', 6, 2, 15);
const s6 = g.moduleState<NpcsState>('npcs') as NpcsState;
advanceToWeek(g, 'gen.descansar', 48, 2, 15);
const s48 = g.moduleState<NpcsState>('npcs') as NpcsState;
const cambios = (a: NpcsState, b: NpcsState): Record<string, number> => {
  const pb = new Map(b.npcs.map((n) => [n.id, n]));
  const r: Record<string, number> = { cambianClub: 0, cambianLetra: 0, dejan: 0, entran: 0 };
  const pa = new Map(a.npcs.map((n) => [n.id, n]));
  for (const n of a.npcs) { if (!esJ(n)) continue; const x = pb.get(n.id); if (!x || !esJ(x)) { r.dejan++; continue; } if (x.equipo !== n.equipo) r.cambianClub++; else if (x.letra?.futbol !== n.letra?.futbol) r.cambianLetra++; }
  for (const n of b.npcs) if (esJ(n) && !(pa.get(n.id) && esJ(pa.get(n.id)!))) r.entran++;
  return r;
};
console.log(`#C ${JSON.stringify({ seed, mundo, porCat, acomodos, inicio, curso0a6: cambios(s0, s6), curso6a48: cambios(s6, s48), equiposAl48: equiposDe(s48.npcs), enReparto: enReparto.size, repartoEquipos })}`);
