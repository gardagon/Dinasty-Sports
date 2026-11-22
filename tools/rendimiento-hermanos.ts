/**
 * Lo que cuesta el test de `modules/npcs` «los hermanos no se retiran con los cursos»: avanzar tres cursos descansando con una partida que tiene hermanos.
 * Sin lo que gasta vitest en crear las 200 partidas del archivo (eso son ~2 minutos y no cuenta para el límite del test).
 *
 *   npx tsx tools/rendimiento-hermanos.ts [veces]
 */
import { PAIS_CIUDAD_DE_PRUEBA, registrarPais, SERVICES, type NpcDirectory } from '@ds/contracts';
import { Game, advanceUntil } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { familia } from '@ds/mod-familia';
import { npcs } from '@ds/mod-npcs';
import { atletismo } from '@ds/mod-atletismo';

registrarPais(PAIS_CIUDAD_DE_PRUEBA);
const hermanosDe = (g: Game) => g.service<NpcDirectory>(SERVICES.npcs)!.list({ tag: 'hermano' });
const conHermanos = (): Game => {
  for (let i = 1; i <= 200; i++) {
    const g = Game.create([personaje, familia, npcs, atletismo], { seed: i });
    if (hermanosDe(g).length >= 2) return g;
  }
  throw new Error('Ninguna partida con hermanos');
};

const veces = Number(process.argv[2] ?? 3);
const tiempos: number[] = [];
for (let k = 0; k < veces; k++) {
  const g = conHermanos();
  const t0 = performance.now();
  advanceUntil(g, 'gen.descansar', (t) => t.schoolYear >= 3, 30000);
  tiempos.push(performance.now() - t0);
}
console.log('hermanos (avanzar 3 cursos descansando):', tiempos.map((x) => `${(x / 1000).toFixed(1)} s`).join(' · '));
