/**
 * Lo que cuesta tener hogares y más gente (encargo `docs/relevo/hogares.md`, §6). NO cambia el juego ni guarda nada: parte de la ciudad grande con el fútbol, genera con `persona()` (la misma función que crea
 * a los vecinos y a los niños) los adultos y los niños pequeños que harían falta, los añade solo en memoria a una copia del estado y mide peso, guardar, cargar, presencia, pasada semanal y acción.
 * Para escalas mayores que el modelo completo, el resto se rellena con copias de niños con capacidades (el peor caso: lo que más pesa y cuesta por semana).
 *
 *   npx tsx tools/hogares-coste.ts [personas ...]     (por defecto 6113 12226 14550 19941 30565 61130)
 *   --sin-agenda   los adultos añadidos no tienen agenda (siempre «fuera»), para separar el coste de presencia
 */
import { PAIS_CIUDAD_GRANDE, SERVICES, registrarPais, type PresenciaService, type NpcDirectory, rngEstable } from '@ds/contracts';
import { MODULOS, cargarPartida, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { persona, edadNpc, type Npc, type NpcsState } from '@ds/mod-npcs';

registrarPais(PAIS_CIUDAD_GRANDE);
const t = <T>(f: () => T): [T, number] => { const t0 = performance.now(); const r = f(); return [r, performance.now() - t0]; };
const mediana = (xs: number[]): number => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0);
const kb = (x: number) => `${(x / 1024).toFixed(0)} KB`;
const MODS = [...MODULOS, futbol];
const sinAgenda = process.argv.includes('--sin-agenda');
const objetivos = process.argv.slice(2).filter((a) => !a.startsWith('--')).map(Number);
const escalas = objetivos.length ? objetivos : [6113, 12226, 14550, 19941, 30565, 61130];

const [base, tCrear] = t(() => nuevaPartida({ seed: 31, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] }, MODS));
const estadoBase = base.serialize();
const baseNpcs = (estadoBase.modules.npcs as NpcsState).npcs;
const bytesDe = (n: unknown) => JSON.stringify(n).length;
console.log(`Ciudad grande: ${baseNpcs.length} personas; crear ${(tCrear / 1000).toFixed(1)} s; estado ${kb(JSON.stringify(estadoBase).length)}`);

// ---- Generar los adultos (progenitores y abuelos) y los niños de 0 a 7 del modelo completo: 13.828 personas más
const NUEVOS = Math.max(...escalas) - baseNpcs.length;
const hastaCompleto = Math.min(NUEVOS, 19941 - baseNpcs.length);
const rng = rngEstable('hogares', 2026);
const usados = new Map<string, number[]>();
const proporcionAdultos = (6561 + 273 + 2986) / (6561 + 273 + 2986 + 1603 + 2405); // los adultos del H-completo frente a los bebés
const extras: Npc[] = [];
const [, tGenerar] = t(() => {
  for (let i = 0; i < hastaCompleto; i++) {
    const adulto = rng.chance(proporcionAdultos);
    const edad = adulto ? rng.int(26, 52) : rng.int(0, 7);
    const n = persona(rng, `hogar_${i + 1}`, 'vecino', edad, 0, usados, sinAgenda || !adulto ? [] : [{ tipo: 'vecino' }], (g) => (g === 'f' ? 'Vecina del barrio.' : 'Vecino del barrio.'));
    extras.push({ ...n, hogar: `h${Math.floor(i / 2.5)}` } as Npc);
  }
});
const pesoAdulto = extras.filter((n) => (edadNpc(n, 0) ?? 0) >= 18).slice(0, 300);
const pesoPeque = extras.filter((n) => (edadNpc(n, 0) ?? 0) < 8).slice(0, 300);
const media = (xs: Npc[]) => (xs.length ? xs.reduce((s, n) => s + bytesDe(n), 0) / xs.length : 0);
console.log(`Generar ${hastaCompleto} personas con persona(): ${(tGenerar / 1000).toFixed(2)} s (${((tGenerar * 1000) / Math.max(1, hastaCompleto)).toFixed(0)} µs por persona). Peso medio: adulto ${media(pesoAdulto).toFixed(0)} B; niño de 0 a 7 ${media(pesoPeque).toFixed(0)} B (más el campo \`hogar\`, ~12 B)`);
const ninosBase = baseNpcs.filter((n) => n.genetica && !n.tags.includes('hermano'));
console.log(`Referencia: niño con genética de otro colegio ${media(baseNpcs.filter((n) => /^nino_/.test(n.id)).slice(0, 300)).toFixed(0)} B; compañero ${media(baseNpcs.filter((n) => /^(alumno|curso|clase)_/.test(n.id)).slice(0, 300)).toFixed(0)} B`);
console.log('');
console.log('| Personas | Estado | Cargar | Guardar (a texto) | 1.ª consulta presencia (máx) | Lista de acciones | Lista de personas | Pasada de semana (motor) |');
console.log('|---:|---:|---:|---:|---:|---:|---:|---:|');

for (const total of escalas) {
  const estado = structuredClone(estadoBase);
  const lista = (estado.modules.npcs as NpcsState).npcs;
  const falta = total - lista.length;
  for (let i = 0; i < Math.min(falta, extras.length); i++) lista.push(structuredClone(extras[i]));
  // Más allá del modelo completo: copias de niños con capacidades (sin equipo, para no tocar las plantillas).
  for (let i = 0; i < falta - extras.length; i++) {
    const m = structuredClone(ninosBase[i % ninosBase.length]);
    const { equipo: _e, ...resto } = m;
    lista.push({ ...resto, id: `copia_${i}`, name: `${m.name} (${i})` } as Npc);
  }
  const json = JSON.stringify(estado);
  const [g, cargar] = t(() => cargarPartida(JSON.parse(json), MODS, { copiar: false }));
  const [, guardar] = t(() => g.serializarJSON());
  // Presencia: primera consulta tras cada cambio de intervalo, en dos días.
  const primeras: number[] = [];
  const dia0 = g.time.day;
  let ultima = -1;
  while (g.time.day < dia0 + 2) {
    g.perform('gen.esperar');
    const p = g.service<PresenciaService>(SERVICES.presencia)!;
    const [, ms] = t(() => p.en('parque', 40));
    if (p.version !== ultima) { ultima = p.version; primeras.push(ms); }
  }
  // Tres cruces de semana.
  const w0 = g.time.week;
  const semana: number[] = [];
  while (g.time.week < w0 + 3) {
    const w = g.time.week;
    const [, ms] = t(() => g.perform(g.preview('gen.descansar')?.available ? 'gen.descansar' : 'gen.esperar'));
    if (g.time.week !== w) semana.push(ms);
  }
  const la: number[] = [];
  const lp: number[] = [];
  const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
  for (let i = 0; i < 5; i++) { g.perform('gen.esperar'); la.push(t(() => g.listActions())[1]); lp.push(t(() => dir.list({}))[1]); }
  console.log(`| ${lista.length} | ${kb(json.length)} | ${cargar.toFixed(0)} ms | ${guardar.toFixed(0)} ms | ${mediana(primeras).toFixed(1)} (${Math.max(...primeras).toFixed(1)}) ms | ${mediana(la).toFixed(1)} ms | ${mediana(lp).toFixed(1)} ms | ${semana.length ? mediana(semana).toFixed(0) : '?'} ms |`);
}
