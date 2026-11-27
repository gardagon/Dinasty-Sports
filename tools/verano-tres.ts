/**
 * Tres veranos seguidos con el verano del usuario (`docs/relevo/veranos-metodo.md`): ¿es estable la base? Solo mide: no cambia el juego.
 * `npx tsx tools/verano-tres.ts <semilla> [m|f] [veranos] [eq|real]` (con `eq`, la partida empieza en equilibrio: `DIAGNOSTICO.equilibrioInicial`; con `real`, el juego tal cual, sin variantes de medida): el reparto nuevo de inicio (chicos, benjamín y alevín mixtos) y tres veranos seguidos con `DIAGNOSTICO.veranoUsuario`;
 * tras cada uno cuenta los equipos por categoría y tipo de club, los de menos de 14, los niños que quieren jugar y no tienen equipo y los equipos de colegio. Salida: `#T {json}`.
 */
import { PAIS_CIUDAD_GRANDE, registrarPais } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { convocarYAlinear, futbol } from '@ds/mod-futbol';
import { DIAGNOSTICO, LETRAS_FIJADAS, MEDIDA, SESGO_DE_SEXO, edadDeJuego, interesDe, type NpcsState } from '@ds/mod-npcs';
import type { Npc } from '@ds/mod-npcs';

const [semillaTxt = '51', mundo = 'm', veranosTxt = '3', equilibrioTxt = 'no'] = process.argv.slice(2);
/** `real`: el juego tal cual (sin ninguna variante de medida): lo que hacen la creación y los veranos de la ciudad grande. */
const REAL = equilibrioTxt === 'real' || equilibrioTxt === 'sin';
if (equilibrioTxt === 'sin') DIAGNOSTICO.sinRepartoNuevo = true; // el juego de antes del reparto nuevo, para comparar
const VERANOS = Number(veranosTxt);
const seed = Number(semillaTxt);
registrarPais(PAIS_CIUDAD_GRANDE);
const titulares = (js: unknown): string[] => convocarYAlinear(js as never).titulares.map((x) => x.id);
if (!REAL) {
DIAGNOSTICO.variantePrimeraRonda = { porAnio: 14 };
DIAGNOSTICO.variantePaso23 = { completarBMixto: 20, reagrupar: true, paso7: true, bolsaBA: true, equilibrar: true, maxPorEquipo: { benjamin: 18, alevin: 18, infantil: 20, cadete: 20 }, subirTitulares: { infantil: true, cadete: true }, titulares } as never;
DIAGNOSTICO.variantJuvenil = { cascada: 'usuario', titulares } as never;
SESGO_DE_SEXO.deportes = ['futbol'];
SESGO_DE_SEXO.chicas = 0.11;
SESGO_DE_SEXO.solo = mundo === 'f' ? 'f' : 'm';
SESGO_DE_SEXO.desdeEdad = 12;
if (mundo === 'f') SESGO_DE_SEXO.sinColegios = true;
MEDIDA.respetarReparto = true;
DIAGNOSTICO.equilibrioInicial = equilibrioTxt === 'eq';
}

