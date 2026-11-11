/**
 * Cuánto cuesta el día de partido de todos (`MOTOR_PARTIDOS.md` §15): con la ciudad grande, lo que tarda en calcularse una vez por semana (la convocatoria de todos los equipos y la llegada de cada convocado) y lo que cuesta
 * preguntar quién está dónde el día de partido (la presencia con los tramos del partido), y cuánta gente hay en el campo en cada franja. `npm run dia-de-partido -- [prueba|grande]`.
 */
import { PAIS_CIUDAD_GRANDE, PAIS_CIUDAD_DE_PRUEBA, SERVICES, registrarPais, type PartidosService, type PresenciaService } from '@ds/contracts';
import { advanceUntil, advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol, DIA_DE_PARTIDO } from '@ds/mod-futbol';

const GRANDE = (process.argv[2] ?? 'grande') === 'grande';
registrarPais(GRANDE ? PAIS_CIUDAD_GRANDE : PAIS_CIUDAD_DE_PRUEBA);
const f = (x: number, d = 1): string => x.toFixed(d);
const g = nuevaPartida({ seed: 31, ...(GRANDE ? { pais: PAIS_CIUDAD_GRANDE.id } : {}), deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
advanceToWeek(g, 'gen.descansar', 7, 0, 9);
const partidos = () => g.service<PartidosService>(SERVICES.partidos)!;
let t0 = performance.now();
const semanal = partidos().deLaSemana();
console.log(`Día de partido (${GRANDE ? 'ciudad grande' : 'ciudad de prueba'}): ${semanal.length} partidos esta semana; calcularlo (convocatoria de todos los equipos y llegada de cada convocado), una vez por semana: ${f(performance.now() - t0, 0)} ms`);
t0 = performance.now();
partidos().deLaSemana();
console.log(`  Segunda consulta (con lo calculado): ${f(performance.now() - t0, 2)} ms`);
// La presencia el sábado: cuánta gente hay en el campo y cuánto cuesta preguntarlo.
const saques = [...new Set(semanal.map((p) => p.saque))].sort((a, b) => a - b);
for (const saque of saques.slice(0, 5)) {
  advanceUntil(g, 'gen.esperar', (t) => t.minute >= saque - DIA_DE_PARTIDO.convocatoria + 15);
  const a = performance.now();
  const gente = (g.service<PresenciaService>(SERVICES.presencia)!).en('campo_municipal').length;
  const dos = performance.now() - a;
  const antes = performance.now();
  g.service<PresenciaService>(SERVICES.presencia)!.en('campo_municipal');
  console.log(`  ${Math.floor((saque % 1440) / 60)}:00 — en el campo municipal a la convocatoria: ${gente} personas (se ven como mucho las cercanas); primera consulta ${f(dos, 0)} ms, repetida ${f(performance.now() - antes, 2)} ms`);
}
