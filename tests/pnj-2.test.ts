import { beforeAll, describe, expect, it, vi } from 'vitest';
import { RECOGIDA_DE_NINOS, SERVICES, type NpcDirectory, type PresenciaService, type TramoDeAgenda } from '@ds/contracts';
import { advanceToWeek, type Game } from '@ds/core';
import { MODULOS, cargarPartida, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { delColegio, edadNpc, type Npc, type NpcsState } from '@ds/mod-npcs';
import { conocer } from './ayudas';

vi.setConfig({ testTimeout: 480000, hookTimeout: 480000 });

/** Segunda tanda de arreglos de PNJ (17/11): niños de otros colegios, salida y actividades de la tarde, padres que recogen y lo que se puede hacer con cada persona. Notas: `docs/relevo/pnj-2.md`. */
describe('la gente del colegio y del barrio', () => {
  let g: Game;
  const npcs = (): Npc[] => (g.moduleState<NpcsState>('npcs') as NpcsState).npcs;
  const presencia = () => g.service<PresenciaService>(SERVICES.presencia)!;
  const edadDe = (n: Npc): number => edadNpc(n, g.time.day) ?? 0;
  const hasta = (hora: number, minuto = 0): void => { while (g.time.minuteOfDay < hora * 60 + minuto) expect(g.perform('gen.esperar').ok).toBe(true); };

  beforeAll(() => {
    g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    advanceToWeek(g, 'gen.descansar', 1, 1, 10); // martes, día de clase
  });

  it('los niños de otros colegios y del barrio están en su colegio (fuera del mapa) en horas de clase: nadie en el parque a las 11:00', () => {
    hasta(11);
    const ninos = npcs().filter((n) => n.role === 'vecino' && n.tipos?.some((t) => t.tipo === 'vecino' && t.escolar));
    expect(ninos.length).toBeGreaterThan(300);
    expect(ninos.some((n) => n.id.startsWith('nino_'))).toBe(true);
    expect(ninos.some((n) => n.id.startsWith('vecino_'))).toBe(true);
    for (const n of ninos) expect(presencia().donde(n.id), `${n.id} a las 11:00`).toBeNull();
    // Solo llevan el horario escolar los que van al colegio: los de 18 y 19 años (sin colegio) no.
    expect(npcs().filter((n) => n.colegio === 'ninguno').every((n) => !n.tipos?.some((t) => t.escolar))).toBe(true);
  });

  it('el equipo del colegio de otro colegio entrena como el del colegio del personaje (mismos días y horas), en su colegio (fuera del mapa)', () => {
    const de = npcs().find((n) => n.role === 'rival' && n.deporte === 'atletismo' && /^colegio\d$/.test(n.club ?? ''));
    expect(de, 'hay un niño en el equipo de otro colegio').toBeDefined();
    const propio = npcs().find((n) => n.deporte === 'atletismo' && n.tags.includes('equipo') && delColegio(n))!;
    const sesionDe = (id: string, tipo: string): TramoDeAgenda => presencia().agenda(id).find((t) => t.tipo === tipo && t.ocupado)!;
    const suya = sesionDe(de!.id, 'rival');
    const delPersonaje = sesionDe(propio.id, 'club');
    expect(suya, 'tiene su sesión').toBeDefined();
    expect(suya.destinos).toEqual([[null, 1]]); // en su colegio, que no sale en el mapa
    expect([suya.dias, suya.desde, suya.hasta]).toEqual([delPersonaje.dias, delPersonaje.desde, delPersonaje.hasta]);
  });

  it('quien tiene entrenamiento a las 15:00 sigue en el colegio de las 14:30 a las 14:50 y entonces está en el campo', () => {
    hasta(14, 31);
    const equipo = npcs().filter((n) => n.deporte === 'futbol' && n.tags.includes('equipo') && delColegio(n));
    expect(equipo.length).toBeGreaterThan(30);
    for (const n of equipo) expect(['colegio', 'patio'], `${n.id} a las 14:31`).toContain(presencia().donde(n.id));
    // Los alumnos sin actividad ya se han ido.
    const sinDeporte = npcs().filter((n) => n.role === 'companero' && n.deporte === undefined && delColegio(n));
    expect(sinDeporte.length).toBeGreaterThan(10);
    for (const n of sinDeporte) expect(presencia().donde(n.id), `${n.id} sin actividad a las 14:31`).not.toBe('colegio');
    hasta(14, 45);
    for (const n of equipo) expect(['colegio', 'patio'], `${n.id} a las 14:45`).toContain(presencia().donde(n.id));
    hasta(14, 50);
    for (const n of equipo) expect(presencia().donde(n.id), `${n.id} a las 14:50`).toBe('campo_colegio');
  });

  it('los vecinos adultos (de 25 años o más) que recogen son el 15 % más o menos, están en la entrada a las 14:00 el 80 % de los días y ya no a las 14:31', () => {
    advanceToWeek(g, 'gen.descansar', 2, 2, 12);
    const adultos = npcs().filter((n) => n.role === 'vecino' && /^vecino_\d+$/.test(n.id) && !n.colegio?.startsWith('colegio') && n.tipos?.some((t) => t.tipo === 'vecino') && !n.tags.includes('bibliotecario'));
    const quienes = adultos.filter((n) => n.tipos!.some((t) => t.recoge));
    const mayores = adultos.filter((n) => !n.tipos!.some((t) => t.escolar) && edadDe(n) >= RECOGIDA_DE_NINOS.edadMinima);
    // Nadie por debajo de la edad mínima recoge.
    expect(quienes.every((n) => edadDe(n) >= RECOGIDA_DE_NINOS.edadMinima)).toBe(true);
    // Con ~60 adultos, el 15 % sorteado tiene una desviación de ±4,6 puntos: se admite ±3 desviaciones (cambia con la semilla y la demografía).
    expect(quienes.length / mayores.length).toBeGreaterThan(0.05);
    expect(quienes.length / mayores.length).toBeLessThan(0.29);
    // Ningún niño ni nadie más lo lleva.
    expect(npcs().filter((n) => n.tipos?.some((t) => t.recoge) && (n.colegio !== undefined && n.colegio !== 'ninguno' && !n.id.startsWith('vecino_'))).length).toBe(0);
    hasta(13, 40);
    const enLaEntrada = () => new Set(presencia().en('colegio', 5000).filter((p) => p.role === 'vecino').map((p) => p.id));
    expect(enLaEntrada().size).toBe(0);
    hasta(14, 0);
    const alasCatorce = enLaEntrada();
    // Van el 80 % de los días: hoy, la mayoría de ellos (y todos los que han ido siguen en la entrada a las 14:00).
    expect(quienes.filter((n) => alasCatorce.has(n.id)).length / quienes.length).toBeGreaterThan(0.45);
    // Solo los que recogen: ningún otro vecino va a la entrada del colegio a esa hora.
    expect([...alasCatorce].filter((id) => !quienes.some((n) => n.id === id))).toEqual([]);
    hasta(14, 31);
    expect(enLaEntrada().size).toBe(0);
  });
});

describe('qué se puede hacer con cada persona', () => {
  let g: Game;
  const dir = () => g.service<NpcDirectory>(SERVICES.npcs)!;
  beforeAll(() => {
    g = nuevaPartida({ seed: 31 });
    advanceToWeek(g, 'gen.descansar', 1, 5, 11);
  });
  /** Una partida igual que `g` pero con este vínculo ya hecho con esta persona. */
  const conVinculo = (id: string, estado: string, afinidad: number, confianza: number): Game => {
    const guardado = g.serialize();
    const dia = g.time.day;
    (guardado.modules.relaciones as { vinculos: Record<string, unknown> }).vinculos[id] = { npcId: id, afinidad, confianza, estado, desde: 0, ultimoContacto: dia, contactos: [dia, dia - 1, dia - 2] };
    return cargarPartida(guardado);
  };
  const ids = (juego: Game, id: string) => ['quedar', 'charlar', 'ayudar', 'planes', 'detalle', 'discutir', 'jugar', 'estudiar', 'pasar_rato'].filter((x) => juego.preview(`relaciones.${x}.${id}`) !== undefined);

  it('un vecino adulto que conoces: se puede charlar con él (y nada más)', () => {
    const adulto = dir().list({ role: 'vecino' }).find((n) => n.age !== undefined && n.age >= 25 && !n.tags.includes('bibliotecario'))!;
    conocer(g, adulto.id);
    const charlar = g.preview(`relaciones.charlar.${adulto.id}`);
    expect(charlar, 'existe «charlar»').toBeDefined();
    expect(ids(g, adulto.id)).toEqual(['charlar']);
  });

  it('un niño del barrio conocido: solo charlar; cuando ya es amigo (el mismo umbral que un compañero), todo el catálogo de la amistad', () => {
    const nino = dir().list({ role: 'vecino' }).find((n) => n.age !== undefined && n.age < 18)!;
    conocer(g, nino.id);
    expect(ids(g, nino.id)).toEqual(['charlar']);
    // Casi amigo: afinidad 39 (el umbral es 40): sigue como conocido.
    const casi = conVinculo(nino.id, 'conocido', 39, 35);
    expect(ids(casi, nino.id)).toEqual(['charlar']);
    // Amigo (afinidad ≥ 40, confianza ≥ 30 y trato reciente): lo mismo que tiene un compañero que es amigo.
    const amigo = conVinculo(nino.id, 'amigo', 45, 35);
    const companero = dir().list({ role: 'companero' })[0];
    conocer(amigo, companero.id);
    const comoCompanero = ['quedar', 'charlar', 'ayudar', 'planes', 'detalle', 'discutir', 'jugar', 'estudiar', 'pasar_rato'].filter((x) => amigo.preview(`relaciones.${x}.${companero.id}`) !== undefined);
    expect(ids(amigo, nino.id)).toEqual(comoCompanero);
    expect(ids(amigo, nino.id)).toContain('quedar');
  });

  it('con todos los rivales conocidos se puede charlar, no solo con los 5 más marcados', () => {
    const rivales = dir().list({ role: 'rival' }).slice(0, 40);
    expect(rivales.length).toBeGreaterThan(10);
    conocer(g, ...rivales.map((r) => r.id));
    for (const r of rivales) expect(g.preview(`relaciones.charlar.${r.id}`), `charlar con ${r.id}`).toBeDefined();
  });

  it('las acciones de los rivales que no tienes cerca no entran en la lista (el coste no crece con los conocidos), pero se pueden consultar y dicen por qué no', () => {
    const rivales = dir().list({ role: 'rival' }).slice(0, 40);
    conocer(g, ...rivales.map((r) => r.id));
    const enLista = new Set(g.listActions().map((a) => a.id));
    for (const r of rivales) {
      expect(enLista.has(`relaciones.charlar.${r.id}`), `${r.id} en la lista`).toBe(false);
      const p = g.preview(`relaciones.charlar.${r.id}`);
      expect(p, r.id).toBeDefined();
      expect(p!.available).toBe(false);
      expect(g.preview(`relaciones.discutir.${r.id}`)).toBeDefined();
    }
  });
});
