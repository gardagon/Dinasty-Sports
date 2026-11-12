/**
 * La regla de benjamín (los niños llegan nuevos al club: asistencia y relación empiezan en el primer entrenamiento de la temporada) con la ciudad grande: cuántas semanas hay entre el primer entrenamiento
 * y el primer partido de benjamín, y cómo queda la primera convocatoria (quién sale, y si el personaje que va a los entrenamientos entra en igualdad). `npm run benjamin -- [semillas]`.
 */
import { PAIS_CIUDAD_GRANDE, SERVICES, claveDeDeporte, registrarPais, type DeporteService, type NpcDirectory, type PartidosService } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol, paraConvocar, convocarYAlinear, type FutbolState } from '@ds/mod-futbol';
import { hacer, posible } from '../tests/ayudas';

registrarPais(PAIS_CIUDAD_GRANDE);
const semillas = (process.argv[2] ?? '31,32,33').split(',').map(Number);
const f = (x: number, d = 2): string => x.toFixed(d);
for (const seed of semillas) {
  const g = nuevaPartida({ seed, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  advanceToWeek(g, 'gen.descansar', 0, 2, 9);
  if (posible(g, 'futbol.apuntarse_colegio')) hacer(g, 'futbol.apuntarse_colegio');
  const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
  const partidos = () => g.service<PartidosService>(SERVICES.partidos)!;
  // La primera semana con partido de benjamín.
  let primera = -1;
  for (let w = 1; w <= 8 && primera < 0; w++) {
    advanceToWeek(g, 'gen.descansar', w, 0, 9);
    if (partidos().deLaSemana().some((p) => p.categoria === 'benjamin')) primera = w;
  }
  const estado = () => g.moduleState<FutbolState>('futbol') as FutbolState;
  const e = estado().personaje;
  console.log(`\nSemilla ${seed}: el personaje juega en ${e?.club} ${e?.categoria} ${e?.letra}; primer partido de benjamín en la semana ${primera} (entrenamientos desde la semana 0 → ${primera} semanas)`);
  if (!e) continue;
  // El sábado de esa semana por la mañana: la plantilla del equipo del personaje con las mismas reglas.
  advanceToWeek(g, 'gen.descansar', primera, 5, 8);
  const plantilla = dir.plantillaDelEquipo!('futbol', e.club, e.categoria, e.letra);
  const asist = plantilla.map((j) => j.asistencia);
  console.log(`  Plantilla ${plantilla.length}: asistencia media ${f(asist.reduce((a, b) => a + b, 0) / asist.length)}, mínima ${f(Math.min(...asist))}; con asistencia 1: ${asist.filter((a) => a === 1).length}; con relación guardada: ${plantilla.filter((j) => j.relacionConElEntrenador !== undefined).length}`);
  const c = convocarYAlinear(plantilla.map((j) => paraConvocar(j)));
  const citados = new Set([...c.titulares, ...c.suplentes].map((x) => x.id));
  const fuera = plantilla.filter((j) => !citados.has(j.id));
  console.log(`  Sin el personaje salen ${citados.size} convocados; de los ${fuera.length} que no, asistencia media ${fuera.length ? f(fuera.reduce((a, j) => a + j.asistencia, 0) / fuera.length) : '-'}; valor medio convocados ${f([...citados].reduce((a, id) => a + plantilla.find((j) => j.id === id)!.valor, 0) / citados.size, 1)}, no convocados ${fuera.length ? f(fuera.reduce((a, j) => a + j.valor, 0) / fuera.length, 1) : '-'}`);
  // El personaje: si va a todos los entrenamientos y si no va a ninguno (la misma foto, con las sesiones de FutbolState cambiadas).
  const papel = (): string => String(g.service<DeporteService>(claveDeDeporte('futbol'))!.view().secciones!.find((s) => s.titulo === 'Próximo partido')?.tabla?.rows.find(([k]) => k === 'Tu papel (hoy)')?.[1]);
  const s = estado();
  const original = s.sesiones;
  console.log(`  Personaje que no ha ido a ningún entrenamiento: ${papel()}`);
  s.sesiones = Object.fromEntries(Array.from({ length: primera + 1 }, (_, w) => [w, 2]));
  console.log(`  Personaje que ha ido a todos (2 por semana): ${papel()}`);
  s.sesiones = original;
}
