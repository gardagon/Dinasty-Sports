/**
 * Cuánta gente habría en las calles con las agendas que propone `docs/relevo/gente-por-la-calle.md` §2 (estimación; NO cambia el juego: las agendas nuevas viven solo en esta herramienta).
 * Parte de los vecinos adultos de la ciudad grande (opción A: los que ya hay) y de esos más N vecinos adultos de mentira (opción B: personas nuevas), les añade las marcas y los tramos propuestos y cuenta, a cada hora,
 * cuántos hay en `calle_casa`, `calle_colegio` y `avenida_parque`, con el mismo azar de las agendas (`ubicacionEn`).
 *
 *   npx tsx tools/gente-por-la-calle-propuesta.ts [N=150]
 */
import { PAIS_CIUDAD_GRANDE, SERVICES, azarDe, registrarPais, timeView, tramosDe, ubicacionEn, NIVEL_AGENDA, type DatosDeAgenda, type DiasDeTramo, type PresenciaService, type TramoDeAgenda } from '@ds/contracts';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { edadNpc, type NpcsState } from '@ds/mod-npcs';

const nuevos = Number(process.argv[2] ?? 150);
registrarPais(PAIS_CIUDAD_GRANDE);
const g = nuevaPartida({ seed: 31, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
const lista = (g.moduleState('npcs') as NpcsState).npcs;
const pres = g.service<PresenciaService>(SERVICES.presencia)!;
const h = (x: number, m = 0) => x * 60 + m;
const datos: DatosDeAgenda = { sesionDeClub: () => undefined, jornada: () => undefined };

type Persona = { id: string; edad: number; agenda: TramoDeAgenda[] };
const base = (id: string) => pres.agenda(id);
const adultos: { id: string; edad: number; base: TramoDeAgenda[] }[] = lista
  .filter((n) => /^vecino_\d+$/.test(n.id) && (edadNpc(n, 0) ?? 0) >= 18)
  .map((n) => ({ id: n.id, edad: edadNpc(n, 0) ?? 30, base: base(n.id) }));
// Vecinos de mentira (opción B): adultos de 25 a 85 años con la agenda de un vecino.
const tipoVecino = tramosDe({ tipo: 'vecino' }, datos);
for (let i = 0; i < nuevos; i++) {
  const edad = Math.round(25 + azarDe('edad-nueva', i) * 40 + (azarDe('jub-nueva', i) < 0.2 ? 20 : 0));
  adultos.push({ id: `nuevo_${i}`, edad, base: [{ dias: 'todos', desde: 0, hasta: 1440, destinos: [[null, 1]], nivel: NIVEL_AGENDA.base, tipo: 'base' }, ...tipoVecino] });
}

/** Pasos de 10 minutos de `desde` a `hasta`, cada uno con probabilidad `p` de que la persona esté en uno de `sitios` (azar independiente en cada paso: en promedio, n·p pasos). */
const pasos = (dias: DiasDeTramo, desde: number, hasta: number, p: number, sitios: readonly (readonly [string, number])[]): TramoDeAgenda[] =>
  Array.from({ length: Math.round((hasta - desde) / 10) }, (_, k) => ({ dias, desde: desde + k * 10, hasta: desde + (k + 1) * 10, destinos: sitios, asistencia: p, nivel: NIVEL_AGENDA.rol, tipo: 'vecino' as const }));

/** Marcas por hash estable: dónde vive, si pasea al perro, si es jubilado (67 o más). */
const marcas = (id: string, edad: number) => {
  const v = azarDe('vive', id);
  return { vive: v < 0.2 ? 'calle_casa' : v < 0.35 ? 'calle_colegio' : v < 0.5 ? 'avenida_parque' : null, perro: azarDe('perro', id) < 0.15, jubilado: edad >= 67 };
};

const propuesta = (id: string, edad: number): TramoDeAgenda[] => {
  const m = marcas(id, edad);
  const t: TramoDeAgenda[] = [];
  const casa = m.vive === 'calle_casa';
  const calle = m.vive as string;
  if (m.vive && !m.jubilado) {
    // Salir y volver a casa (lectivos), y dar una vuelta los fines de semana.
    t.push(...pasos('lectivo', h(7), h(8, 30), 0.12, [[calle, 1]]), ...pasos('lectivo', h(17, 30), h(20, 30), 0.06, [[calle, 1]]));
    t.push(...pasos('libre', h(10), h(13), 0.07, [[calle, 1]]), ...pasos('libre', h(18), h(20, 30), 0.05, [[calle, 1]]));
  }
  if (m.perro) {
    const sitios: readonly (readonly [string, number])[] = [[casa ? 'calle_casa' : (m.vive ?? 'avenida_parque'), 1], ['avenida_parque', 1], ['parque', 1]];
    t.push(...pasos('lectivo', h(6, 40), h(7, 40), 0.25, sitios), ...pasos('lectivo', h(19, 30), h(21), 0.2, sitios), ...pasos('libre', h(9), h(12), 0.12, sitios), ...pasos('libre', h(19), h(21), 0.12, sitios));
  }
  if (m.jubilado) {
    // Un rato en un banco de la avenida o del parque por la mañana y por la tarde, y paseo por su calle.
    const banco: readonly (readonly [string, number])[] = [['avenida_parque', 1], ['parque', 1]];
    t.push(...pasos('todos', h(10), h(13), 0.3, banco), ...pasos('todos', h(17), h(19, 30), 0.3, banco));
    if (m.vive) t.push(...pasos('todos', h(9), h(11), 0.1, [[calle, 1]]), ...pasos('todos', h(16), h(18), 0.1, [[calle, 1]]));
  }
  // El resto de los adultos de la zona también pasan por la calle del colegio y por la avenida al ir y venir (poca gente).
  if (!m.jubilado) t.push(...pasos('lectivo', h(7, 10), h(8, 10), 0.04, [['calle_colegio', 1]]), ...pasos('lectivo', h(14), h(15), 0.04, [['calle_colegio', 1]]), ...pasos('libre', h(10), h(14), 0.025, [['avenida_parque', 1]]));
  return t;
};

const personas: Persona[] = adultos.map((a) => ({ id: a.id, edad: a.edad, agenda: [...a.base, ...propuesta(a.id, a.edad)] }));
const HORAS = ['6:40', '7:00', '7:30', '8:00', '8:30', '10:00', '12:00', '14:10', '15:30', '17:30', '18:30', '19:30', '20:30'];
const hm = (s: string) => { const [a, b] = s.split(':').map(Number); return a * 60 + b; };
const DIAS = [{ n: 'día de clase', d: 4 * 7 + 2 }, { n: 'sábado', d: 4 * 7 + 5 }, { n: 'vacaciones', d: 45 * 7 + 2 }];
const CALLES = ['calle_casa', 'calle_colegio', 'avenida_parque'];
const conPerro = personas.filter((p) => marcas(p.id, p.edad).perro).length;
console.log(`Adultos: ${personas.length} (${personas.length - nuevos} que ya hay + ${nuevos} nuevos); viven en la calle de casa ${personas.filter((p) => marcas(p.id, p.edad).vive === 'calle_casa').length}; con perro ${conPerro}; jubilados ${personas.filter((p) => p.edad >= 67).length}`);
for (const d of DIAS) {
  console.log(`\n${d.n} (personas en cada calle; entre paréntesis, en la media hora siguiente de 10 en 10 min, el máximo)`);
  console.log(`| hora | ${CALLES.join(' | ')} |`);
  console.log(`|---|${CALLES.map(() => '---:').join('|')}|`);
  for (const hora of HORAS) {
    const cuenta = (min: number) => {
      const c: Record<string, number> = {};
      const t = timeView(d.d * 1440 + min);
      for (const p of personas) { const s = ubicacionEn(p.agenda, t, p.id).sitio; if (s && CALLES.includes(s)) c[s] = (c[s] ?? 0) + 1; }
      return c;
    };
    const ahora = cuenta(hm(hora));
    const maximos = [0, 10, 20].map((x) => cuenta(hm(hora) + x));
    console.log(`| ${hora} | ${CALLES.map((c) => `${ahora[c] ?? 0} (máx ${Math.max(...maximos.map((x) => x[c] ?? 0))})`).join(' | ')} |`);
  }
}
