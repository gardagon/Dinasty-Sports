/**
 * Huella exacta del mundo de la ciudad grande con el fútbol: una cifra por semilla que cambia si cambia CUALQUIER dato de CUALQUIER persona o de la liga. Sirve para probar que una optimización da los mismos números
 * (`npm run huella` mira a los bots y a la ciudad de prueba; esto mira la ciudad grande, que es la que se optimiza).
 *
 *   npx tsx tools/huella-ciudad.ts [semillas 31,32] [semanas 12]
 *
 * Imprime el hash del estado entero al crear y tras avanzar las semanas pedidas (con «descansar»: la pasada semanal de los PNJ y la jornada de liga de cada sábado de clase), y el hash de solo `npcs` y de solo `futbol` al final.
 */
import { createHash } from 'node:crypto';
import { PAIS_CIUDAD_GRANDE, registrarPais } from '@ds/contracts';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';

const semillas = (process.argv[2] ?? '31,32').split(',').map(Number);
const semanas = Number(process.argv[3] ?? 12);
registrarPais(PAIS_CIUDAD_GRANDE);
const h = (x: unknown): string => createHash('sha1').update(JSON.stringify(x)).digest('hex').slice(0, 12);
for (const seed of semillas) {
  const t0 = performance.now();
  const g = nuevaPartida({ seed, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  const crear = performance.now() - t0;
  const alCrear = h(g.serialize());
  const limite = g.time.week + semanas;
  const t1 = performance.now();
  while (g.time.week < limite) if (!g.perform('gen.descansar').ok) g.perform('gen.esperar');
  const jugar = performance.now() - t1;
  console.log(`semilla ${seed}: al crear ${alCrear} · tras ${semanas} semanas ${h(g.serialize())} (npcs ${h(g.moduleState('npcs'))}, futbol ${h(g.moduleState('futbol'))})  [crear ${crear.toFixed(0)} ms, ${semanas} semanas ${jugar.toFixed(0)} ms]`);
}
