import { describe, expect, it, vi } from 'vitest';
import { SERVICES, deLugar, haciaLugar, type LugaresService, type PresenciaService, type SucesoPendiente, type SucesosService } from '@ds/contracts';
import type { Game } from '@ds/core';
import { nuevaPartida } from '@ds/game';
import { conocer, llegarA, viajarA } from './ayudas';

vi.setConfig({ testTimeout: 240000, hookTimeout: 240000 });

/** Moverse con el grupo (21/11/2026): la señal de `npcs`, el suceso que pregunta y el viaje con ellos. */
describe('cómo se dice a dónde van', () => {
  it('con su artículo, sin lista de sitios', () => {
    expect(haciaLugar('Patio')).toBe('al patio');
    expect(haciaLugar('Biblioteca')).toBe('a la biblioteca');
    expect(haciaLugar('Tu aula')).toBe('a tu aula');
    expect(haciaLugar('Sala de profesores')).toBe('a la sala de profesores');
    expect(haciaLugar('Pista de atletismo del colegio')).toBe('a la pista de atletismo del colegio');
    expect(haciaLugar('Campo de fútbol del colegio')).toBe('al campo de fútbol del colegio');
    expect(haciaLugar('Administración del colegio')).toBe('a la administración del colegio');
    expect(deLugar('Colegio')).toBe('del colegio');
    expect(deLugar('Biblioteca')).toBe('de la biblioteca');
  });
});