const g = nuevaPartida({ seed, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
advanceToWeek(g, 'gen.descansar', 0, 2, 9);
advanceToWeek(g, 'gen.descansar', 48, 2, 15);

type Foto = Record<string, { equipos: number; bajo: number; jugadores: number; fuera: number[]; porTipo: Record<string, number>; min: number; max: number }>;
const foto = (dia: number): Foto => {
  const s = g.moduleState<NpcsState>('npcs') as NpcsState;
  const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
  const cats = pob.categorias!;
  const catDe = (edad: number): { id: string; anio: number } | undefined => { const c = cats.find((x) => edad >= x.edadMin && edad <= x.edadMax); return c ? { id: c.id, anio: edad - c.edadMin + 1 } : undefined; };
  const tipoDe = (club: string): string => (club.startsWith('colegio') ? 'colegio' : club.startsWith('club_pequeno') ? 'pequeno' : club.startsWith('club_mediano') ? 'mediano' : 'grande');
  const out: Foto = {};
  const equipos = new Map<string, number>();
  for (const n of s.npcs as Npc[]) {
    const c = catDe(edadDeJuego(n, dia) ?? -1);
    if (!c || !n.genetica) continue;
    const o = (out[c.id] ??= { equipos: 0, bajo: 0, jugadores: 0, fuera: [0, 0, 0], porTipo: {}, min: 999, max: 0 });
    if (n.deporte === 'futbol' && n.equipo && n.letra?.futbol) { o.jugadores++; equipos.set(`${c.id}|${n.equipo}|${n.letra.futbol}`, (equipos.get(`${c.id}|${n.equipo}|${n.letra.futbol}`) ?? 0) + 1); }
    else if (n.deporte === undefined && !n.dejado?.includes('futbol') && interesDe(n, 'futbol', edadDeJuego(n, dia)) > 0) o.fuera[Math.min(2, c.anio - 1)]++;
  }
  for (const [k, v] of equipos) {
    const [cat, club] = k.split('|');
    const o = out[cat];
    o.equipos++; if (v < 14) o.bajo++; o.min = Math.min(o.min, v); o.max = Math.max(o.max, v);
    o.porTipo[tipoDe(club)] = (o.porTipo[tipoDe(club)] ?? 0) + 1;
  }
  return out;
};
/** Los equipos de juvenil de cada club en este momento (para ver en qué veranos y clubes cambia su número). */
const juvPorClub = (): Record<string, number> => {
  const s = g.moduleState<NpcsState>('npcs') as NpcsState;
  const letras = new Map<string, Set<string>>();
  const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
  const cj = pob.categorias!.find((x) => x.id === 'juvenil')!;
  const dia = (g.time.week - g.time.schoolWeek) * 7;
  for (const n of s.npcs as Npc[]) {
    const ed = edadDeJuego(n, dia) ?? -1;
    if (n.deporte === 'futbol' && n.equipo && n.letra?.futbol && n.genetica && ed >= cj.edadMin && ed <= cj.edadMax) { if (!letras.has(n.equipo)) letras.set(n.equipo, new Set()); letras.get(n.equipo)!.add(n.letra.futbol); }
  }
  const porLetra: Record<string, number> = {};
  for (const l of letras.values()) for (const x of l) porLetra[x] = (porLetra[x] ?? 0) + 1;
  return { ...Object.fromEntries([...letras].map(([c, l]) => [c, l.size])), '#letras': porLetra as never } as never;
};
const fotos: { momento: string; foto: Foto; juvClub: Record<string, number> }[] = [{ momento: 'inicio', foto: foto((g.time.week - g.time.schoolWeek) * 7), juvClub: juvPorClub() }];
if (!REAL) {
  DIAGNOSTICO.veranoUsuario = true;
  (DIAGNOSTICO.variantePaso23 as { maxPorEquipo: Record<string, number> }).maxPorEquipo.juvenil = 22;
}
const usuario: { verano: number; juvenil: Record<string, number> }[] = [];
let veranoActual = 0;
const tiempos: number[] = [];
const fasesVistas: Record<string, number> = {};
DIAGNOSTICO.traza = (e) => { fasesVistas[e.fase] = (fasesVistas[e.fase] ?? 0) + 1; if (e.fase === 'verano usuario' && e.categoria === 'juvenil') usuario.push({ verano: veranoActual, juvenil: Object.fromEntries(Object.entries(e.datos).filter(([, v]) => typeof v === 'number')) as Record<string, number> }); };
for (let v = 1; v <= VERANOS; v++) {
  veranoActual = v;
  LETRAS_FIJADAS.clear();
  const t0 = performance.now();
  advanceToWeek(g, 'gen.descansar', 48 + 52 * (v - 1) + 6, 2, 15);
  tiempos.push(Math.round(performance.now() - t0));
  fotos.push({ momento: `verano ${v}`, foto: foto((g.time.week - g.time.schoolWeek) * 7), juvClub: juvPorClub() });
  advanceToWeek(g, 'gen.descansar', 48 + 52 * v, 2, 15);
}
if (process.env.DS_FASES) console.log('#FASES', JSON.stringify(fasesVistas));
console.log(`#T ${JSON.stringify({ seed, mundo, fotos, usuario, tiempos })}`);
