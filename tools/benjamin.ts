/**
 * La regla de benjamín (los niños llegan nuevos al club: asistencia y relación empiezan en el primer entrenamiento de la temporada) con la ciudad grande: cuántas semanas hay entre el primer entrenamiento
 * y el primer partido de benjamín, y cómo queda la primera convocatoria (quién sale, y si el personaje que va a los entrenamientos entra en igualdad). `npm run benjamin -- [semillas]`.
 */
import { PAIS_CIUDAD_GRANDE, PAIS_CIUDAD_GRANDE_CON_HOGARES, SERVICES, claveDeDeporte, registrarPais, type ClubDirectory, type DeporteService, type NpcDirectory, type PartidosService } from '@ds/contracts';
import { advanceToWeek, advanceUntil } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol, paraConvocar, convocarYAlinear, proximoPartido, type FutbolState } from '@ds/mod-futbol';
import { hacer, llegarA, posible } from '../tests/ayudas';

/** La ciudad grande; con `DS_HOGARES=1`, con los hogares activados (`docs/relevo/hogares.md`). */
const PAIS = process.env.DS_HOGARES ? PAIS_CIUDAD_GRANDE_CON_HOGARES : PAIS_CIUDAD_GRANDE;
registrarPais(PAIS);
const semillas = (process.argv[2] ?? '31,32,33').split(',').map(Number);
const f = (x: number, d = 2): string => x.toFixed(d);
for (const seed of semillas) {
  const g = nuevaPartida({ seed, pais: PAIS.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  advanceToWeek(g, 'gen.descansar', 0, 2, 9);
  const apuntado = posible(g, 'futbol.apuntarse_colegio');
  const motivoSinPlaza = apuntado ? undefined : g.preview('futbol.apuntarse_colegio')?.reason;
  if (apuntado) hacer(g, 'futbol.apuntarse_colegio');
  const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
  const partidos = () => g.service<PartidosService>(SERVICES.partidos)!;
  // La primera semana con partido de benjamín.
  let primera = -1;
  for (let w = 1; w <= 8 && primera < 0; w++) {
    advanceToWeek(g, 'gen.descansar', w, 0, 9);
    if (partidos().deLaSemana().some((p) => p.categoria === 'benjamin')) primera = w;
  }
  const estado = () => g.moduleState<FutbolState>('futbol') as FutbolState;
  // Con algunas semillas (la 33) el equipo del colegio ya está completo y todos juegan mejor que el personaje: el juego no le da plaza (regla de plaza, `motivoSinPlaza`), y eso no es un fallo. Entonces se mide lo mismo
  // con el equipo benjamín del colegio sin el personaje, y las líneas del personaje se saltan.
  const juega = estado().personaje;
  const colegio = g.service<ClubDirectory>(SERVICES.clubes)!.list('futbol').find((c) => c.esColegio);
  const e = juega ?? (colegio ? { club: colegio.id, categoria: 'benjamin', letra: 'A' } : undefined);
  console.log(`\nSemilla ${seed}: ${juega ? `el personaje juega en ${e?.club} ${e?.categoria} ${e?.letra}` : `el personaje NO tiene plaza (${motivoSinPlaza ?? 'sin motivo'}); se mide el equipo ${e?.club} ${e?.categoria} ${e?.letra} sin él`}; primer partido de benjamín en la semana ${primera} (entrenamientos desde la semana 0 → ${primera} semanas)`);
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
  if (!juega) continue;
  // El personaje: si va a todos los entrenamientos y si no va a ninguno (la misma foto, con las sesiones de FutbolState cambiadas).
  const papel = (): string => String(g.service<DeporteService>(claveDeDeporte('futbol'))!.view().secciones!.find((s) => s.titulo === 'Próximo partido')?.tabla?.rows.find(([k]) => k === 'Tu papel (hoy)')?.[1]);
  const s = estado();
  const original = s.sesiones;
  console.log(`  Personaje que no ha ido a ningún entrenamiento: ${papel()}`);
  s.sesiones = Object.fromEntries(Array.from({ length: primera + 1 }, (_, w) => [w, 2]));
  console.log(`  Personaje que ha ido a todos (2 por semana): ${papel()}`);
  s.sesiones = original;
}

// La liga entera con el personaje yendo a todos los entrenamientos y a todos los partidos a los que lo convocan (la rotación de los equipos de colegio, `CategoriaDef.rotacionEn`): cuántas semanas lo convocan, cuántas
// juega de titular y de suplente y cuántos minutos suma. Es una partida nueva por semilla (no toca la de arriba).
console.log('\nLa liga entera yendo a todos los entrenamientos y partidos:');
for (const seed of semillas) {
  const g = nuevaPartida({ seed, pais: PAIS.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  advanceToWeek(g, 'gen.descansar', 0, 2, 9);
  if (!posible(g, 'futbol.apuntarse_colegio')) { console.log(`Semilla ${seed}: el personaje no tiene plaza (${g.preview('futbol.apuntarse_colegio')?.reason})`); continue; }
  hacer(g, 'futbol.apuntarse_colegio');
  const estado = () => g.moduleState<FutbolState>('futbol') as FutbolState;
  const suSlot = (): { dia: number; hora: number } | undefined => {
    const p = estado().personaje;
    const liga = estado().liga;
    const l = p && liga ? liga.categorias[p.categoria] : undefined;
    const sig = l ? proximoPartido(l, `${p!.club}|${p!.letra}`) : undefined;
    const h = sig ? estado().calendario?.partidos[`${liga!.curso}|${p!.categoria}|${sig.ref}`] : undefined;
    return h ? { dia: h[0], hora: h[1] } : undefined;
  };
  const hasta = (minuto: number): void => advanceUntil(g, 'gen.descansar', (t) => t.minute >= minuto);
  const semanas: string[] = [];
  let convocado = 0, titular = 0, suplente = 0, ninguno = 0;
  for (let w = 1; w <= 30; w++) {
    advanceToWeek(g, 'gen.descansar', w, 0, 9);
    // Va a todos los entrenamientos de la semana y de la anterior (el club del colegio entrena dos días).
    const s = estado();
    s.sesiones = { ...(s.sesiones ?? {}), [w - 1]: 2, [w]: 2 };
    const slot = suSlot();
    if (!slot) continue;
    const saque = (g.time.day - g.time.weekday + slot.dia) * 1440 + slot.hora * 60;
    hasta(saque - 150);
    llegarA(g, 'campo_municipal', Math.floor(((saque - 58) % 1440) / 60), (saque - 58) % 60);
    if (!posible(g, 'futbol.unirse_companeros')) { ninguno++; semanas.push('·'); continue; }
    hacer(g, 'futbol.unirse_companeros');
    hasta(saque - 30);
    hacer(g, 'futbol.ir_vestuario');
    hasta(saque);
    hacer(g, 'futbol.jugar_partido');
    const u = estado().ultimoPartido!;
    convocado++;
    if (u.juega && u.titular) { titular++; semanas.push('T'); } else if (u.juega) { suplente++; semanas.push('s'); } else semanas.push('b');
  }
  const e = estado().estadisticas;
  console.log(`Semilla ${seed} (${estado().personaje?.club} ${estado().personaje?.categoria} ${estado().personaje?.letra}): convocado ${convocado} semanas (titular ${titular}, suplente que juega ${suplente}, convocado sin jugar ${convocado - titular - suplente}), no convocado ${ninguno}; PJ ${e?.pj ?? 0}, ${e?.min ?? 0} minutos. Semana a semana (T titular, s suplente, b banquillo sin jugar, · no convocado): ${semanas.join('')}`);
}
