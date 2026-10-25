import { describe, expect, it } from 'vitest';
import { SERVICES, madurezPorEdad, ventajaDeCrianza, type NpcDirectory, type PresenciaService } from '@ds/contracts';
import { Game, advanceTo, advanceUntil } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { desarrolloRival, npcs, type NpcsState } from './index';

const nueva = () => Game.create([personaje, npcs], { seed: 9 });

describe('módulo NPCs', () => {
  it('genera un reparto y lo publica como servicio', () => {
    const g = nueva();
    const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
    expect(dir.list().length).toBe(100); // 4 del entorno + 8 rivales por cada edad de 8 a 19
    expect(dir.list({ tag: 'atleta' })).toHaveLength(96);
    expect(dir.get('entrenador')?.role).toBe('entrenador');
  });

  it('los rivales progresan con los días', () => {
    const g = nueva();
    const nivel = () => g.service<NpcDirectory>(SERVICES.npcs)!.get('rival_1')!.levels.atletismo;
    const antes = nivel();
    advanceTo(g, 'gen.descansar', 6, 20);
    expect(nivel()).toBeGreaterThan(antes);
  });

  it('los rivales son distintos entre sí: unos parten con ventaja y otros con más potencial', () => {
    const rivales = nueva().moduleState<NpcsState>('npcs').npcs.filter((n) => n.role === 'rival');
    const niveles = rivales.map((n) => n.levels.atletismo);
    const potenciales = rivales.map((n) => n.potential.atletismo);
    const ritmos = rivales.map((n) => n.ritmo?.atletismo ?? 1);
    expect(Math.max(...niveles) - Math.min(...niveles)).toBeGreaterThan(8);
    expect(Math.max(...potenciales) - Math.min(...potenciales)).toBeGreaterThan(15);
    expect(Math.max(...ritmos) - Math.min(...ritmos)).toBeGreaterThan(0.2);
    expect(new Set(rivales.map((n) => n.name)).size).toBe(rivales.length);
  });

  describe('rivales por edad', () => {
    const rivales = (g: Game) => g.moduleState<NpcsState>('npcs').npcs.filter((n) => n.role === 'rival');
    const dir = (g: Game) => g.service<NpcDirectory>(SERVICES.npcs)!;

    it('hay 8 rivales por cada edad de 8 a 19, desconocidos al principio y con nombres únicos', () => {
      const g = nueva();
      for (let edad = 8; edad <= 19; edad++) {
        expect(dir(g).list({ tag: 'atleta', minAge: edad, maxAge: edad })).toHaveLength(8);
      }
      expect(dir(g).list({ tag: 'atleta', minAge: 20 })).toHaveLength(0);
      expect(rivales(g).every((n) => n.known === false)).toBe(true);
      expect(new Set(rivales(g).map((n) => n.name)).size).toBe(rivales(g).length);
    });

    it('nadie supera el techo de su edad: potencial × desarrollo', () => {
      const g = nueva();
      advanceTo(g, 'gen.descansar', 6, 20);
      for (const n of rivales(g)) {
        const edad = (g.time.day - n.nacimiento!) / 365;
        const techo = n.potential.atletismo * desarrolloRival(edad + (n.desfase ?? 0));
        expect(n.levels.atletismo).toBeLessThanOrEqual(techo + 1e-6);
      }
    });

    it('los más jóvenes están lejos de su potencial y los mayores cerca', () => {
      const g = nueva();
      const media = (edad: number) => {
        const xs = dir(g).list({ tag: 'atleta', minAge: edad, maxAge: edad });
        return xs.reduce((a, n) => a + n.levels.atletismo, 0) / xs.length;
      };
      expect(media(8)).toBeLessThan(media(12));
      expect(media(12)).toBeLessThan(media(18));
      expect(media(8)).toBeLessThan(50);
    });

    it('cada curso se van los mayores y entran niños nuevos', () => {
      const g = nueva();
      const idsAntes = new Set(rivales(g).map((n) => n.id));
      advanceUntil(g, 'gen.descansar', (t) => t.schoolYear >= 1, 20000);
      const despues = rivales(g);
      // La edad de competición es por año de nacimiento: tras el relevo cada edad tiene exactamente 8 rivales.
      for (let edad = 8; edad <= 19; edad++) {
        expect(dir(g).list({ tag: 'atleta', minAge: edad, maxAge: edad })).toHaveLength(8);
      }
      expect(despues).toHaveLength(96);
      expect(dir(g).list({ tag: 'atleta', minAge: 21 })).toHaveLength(0);
      // Se han ido los de 19 años y han entrado niños de 8 que antes no estaban.
      expect(despues.filter((n) => !idsAntes.has(n.id)).length).toBeGreaterThanOrEqual(8);
      expect(despues.filter((n) => idsAntes.has(n.id)).length).toBeLessThan(96);
    });
  });

  it('los rivales tienen padres: su potencial sale del de ellos y lo que practicaron da ventaja de partida', () => {
    const rivales = nueva().moduleState<NpcsState>('npcs').npcs.filter((n) => n.role === 'rival');
    for (const r of rivales) {
      const { padre, madre } = r.padres!;
      const topes = [...Object.values(padre.topes), ...Object.values(madre.topes)];
      expect(topes).toHaveLength(12);
      for (const t of topes) {
        expect(t).toBeGreaterThanOrEqual(35);
        expect(t).toBeLessThanOrEqual(95);
      }
      // Su tope de atletismo ronda lo que hereda de sus padres (±20 % por capacidad y ±15 % de aptitud).
      expect(r.potential.atletismo).toBeGreaterThanOrEqual(20);
      expect(r.potential.atletismo).toBeLessThanOrEqual(95);
      expect(padre.nombre.split(' ').slice(1).join(' ')).toBe(r.name.split(' ').slice(1).join(' '));
    }
    // Los padres sin deporte no dan ventaja; los dos profesionales, la máxima.
    expect(ventajaDeCrianza('ninguna', 'ninguna')).toBeLessThan(ventajaDeCrianza('aficionado', 'ninguna'));
    expect(ventajaDeCrianza('profesional', 'profesional')).toBeGreaterThan(ventajaDeCrianza('federado', 'federado'));
    // Nadie parte por encima de su techo de esa edad.
    for (const r of rivales) expect(r.levels.atletismo).toBeLessThanOrEqual(r.potential.atletismo);
  });

  it('los rivales que entran al renovar el curso también traen padres', () => {
    const g = nueva();
    for (let i = 0; i < 400; i++) g.perform('gen.dormir');
    const rivales = g.moduleState<NpcsState>('npcs').npcs.filter((n) => n.role === 'rival');
    expect(rivales.every((r) => r.padres)).toBe(true);
  });

  it('el tope de atletismo de los rivales sale de lo que heredan: media ~62 y los padres tienen perfil', () => {
    const rivales = nueva().moduleState<NpcsState>('npcs').npcs.filter((n) => n.role === 'rival');
    const pot = rivales.map((n) => n.potential.atletismo);
    const media = pot.reduce((a, b) => a + b, 0) / pot.length;
    expect(media).toBeGreaterThan(56);
    expect(media).toBeLessThan(68);
    expect(Math.max(...pot) - Math.min(...pot)).toBeGreaterThan(20);
    // Un padre no es plano: sus capacidades físicas se reparten en bandas.
    const rango = (r: (typeof rivales)[number]) => {
      const t = Object.values(r.padres!.padre.topes);
      return Math.max(...t) - Math.min(...t);
    };
    expect(rivales.filter((r) => rango(r) > 12).length).toBeGreaterThan(rivales.length / 2);
  });

  it('todas las personas tienen rasgos: origen, apariencia, carácter, intereses y gustos', () => {
    const lista = nueva().moduleState<NpcsState>('npcs').npcs;
    for (const n of lista) {
      expect(n.rasgos).toBeDefined();
      expect(Object.keys(n.rasgos!.caracter)).toHaveLength(8);
      expect(Object.keys(n.rasgos!.intereses).length).toBeGreaterThanOrEqual(2);
    }
    expect(lista.filter((n) => n.role === 'rival').every((n) => n.rasgos)).toBe(true);
  });

  it('el carácter y los intereses dependen del papel: el entrenador es más disciplinado y le gusta el deporte', () => {
    const entrenadores = Array.from({ length: 150 }, (_, i) => Game.create([personaje, npcs], { seed: i + 1 }).moduleState<NpcsState>('npcs').npcs.find((n) => n.id === 'entrenador')!);
    const media = entrenadores.reduce((a, n) => a + n.rasgos!.caracter.disciplina, 0) / entrenadores.length;
    expect(media).toBeGreaterThan(7);
    expect(entrenadores.filter((n) => 'deporte' in n.rasgos!.intereses || 'atletismo' in n.rasgos!.intereses).length / entrenadores.length).toBeGreaterThan(0.8);
  });

  it('los rasgos se publican en el servicio pero no cambian con los días', () => {
    const g = nueva();
    const antes = JSON.stringify(g.service<NpcDirectory>(SERVICES.npcs)!.get('tutor')!.rasgos);
    advanceTo(g, 'gen.descansar', 6, 20);
    expect(JSON.stringify(g.service<NpcDirectory>(SERVICES.npcs)!.get('tutor')!.rasgos)).toBe(antes);
  });

  describe('presencia en los lugares', () => {
    const nombres = (g: Game, lugar: string, max?: number) => g.service<PresenciaService>(SERVICES.presencia)!.en(lugar, max).map((n) => n.id);

    it('en horario de clase están en el colegio el tutor y los compañeros, y no los rivales de otros clubes', () => {
      const g = nueva();
      advanceTo(g, 'gen.descansar', 0, 10); // lunes, 10:00
      const aqui = nombres(g, 'colegio');
      expect(aqui).toContain('tutor');
      expect(aqui).toContain('companero_estudio');
      expect(aqui).toContain('companero_social');
      expect(aqui.some((id) => id.startsWith('rival_'))).toBe(false);
    });

    it('el sábado por la mañana los rivales y el entrenador están en el estadio', () => {
      const g = nueva();
      advanceTo(g, 'gen.descansar', 5, 10);
      const aqui = nombres(g, 'estadio');
      expect(aqui).toContain('entrenador');
      // Va a las carreras algo menos de la mitad de los 96 rivales.
      const rivales = aqui.filter((id) => id.startsWith('rival_')).length;
      expect(rivales).toBeGreaterThan(25);
      expect(rivales).toBeLessThan(55);
      expect(nombres(g, 'colegio')).toEqual([]);
    });

    it('de noche no hay nadie en ningún lugar del mapa', () => {
      const g = nueva();
      advanceTo(g, 'gen.descansar', 2, 3);
      for (const l of ['colegio', 'estadio', 'parque', 'gimnasio', 'supermercado', 'restaurante', 'casa']) expect(nombres(g, l)).toEqual([]);
    });

    it('se puede limitar cuántos hay, y primero salen los de mayor nivel (el tutor antes que un compañero)', () => {
      const g = nueva();
      advanceTo(g, 'gen.descansar', 0, 10);
      const dos = nombres(g, 'colegio', 2);
      expect(dos).toHaveLength(2);
      expect(dos).toContain('tutor');
    });

    it('cada persona sabe dónde está y tiene su agenda', () => {
      const g = nueva();
      advanceTo(g, 'gen.descansar', 0, 10);
      const p = g.service<PresenciaService>(SERVICES.presencia)!;
      expect(p.donde('tutor')).toBe('colegio');
      expect(p.donde('nadie')).toBeUndefined();
      expect(p.agenda('tutor').some((x) => x.tipo === 'profesor')).toBe(true);
    });

    it('la presencia no cambia dentro de un mismo tramo horario', () => {
      const g = nueva();
      advanceTo(g, 'gen.descansar', 1, 15);
      const a = nombres(g, 'parque');
      g.perform('gen.descansar'); // 16:00, misma tarde libre
      expect(nombres(g, 'parque')).toEqual(a);
    });
  });
});
