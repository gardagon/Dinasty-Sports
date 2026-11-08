/**
 * Huella exacta de las partidas de los bots: una cifra por bot y semilla que cambia si cambia CUALQUIER stat en cualquier semana.
 * Sirve para probar que una reorganización no cambia el juego (`npm run huella -- 120` antes y después; los resultados deben ser
 * idénticos). Un bot cuya conducta cambia a propósito es la única diferencia esperable.
 */
import { createHash } from 'node:crypto';
import { PAIS_CIUDAD_DE_PRUEBA, registrarPais } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { BOTS, runBot } from '../sim/src/index';

const dias = Number(process.argv[2] ?? 120);
for (const bot of BOTS) {
  for (const s of [1, 2]) {
    const r = runBot(bot, s * 1000 + 17, dias);
    const { ms: _ms, ...resto } = r;
    console.log(bot.id.padEnd(12), s, r.actions, createHash('sha1').update(JSON.stringify(resto)).digest('hex').slice(0, 12));
  }
}

// Los bots no juegan al fútbol: para vigilar la lógica de los equipos (el «draft», la regla de plaza, los fichajes y las plantillas) se huella también el mundo de una partida con fútbol (ciudad de prueba)
// tras tres veranos: todas las personas, sus equipos y puestos, y las poblaciones guardadas.
registrarPais(PAIS_CIUDAD_DE_PRUEBA);
for (const seed of [31, 32]) {
  const g = nuevaPartida({ seed, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  const estado = (): string => createHash('sha1').update(JSON.stringify(g.moduleState('npcs'))).digest('hex').slice(0, 12);
  const alCrear = estado();
  for (let v = 1; v <= 3; v++) advanceToWeek(g, 'gen.descansar', 52 * v + 2, 2, 15);
  console.log('futbol'.padEnd(12), seed, alCrear, estado());
}
