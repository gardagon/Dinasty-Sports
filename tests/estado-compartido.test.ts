/**
 * Una partida no depende de las que se jugaron antes en el mismo proceso (la web crea y carga partidas sin recargar; `huella` y `sim` corren
 * muchos bots seguidos; guardar y cargar no debe cambiar el mundo). Antes, el contador de índices de presencia (que da el azar del aforo) era del proceso: `vago` con la semilla 2 daba otra
 * partida si antes se había jugado otra. Ver `docs/relevo/estado-compartido.md`.
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { SERVICES, type LugaresService, type PresenciaService } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, cargarPartida, nuevaPartida } from '@ds/game';
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

  // El aforo (cuánta gente ves cerca) tiene como azar el día y el intervalo de presencia: no un contador de reconstrucciones del índice,
  // que se reinicia al cargar y sigue de una partida a otra.
  type Juego = ReturnType<typeof nuevaPartida>;
  const cerca = (g: Juego): string => {
    const lugar = g.service<LugaresService>(SERVICES.lugares)!.actual().id;
    const p = g.service<PresenciaService>(SERVICES.presencia)!;
    return `${g.time.day}@${g.time.hour}|${p.en(lugar, p.aforo(lugar)).map((n) => n.id).join(',')}`;
  };
  const MOMENTOS: [number, number, number][] = [[1, 1, 10], [1, 3, 12], [2, 2, 9], [2, 5, 11], [3, 1, 10]];
  /** Juega hasta cada momento y anota quién hay cerca; con `cargarEn`, guarda y carga la partida (por texto JSON) tras ese momento. */
  const jugar = (semilla: number, momentos = MOMENTOS.length, cargarEn = -1): string[] => {
    let g = nuevaPartida({ seed: semilla }, MODULOS);
    const v: string[] = [];
    for (let i = 0; i < momentos; i++) {
      advanceToWeek(g, 'gen.descansar', ...MOMENTOS[i]);
      v.push(cerca(g));
      if (i === cargarEn) g = cargarPartida(JSON.parse(JSON.stringify(g.serialize())), MODULOS);
    }
    return v;
  };

  it('guardar y cargar a mitad da lo mismo que seguir sin cargar', () => {
    const sinCargar = jugar(31);
    expect(jugar(31, MOMENTOS.length, 1)).toEqual(sinCargar);
  });

  it('otra partida jugada antes no cambia quién hay cerca', () => {
    const sola = jugar(31);
    jugar(32, 3);
    expect(jugar(31)).toEqual(sola);
  });
});
