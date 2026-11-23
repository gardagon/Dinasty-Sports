/**
 * Una partida no depende de las que se jugaron antes en el mismo proceso (la web crea y carga partidas sin recargar; `huella` y `sim` corren
 * muchos bots seguidos). Antes, el contador de índices de presencia (que da el azar del aforo) era del proceso: `vago` con la semilla 2 daba otra
 * partida si antes se había jugado otra. Ver `docs/relevo/estado-compartido.md`.
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { BOTS, runBot } from '../sim/src/index';

const DIAS = 21;
const huella = (id: string, semilla: number): string => {
  const bot = BOTS.find((b) => b.id === id)!;
  const { ms: _ms, ...resto } = runBot(bot, semilla * 1000 + 17, DIAS);
  return createHash('sha1').update(JSON.stringify(resto)).digest('hex');
};

describe('estado compartido entre partidas', () => {
  // Primero lo que cambia el contador (una partida distinta antes), después las mismas partidas en otro orden y repetidas.
  const sola = { equilibrado1: huella('equilibrado', 1), vago2: huella('vago', 2) };

  it('una partida da lo mismo jugada sola que tras otra distinta', () => {
    huella('equilibrado', 1);
    expect(huella('vago', 2)).toBe(sola.vago2);
  });

  it('el orden de las partidas no importa y repetir una partida da lo mismo', () => {
    expect(huella('vago', 2)).toBe(sola.vago2);
    expect(huella('equilibrado', 1)).toBe(sola.equilibrado1);
    expect(huella('vago', 2)).toBe(sola.vago2);
  });
});
