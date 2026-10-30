/**
 * Huella exacta de las partidas de los bots: una cifra por bot y semilla que cambia si cambia CUALQUIER stat en cualquier semana.
 * Sirve para probar que una reorganización no cambia el juego (`npm run huella -- 120` antes y después; los resultados deben ser
 * idénticos). Un bot cuya conducta cambia a propósito es la única diferencia esperable.
 */
import { createHash } from 'node:crypto';
import { BOTS, runBot } from '../sim/src/index';

const dias = Number(process.argv[2] ?? 120);
for (const bot of BOTS) {
  for (const s of [1, 2]) {
    const r = runBot(bot, s * 1000 + 17, dias);
    const { ms: _ms, ...resto } = r;
    console.log(bot.id.padEnd(12), s, r.actions, createHash('sha1').update(JSON.stringify(resto)).digest('hex').slice(0, 12));
  }
}
