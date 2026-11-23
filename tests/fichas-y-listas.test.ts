import { describe, expect, it, vi } from 'vitest';
import { SERVICES, diaConFecha, type LugaresService, type NpcDirectory, type PresenciaService } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { clicEnGente, reiniciarGente, viewPanelGente } from '../apps/web/src/gente';
import { conocer, hacer } from './ayudas';

vi.setConfig({ testTimeout: 240000, hookTimeout: 240000 });

/** Fichas y listas (17/11): ficha de quien no está a tu lado, padres que recogen, prueba fuera de plazo y desplegables. Notas: `docs/relevo/fichas-y-listas.md`. */
describe('la ficha de alguien que no está a tu lado', () => {
  const abrir = (g: Parameters<typeof viewPanelGente>[0], id: string): string => {
    reiniciarGente();
    clicEnGente({ dataset: { gente: 'ver', id } } as unknown as HTMLElement);
    return viewPanelGente(g);
  };

  it('no enseña nada que hacer con ella (ni en gris, ni proponer quedar); a quien tienes al lado sí; el apodo se queda en los dos casos', () => {
    const g = nuevaPartida({ seed: 31 }, MODULOS);
    advanceToWeek(g, 'gen.descansar', 1, 1, 10);
    const lugar = g.service<LugaresService>(SERVICES.lugares)!.actual().id;
    const presencia = g.service<PresenciaService>(SERVICES.presencia)!;
    const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
    const cerca = new Set([...presencia.en(lugar, presencia.aforo(lugar)), ...presencia.ocupadosEn(lugar).map((o) => o.persona)].map((n) => n.id));
    const todas = dir.list({});
    const lejana = todas.find((n) => !cerca.has(n.id) && n.role === 'companero')!;
    const cercana = todas.find((n) => cerca.has(n.id) && n.role !== 'familia' && !presencia.ocupadosEn(lugar).some((o) => o.persona.id === n.id));
    // Familia, rival, vecino y entrenador (o profesor) lejanos: todos igual.
    const lejanas = [lejana, ...['familia', 'rival', 'vecino', 'entrenador', 'profesor'].map((r) => todas.find((n) => !cerca.has(n.id) && n.role === r)).filter((n) => n !== undefined)];
    expect(lejanas.length).toBeGreaterThanOrEqual(3);
    conocer(g, ...lejanas.map((n) => n!.id), ...(cercana ? [cercana.id] : []));
    for (const n of lejanas) {
      const html = abrir(g, n!.id);
      expect(html, n!.id).toContain('apodo-boton');
      expect(html, n!.id).not.toContain('Qué hacer con');
      expect(html, n!.id).not.toContain('Lo que no se puede ahora');
      expect(html, n!.id).not.toContain('Proponer quedar');
      expect(html, n!.id).not.toContain('Pedir ');
      expect(html, n!.id).not.toMatch(/data-do="relaciones\.(?!poner_apodo)/);
    }
    if (cercana) {
      const html = abrir(g, cercana.id);
      expect(html).toContain('Qué hacer con');
      expect(html).toContain('apodo-boton');
    }
  });

  it('un desconocido que no está a tu lado no ofrece preguntar su nombre ni dice cómo conseguirlo', () => {
    const g = nuevaPartida({ seed: 31 }, MODULOS);
    advanceToWeek(g, 'gen.descansar', 1, 1, 10);
    const lugar = g.service<LugaresService>(SERVICES.lugares)!.actual().id;
    const presencia = g.service<PresenciaService>(SERVICES.presencia)!;
    const cerca = new Set(presencia.en(lugar, presencia.aforo(lugar)).map((n) => n.id));
    const lejana = g.service<NpcDirectory>(SERVICES.npcs)!.list({}).find((n) => !cerca.has(n.id) && n.known === false)!;
    const html = abrir(g, lejana.id);
    expect(html).toContain('Todavía no sabes cómo se llama');
    expect(html).not.toContain('Preguntar su nombre');
    expect(html).not.toContain('No la tienes cerca');
  });
});

describe('la prueba de acceso fuera del plazo de fichajes dice cuándo se abren las pruebas', () => {
  const nueva = () => nuevaPartida({ seed: 31 }, MODULOS);

  it('con club propio: la acción no está disponible y da la fecha en que abre el plazo (el primer día del verano)', () => {
    const g = nueva();
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    expect(hacer(g, 'atletismo.apuntarse_colegio').ok).toBe(true);
    advanceToWeek(g, 'gen.descansar', 10, 1, 18);
    const prueba = g.preview('atletismo.prueba.club_ciudad');
    expect(prueba?.available).toBe(false);
    // La semana 41 del curso es la primera de verano: su lunes, con su fecha.
    expect(prueba?.reason).toContain(`Las pruebas de acceso se abren ${diaConFecha(41 * 7)}`);
    expect(diaConFecha(41 * 7)).toMatch(/^el lunes \d+ de /);
  });

  it('quien dejó su club fuera de plazo: lo mismo, con la misma fecha', () => {
    const g = nueva();
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    expect(hacer(g, 'atletismo.apuntarse_colegio').ok).toBe(true);
    advanceToWeek(g, 'gen.descansar', 10, 2, 15);
    expect(hacer(g, 'atletismo.dejar_club').ok).toBe(true);
    const prueba = g.preview('atletismo.prueba.club_ciudad');
    expect(prueba?.available).toBe(false);
    expect(prueba?.reason).toMatch(/Dejaste tu club fuera de plazo/);
    expect(prueba?.reason).toContain(`Las pruebas de acceso se abren ${diaConFecha(41 * 7)}`);
  });

  it('dentro del plazo no se habla de fechas', () => {
    const g = nueva();
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    expect(g.preview('atletismo.prueba.club_ciudad')?.reason ?? '').not.toContain('Las pruebas de acceso se abren');
  });
});

describe('las listas largas van en desplegables (ActionDef.desplegable)', () => {
  it('«Estudiar…» (cada asignatura del curso y el repaso) y «Pedir tutoría…»; los ids no cambian', () => {
    const g = nuevaPartida({ seed: 31 }, MODULOS);
    const lista = g.listActions().filter((o) => o.group === 'Estudiar');
    const de = (id: string) => lista.filter((o) => o.desplegable?.id === id);
    const estudiar = de('estudios.estudiar');
    const tutorias = de('estudios.tutoria');
    expect(estudiar.length).toBeGreaterThan(10);
    expect(tutorias.length).toBeGreaterThan(10);
    expect(estudiar.every((o) => o.id.startsWith('estudios.estudiar_') || o.id === 'estudios.repaso')).toBe(true);
    expect(estudiar.some((o) => o.id === 'estudios.repaso')).toBe(true);
    expect(tutorias.every((o) => o.id.startsWith('estudios.tutoria_'))).toBe(true);
    expect(estudiar[0].desplegable).toMatchObject({ nombre: 'Estudiar…', boton: '{nombre}' });
    expect(tutorias[0].desplegable).toMatchObject({ nombre: 'Pedir tutoría…' });
    // Cada opción lleva su etiqueta corta (la asignatura) y la acción conserva su nombre completo.
    expect(estudiar.find((o) => o.id === 'estudios.estudiar_lengua')).toMatchObject({ name: 'Estudiar lengua', desplegable: { opcion: 'Lengua' } });
    // Lo que no encaja (preguntar al profesor de Educación Física) sigue suelto.
    expect(lista.find((o) => o.id === 'estudios.consejo_educacion_fisica')?.desplegable).toBeUndefined();
  });

  it('con dos deportes, «Campamento» y «Ver en la tele» llevan un desplegable por deporte; el fútbol tiene dos campamentos y no tiene «Practicar con los amigos» (quedar a jugar es una actividad de «Proponer quedar para…»)', async () => {
    const { futbol } = await import('@ds/mod-futbol');
    const g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    const lista = g.listActions();
    // Con un solo deporte que lo ofrezca, «Practicar con los amigos» se dibuja como un botón normal.
    expect(lista.filter((o) => o.desplegable?.id === 'verano.amigos').map((o) => o.id)).toEqual(['atletismo.amigos']);
    expect(lista.some((o) => o.id === 'futbol.amigos')).toBe(false);
    const campamentos = lista.filter((o) => o.desplegable?.id === 'verano.campamento');
    expect(campamentos.map((o) => o.id).sort()).toEqual(['atletismo.campamento', 'futbol.campamento_jugadores', 'futbol.campamento_porteros']);
    expect(campamentos.map((o) => o.desplegable!.opcion).sort()).toEqual(['Atletismo', 'Fútbol: jugadores', 'Fútbol: porteros']);
    const tele = lista.filter((o) => o.desplegable?.id === 'tiempo_libre.tele');
    expect(tele.map((o) => o.id).sort()).toEqual(['atletismo.ver_tele', 'futbol.ver_tele']);
    expect(tele.map((o) => o.desplegable!.opcion).sort()).toEqual(['Atletismo', 'Fútbol']);
  });
});