describe('en una partida de verdad', () => {
  const pregunta = (g: Game): SucesoPendiente | undefined => g.service<SucesosService>(SERVICES.sucesos)!.pendientes().find((p) => p.suceso === 'eventos.grupo.se_van');
  const donde = (g: Game): string => g.service<LugaresService>(SERVICES.lugares)!.actual().id;
  const esperar = (g: Game): void => void g.perform('gen.esperar');
  /** Un día lectivo, ya en el aula poco antes del recreo (a las 10:30), con los de clase en ella. */
  const alRecreo = (seed: number): Game => {
    const g = nuevaPartida({ seed });
    while (!g.time.isSchoolDay) {
      for (let k = 0; k < 300; k++) esperar(g);
    }
    llegarA(g, 'aula', 10, 30);
    return g;
  };
  /** Espera de 5 en 5 hasta que salga la pregunta (como mucho dos horas). */
  const hastaQueSeVan = (g: Game): SucesoPendiente | undefined => {
    for (let k = 0; k < 24 && !pregunta(g); k++) esperar(g);
    return pregunta(g);
  };

  it('al empezar el recreo, los de tu clase se van al patio: sale «¿les acompañas?» y no se puede aplazar', () => {
    const g = alRecreo(11);
    const p = hastaQueSeVan(g)!;
    expect(p).toBeDefined();
    expect(p.texto).toBe('Todos se van al patio. ¿Les acompañas?');
    expect(p).toMatchObject({ urgencia: 'ahora', aplazable: false });
    const [ir, quedar] = p.opciones;
    expect(ir.minutos).toBe(g.service<LugaresService>(SERVICES.lugares)!.minutosA('patio'));
    expect(ir.minutos).toBeGreaterThan(1);
    expect(quedar.minutos).toBe(1);
    // Sigues en el aula hasta que decides.
    expect(donde(g)).toBe('aula');
  });

  it('si dices que sí, vas con ellos al patio como un viaje que gasta esos minutos', () => {
    const g = alRecreo(11);
    const p = hastaQueSeVan(g)!;
    const minutos = p.opciones[0].minutos;
    const antes = g.time.minute;
    expect(g.perform(p.opciones[0].accion)).toMatchObject({ ok: true, duration: minutos });
    expect(g.time.minute - antes).toBe(minutos);
    expect(donde(g)).toBe('patio');
    expect(pregunta(g)).toBeUndefined();
  });

  it('si dices que no, te quedas donde estás', () => {
    const g = alRecreo(11);
    const p = hastaQueSeVan(g)!;
    g.perform(p.opciones[1].accion);
    expect(donde(g)).toBe('aula');
    expect(pregunta(g)).toBeUndefined();
  });

  it('si haces otra cosa sin responder, el momento pasa y te quedas', () => {
    const g = alRecreo(11);
    hastaQueSeVan(g);
    esperar(g);
    expect(pregunta(g)).toBeUndefined();
    expect(donde(g)).toBe('aula');
  });

  it('al acabar el recreo, los compañeros que conoces vuelven al aula y se te pregunta; los desconocidos que se van a sus aulas de fuera no cuentan', () => {
    const g = nuevaPartida({ seed: 21 });
    while (!g.time.isSchoolDay) for (let k = 0; k < 300; k++) esperar(g);
    // Conoce a unos cuantos compañeros de su clase (los que están dando clase en el aula).
    llegarA(g, 'aula', 10, 30);
    conocer(g, ...g.service<PresenciaService>(SERVICES.presencia)!.ocupadosEn('aula').slice(0, 8).map((o) => o.persona.id));
    viajarA(g, 'patio');
    expect(donde(g)).toBe('patio');
    for (let k = 0; k < 24 && !pregunta(g); k++) esperar(g);
    const p = pregunta(g)!;
    expect(p.texto).toBe('Todos se van a tu aula. ¿Les acompañas?');
    expect(g.perform(p.opciones[0].accion).ok).toBe(true);
    expect(donde(g)).toBe('aula');
  });

  it('«Me voy»: quien conoces y tienes al lado y se va aparte dice una línea corta, sin preguntar nada ni ensuciar', () => {
    const g = conocer(nuevaPartida({ seed: 21 }));
    while (!g.time.isSchoolDay) for (let k = 0; k < 300; k++) esperar(g);
    llegarA(g, 'patio', 10, 41);
    const lineas: string[] = [];
    for (let k = 0; k < 24; k++) {
      const r = g.perform('gen.esperar');
      lineas.push(...r.log.map((l) => l.text).filter((t) => t.includes('«Me voy')));
    }
    // Los compañeros que conoces (dos: no hacen grupo) se van al aula al acabar el recreo y lo dicen; quien sale del mapa dice solo «Me voy».
    expect(lineas.length).toBeGreaterThan(0);
    expect(lineas.length).toBeLessThanOrEqual(2);
    expect(lineas[0]).toMatch(/^.+: «Me voy( a tu aula)?\.»$/);
  });

  it('al acabar la clase, los de tu clase salen a la entrada: se dice «a la entrada del colegio»', () => {
    const g = alRecreo(11);
    // Se queda en el aula pasando el recreo y la última clase: se va el grupo a las 14:00.
    for (let k = 0; k < 400 && !(g.time.minuteOfDay > 13 * 60 + 40); k++) {
      const p = pregunta(g);
      if (p) g.perform(p.opciones[1].accion);
      else esperar(g);
    }
    const p = hastaQueSeVan(g)!;
    expect(p.texto).toBe('Todos se van a la entrada del colegio. ¿Les acompañas?');
  });

  it('no sale si el grupo se va y tú también (te desplazas tú) ni si no hay nadie contigo', () => {
    const g = alRecreo(11);
    // Salir del aula antes de que se vayan: la acción de ir a otro sitio no cuenta.
    for (let k = 0; k < 40 && g.time.minuteOfDay < 10 * 60 + 45; k++) {
      if (donde(g) === 'aula') g.perform('lugares.ir_colegio');
      else esperar(g);
      expect(pregunta(g)).toBeUndefined();
    }
  });

  it('en casa, de noche, no sale nada: no hay grupo que se vaya', () => {
    const g = nuevaPartida({ seed: 12 });
    for (let k = 0; k < 1500; k++) {
      esperar(g);
      if (donde(g) === 'casa') expect(pregunta(g)).toBeUndefined();
    }
  });
});
