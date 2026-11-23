/**
 * De la gente que hay en un lugar, a quién ve el personaje (las 34–46 personas «cerca», `aforoCercano`): cuántos vecinos adultos hay allí y cuántos salen entre los que se ven.
 * Encargo `docs/relevo/gente-por-la-calle.md` §1. No cambia el juego. `npx tsx tools/gente-por-la-calle-visibles.ts [actual|grande]`.
 */
import { PAIS_CIUDAD_GRANDE, SERVICES, aforoCercano, registrarPais, type PresenciaService } from '@ds/contracts';
import { advanceUntil } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';

const grande = process.argv[2] === 'grande';
if (grande) registrarPais(PAIS_CIUDAD_GRANDE);
const g = nuevaPartida({ seed: 31, ...(grande ? { pais: PAIS_CIUDAD_GRANDE.id } : {}), deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
const adulto = (id: string) => /^vecino_\d+$/.test(id);
const momentos = [
  { n: 'miércoles 15:30', f: (t: { week: number; weekday: number; hour: number; minuteOfDay: number }) => t.week === 3 && t.weekday === 2 && t.minuteOfDay >= 15 * 60 + 30 },
  { n: 'miércoles 20:00', f: (t: { week: number; weekday: number; hour: number; minuteOfDay: number }) => t.week === 3 && t.weekday === 2 && t.hour >= 20 },
  { n: 'sábado 11:00', f: (t: { week: number; weekday: number; hour: number; minuteOfDay: number }) => t.week === 3 && t.weekday === 5 && t.hour >= 11 },
];
console.log(`Ciudad ${grande ? 'grande' : 'actual'}`);
for (const m of momentos) {
  advanceUntil(g, 'gen.descansar', m.f, 20000);
  const p = g.service<PresenciaService>(SERVICES.presencia)!;
  const filas = ['parque', 'supermercado', 'biblioteca', 'restaurante', 'gimnasio'].map((l) => {
    const todos = p.en(l);
    const aforo = aforoCercano(l, `${g.time.day}:x`);
    const vistos = todos.slice(0, aforo);
    const adultos = todos.filter((v) => adulto(v.id)).length;
    return `${l}: ${todos.length} personas, ${adultos} vecinos adultos; de las ${aforo} que se ven, ${vistos.filter((v) => adulto(v.id)).length} adultos`;
  });
  console.log(`- ${m.n}: ${filas.join(' · ')}`);
}
