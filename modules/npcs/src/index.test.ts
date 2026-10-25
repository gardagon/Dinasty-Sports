import { describe, expect, it } from 'vitest';
import { SERVICES, madurezPorEdad, ventajaDeCrianza, type FamilyService, type NpcDirectory } from '@ds/contracts';
import { Game, advanceTo, advanceUntil } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { familia } from '@ds/mod-familia';
import { desarrolloRival, npcs, type NpcsState } from './index';

const nueva = () => Game.create([personaje, npcs], { seed: 9 });

describe('módulo NPCs', () => {
  it('genera un reparto y lo publica como servicio', () => {
    const g = nueva();
    const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
    const hermanos = dir.list({ tag: 'hermano' }).length;
    expect(dir.list().length).toBe(100 + hermanos); // 4 del entorno + 8 rivales por cada edad de 8 a 19 + los hermanos
    expect(dir.list({ role: 'rival' })).toHaveLength(96);
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
        expect(dir(g).list({ role: 'rival', minAge: edad, maxAge: edad })).toHaveLength(8);
      }
      expect(dir(g).list({ role: 'rival', minAge: 20 })).toHaveLength(0);
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
        const xs = dir(g).list({ role: 'rival', minAge: edad, maxAge: edad });
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
        expect(dir(g).list({ role: 'rival', minAge: edad, maxAge: edad })).toHaveLength(8);
      }
      expect(despues).toHaveLength(96);
      expect(dir(g).list({ role: 'rival', minAge: 21 })).toHaveLength(0);
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
});

describe('hermanos', () => {
  const partidas = Array.from({ length: 200 }, (_, i) => Game.create([personaje, familia, npcs], { seed: i + 1 }));
  const hermanosDe = (g: Game) => g.service<NpcDirectory>(SERVICES.npcs)!.list({ tag: 'hermano' });

  it('hay de 0 a 3 hermanos, con los apellidos de la familia y el rol familia', () => {
    const cuenta = [0, 0, 0, 0];
    for (const g of partidas) {
      const hs = hermanosDe(g);
      expect(hs.length).toBeLessThanOrEqual(3);
      cuenta[hs.length]++;
      const apellidos = g.service<FamilyService>(SERVICES.familia)!.apellidos;
      for (const h of hs) {
        expect(h.role).toBe('familia');
        expect(h.name.endsWith(apellidos)).toBe(true);
        expect(h.known).not.toBe(false);
      }
    }
    expect(cuenta[1]).toBeGreaterThan(cuenta[0]);
    expect(cuenta[1]).toBeGreaterThan(cuenta[3]);
    expect(cuenta.every((c) => c > 0)).toBe(true);
  });

  it('son mayores o menores que el personaje (de 2 a 14 años al empezar), sin repetir edad', () => {
    for (const g of partidas) {
      const edades = hermanosDe(g).map((h) => g.service<NpcDirectory>(SERVICES.npcs)!.get(h.id)!.age!);
      for (const e of edades) {
        expect(e).toBeGreaterThanOrEqual(2);
        expect(e).toBeLessThanOrEqual(14);
      }
      expect(edades.filter((e) => e === 8).length).toBeLessThanOrEqual(1);
    }
  });

  it('heredan carácter e intereses de sus padres y tienen su propio potencial en atletismo', () => {
    const potenciales = partidas.flatMap((g) => g.moduleState<NpcsState>('npcs').npcs.filter((n) => n.tags.includes('hermano')).map((n) => n.potential.atletismo));
    expect(potenciales.length).toBeGreaterThan(100);
    for (const p of potenciales) {
      expect(p).toBeGreaterThanOrEqual(20);
      expect(p).toBeLessThanOrEqual(95);
    }
    const sd = Math.sqrt(potenciales.reduce((a, p) => a + (p - potenciales.reduce((x, y) => x + y, 0) / potenciales.length) ** 2, 0) / potenciales.length);
    expect(sd).toBeGreaterThan(5); // cada hermano es distinto
  });

  it('los que tienen 8 años o más compiten (etiqueta atleta, con nivel) y los pequeños empiezan al cumplirlos', () => {
    const g = partidas.find((x) => hermanosDe(x).some((h) => (x.service<NpcDirectory>(SERVICES.npcs)!.get(h.id)!.age ?? 0) < 8 && (x.service<NpcDirectory>(SERVICES.npcs)!.get(h.id)!.age ?? 0) >= 6))!;
    const dir = () => g.service<NpcDirectory>(SERVICES.npcs)!;
    const pequeno = hermanosDe(g).find((h) => (dir().get(h.id)!.age ?? 0) < 8 && (dir().get(h.id)!.age ?? 0) >= 6)!;
    expect(dir().get(pequeno.id)!.tags).not.toContain('atleta');
    expect(dir().get(pequeno.id)!.levels.atletismo).toBeUndefined();
    const mayor = hermanosDe(g).find((h) => (dir().get(h.id)!.age ?? 0) >= 8);
    if (mayor) {
      expect(dir().get(mayor.id)!.tags).toContain('atleta');
      expect(dir().get(mayor.id)!.levels.atletismo).toBeGreaterThan(0);
    }
    advanceUntil(g, 'gen.descansar', (t) => t.day >= 365 * 3, 40000);
    expect(dir().get(pequeno.id)!.tags).toContain('atleta');
    expect(dir().get(pequeno.id)!.levels.atletismo).toBeGreaterThan(0);
  });

  it('un hermano de 8 a 19 años aparece en su categoría junto a los rivales', () => {
    const g = partidas.find((x) => hermanosDe(x).some((h) => x.service<NpcDirectory>(SERVICES.npcs)!.get(h.id)!.age === 8))!;
    const h = hermanosDe(g).find((x) => g.service<NpcDirectory>(SERVICES.npcs)!.get(x.id)!.age === 8)!;
    expect(g.service<NpcDirectory>(SERVICES.npcs)!.list({ tag: 'atleta', minAge: 8, maxAge: 8 }).map((n) => n.id)).toContain(h.id);
  });

  it('los hermanos no se retiran con los cursos: siguen cuando los rivales se renuevan', () => {
    const g = partidas.find((x) => hermanosDe(x).length >= 2)!;
    const antes = hermanosDe(g).map((h) => h.id);
    advanceUntil(g, 'gen.descansar', (t) => t.schoolYear >= 3, 30000);
    expect(hermanosDe(g).map((h) => h.id)).toEqual(antes);
  });
});
