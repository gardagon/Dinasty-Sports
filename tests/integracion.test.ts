import { describe, expect, it } from 'vitest';
import { GEN, SERVICES, categoriaDeEdad, type ClubDirectory, type IdentityService, type NpcDirectory } from '@ds/contracts';
import { CATEGORIAS_ESPANA } from '@ds/mod-atletismo';
import { advanceTo, advanceToWeek, checkInvariants, seededRng, type Game } from '@ds/core';
import { MODULOS, cargarPartida, nuevaPartida } from '@ds/game';
import type { AtletismoState } from '@ds/mod-atletismo';
import type { NpcsState } from '@ds/mod-npcs';

/** Pruebas de los NEXOS: módulos que colaboran sin conocerse. */

describe('integración de módulos', () => {
  it('todos los módulos se registran juntos sin conflictos', () => {
    const g = nuevaPartida({ seed: 11 });
    expect(g.registry.moduleIds.size).toBe(MODULOS.length);
    expect(checkInvariants(g)).toEqual([]);
  });

  it('el entrenador (NPCs) potencia el atletismo vía etiquetas', () => {
    const g = nuevaPartida({ seed: 11 });
    advanceTo(g, 'gen.descansar', 0, 16);
    const sin = g.preview('atletismo.tecnica')!.efficiency;
    // Forzamos una buena relación a través de un guardado (como haría una partida avanzada).
    const s = g.serialize();
    const ns = s.modules.npcs as NpcsState;
    ns.npcs = ns.npcs.map((n) => (n.id === 'entrenador' ? { ...n, affinity: 90 } : n));
    const g2 = cargarPartida(s);
    const con = g2.preview('atletismo.tecnica')!;
    expect(con.efficiency).toBeGreaterThan(sin);
    expect(con.modifiers.some((m) => m.id === 'npcs.apoyo')).toBe(true);
  });

  it('las carreras usan a los rivales NPC y el entrenador reacciona', () => {
    const g = nuevaPartida({ seed: 11 });
    advanceToWeek(g, 'gen.descansar', 5, 5, 10);
    const antes = g.service<NpcDirectory>(SERVICES.npcs)!.get('entrenador')!.affinity;
    const r = g.perform('atletismo.carrera');
    expect(r.ok).toBe(true);
    const entrada = r.log.find((l) => /de 8/.test(l.text)); // tú + 7 rivales de los 16 NPC
    expect(entrada).toBeDefined();
    // La carrera deja una clasificación con nombres, posiciones y tiempos.
    expect(entrada!.table?.rows).toHaveLength(8);
    expect(entrada!.table?.header).toEqual(['Pos.', 'Corredor', 'Club', 'Tiempo', 'Dif.']);
    const mia = entrada!.table!.rows[entrada!.table!.highlight!];
    expect(mia[1]).toBe('Tú');
    expect(g.service<NpcDirectory>(SERVICES.npcs)!.get('entrenador')!.affinity).toBeGreaterThan(antes);
  });

  it('una semana jugando al azar no rompe ninguna invariante', () => {
    const g = nuevaPartida({ seed: 2 });
    const rng = seededRng(2);
    while (g.time.day < 14) {
      const opts = g.availableActions();
      g.perform(rng.pick(opts).id);
      expect(checkInvariants(g)).toEqual([]);
    }
    expect(g.stat(GEN.energia)).toBeGreaterThanOrEqual(0);
  });

  it('las series son de 8: los mejores rivales corren al principio y luego la serie rota', () => {
    const g = nuevaPartida({ seed: 4 });
    // El servicio es una foto del momento: se pide de nuevo cada vez. Corren los de la categoría del jugador.
    const mejores = () => {
      const edad = g.service<IdentityService>(SERVICES.identidad)!.view().age;
      const cat = categoriaDeEdad(CATEGORIAS_ESPANA, edad);
      return g
        .service<NpcDirectory>(SERVICES.npcs)!
        .list({ tag: 'atleta', minAge: cat.edadMin, maxAge: cat.edadMax })
        .sort((a, b) => (b.levels.atletismo ?? 0) - (a.levels.atletismo ?? 0))
        .slice(0, 3)
        .map((n) => n.name);
    };
    const vistos = new Set<string>();
    let seriesIguales = 0;
    let anterior = '';
    let carreras = 0;
    // Las carreras solo son en temporada: se recorren las semanas y se corre en las que hay carrera.
    for (let semana = 0; semana < 200 && carreras < 30; semana++) {
      advanceToWeek(g, 'gen.descansar', semana, 5, 10);
      if (!g.preview('atletismo.carrera')!.available) continue;
      const top = mejores();
      const r = g.perform('atletismo.carrera');
      expect(r.ok).toBe(true);
      const nombres = r.log.find((l) => l.table)!.table!.rows.map((f) => f[1]);
      expect(nombres).toHaveLength(8);
      if (carreras < 8) for (const m of top) expect(nombres).toContain(m);
      const rivales = nombres.filter((n) => n !== 'Tú').sort();
      for (const n of rivales) vistos.add(n);
      if (rivales.join() === anterior) seriesIguales++;
      anterior = rivales.join();
      carreras++;
    }
    expect(carreras).toBe(30);
    expect(vistos.size).toBeGreaterThan(12); // la rotación recorre casi todo el pelotón
    expect(seriesIguales).toBeLessThan(3);
  });

  describe('categorías por edad', () => {
    it('la categoría sale de la edad (federación española)', () => {
      const nombre = (edad: number) => categoriaDeEdad(CATEGORIAS_ESPANA, edad).nombre;
      expect(nombre(8)).toBe('Sub-10');
      expect(nombre(9)).toBe('Sub-10');
      expect(nombre(10)).toBe('Sub-12');
      expect(nombre(15)).toBe('Sub-16');
      expect(nombre(17)).toBe('Sub-18');
      expect(nombre(19)).toBe('Sub-20');
      expect(nombre(30)).toBe('Absoluta');
    });

    it('en la carrera solo corren rivales de la categoría del jugador', () => {
      const g = nuevaPartida({ seed: 21 });
      advanceToWeek(g, 'gen.descansar', 5, 5, 10);
      const r = g.perform('atletismo.carrera');
      expect(r.ok).toBe(true);
      const entrada = r.log.find((l) => l.table)!;
      expect(entrada.text).toMatch(/Sub-10/);
      const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
      for (const fila of entrada.table!.rows) {
        if (fila[1] === 'Tú') continue;
        const rival = dir.list({ tag: 'atleta' }).find((n) => n.name === fila[1])!;
        expect(rival.age).toBeLessThanOrEqual(9);
      }
    });

    /** Partida con el jugador muy por encima de su categoría y cinco victorias seguidas. */
    const destacado = () => {
      const g = nuevaPartida({ seed: 21 });
      const guardado = g.serialize();
      for (const id of Object.keys(guardado.stats)) {
        if (/^(gen\.(velocidad|resistencia)|atletismo\.(tecnica|ritmo|salida))$/.test(id)) guardado.stats[id] = 90;
      }
      const at = guardado.modules.atletismo as AtletismoState;
      at.carreras = Array.from({ length: 5 }, (_, i) => ({ week: 4 + i, position: 1, total: 8, mark: 50, categoria: 'sub10', superior: false }));
      return cargarPartida(guardado);
    };

    it('quien destaca mucho puede subir de categoría y compite contra mayores', () => {
      const g = destacado();
      advanceToWeek(g, 'gen.descansar', 5, 5, 10);
      expect(g.preview('atletismo.subir_categoria')!.available).toBe(true);
      expect(g.perform('atletismo.subir_categoria').ok).toBe(true);
      expect(g.preview('atletismo.subir_categoria')!.available).toBe(false);
      expect(g.preview('atletismo.volver_categoria')!.available).toBe(true);
      const r = g.perform('atletismo.carrera');
      const entrada = r.log.find((l) => l.table)!;
      expect(entrada.text).toMatch(/Sub-12/);
      const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
      for (const fila of entrada.table!.rows) {
        if (fila[1] === 'Tú') continue;
        const rival = dir.list({ tag: 'atleta' }).find((n) => n.name === fila[1])!;
        expect(rival.age).toBeGreaterThanOrEqual(10);
        expect(rival.age).toBeLessThanOrEqual(11);
      }
      g.perform('gen.descansar');
    });

    it('no se puede subir sin destacar ni sin ser competitivo arriba', () => {
      const g = nuevaPartida({ seed: 21 });
      advanceToWeek(g, 'gen.descansar', 5, 5, 10);
      expect(g.preview('atletismo.subir_categoria')!.available).toBe(false);
      expect(g.preview('atletismo.subir_categoria')!.reason).toMatch(/competido lo suficiente/);
      // Gana su categoría pero sin nivel para competir arriba: tampoco.
      const guardado = g.serialize();
      const at = guardado.modules.atletismo as AtletismoState;
      at.carreras = Array.from({ length: 5 }, (_, i) => ({ week: 4 + i, position: 1, total: 8, mark: 50, categoria: 'sub10', superior: false }));
      const g2 = cargarPartida(guardado);
      expect(g2.preview('atletismo.subir_categoria')!.available).toBe(false);
      expect(g2.preview('atletismo.subir_categoria')!.reason).toMatch(/competitivo/);
    });
  });

  describe('clubes', () => {
    const club = (g: Game) => g.service<ClubDirectory>(SERVICES.clubes)!.membership('atletismo');

    it('empieza sin club y puede apuntarse al del colegio los días de clase por la tarde', () => {
      const g = nuevaPartida({ seed: 31 });
      expect(club(g)).toBeUndefined();
      advanceToWeek(g, 'gen.descansar', 1, 2, 9);
      expect(g.preview('atletismo.apuntarse_colegio')!.available).toBe(false); // de 14 a 19
      advanceToWeek(g, 'gen.descansar', 1, 2, 14);
      expect(g.perform('atletismo.apuntarse_colegio').ok).toBe(true);
      expect(club(g)?.id).toBe('colegio');
      expect(g.preview('atletismo.apuntarse_colegio')!.available).toBe(false);
      expect(g.log.some((l) => /Te apuntas al club deportivo del colegio/.test(l.text))).toBe(true);
    });

    it('sin club solo hay entrenamiento por tu cuenta, que rinde menos que una sesión del club', () => {
      const g = nuevaPartida({ seed: 31 });
      advanceToWeek(g, 'gen.descansar', 1, 0, 15);
      expect(g.preview('atletismo.club_sesion')!.available).toBe(false);
      const solo = g.preview('atletismo.tecnica')!;
      expect(solo.modifiers.some((m) => m.id === 'atletismo.por_tu_cuenta')).toBe(true);
      g.perform('atletismo.apuntarse_colegio');
      advanceToWeek(g, 'gen.descansar', 2, 0, 15); // lunes: sesión del colegio de 15 a 17
      const sesion = g.preview('atletismo.club_sesion')!;
      expect(sesion.available).toBe(true);
      expect(sesion.modifiers.some((m) => m.id === 'atletismo.por_tu_cuenta')).toBe(false);
      const antes = g.stat('atletismo.conocimiento');
      expect(g.perform('atletismo.club_sesion').ok).toBe(true);
      expect(g.stat('atletismo.conocimiento')).toBeGreaterThan(antes);
      expect(g.preview('atletismo.club_sesion')!.available).toBe(false); // una al día
    });

    it('las sesiones del club solo son los días y horas del club', () => {
      const g = nuevaPartida({ seed: 31 });
      advanceToWeek(g, 'gen.descansar', 1, 2, 14);
      g.perform('atletismo.apuntarse_colegio');
      advanceToWeek(g, 'gen.descansar', 2, 1, 15); // martes: el colegio entrena lunes y miércoles
      expect(g.preview('atletismo.club_sesion')!.available).toBe(false);
      advanceToWeek(g, 'gen.descansar', 2, 2, 12);
      expect(g.preview('atletismo.club_sesion')!.available).toBe(false); // antes de la hora
    });

    it('un club de fuera pide edad y nivel, y se puede repetir la prueba pasadas unas semanas', () => {
      const g = nuevaPartida({ seed: 31 });
      advanceToWeek(g, 'gen.descansar', 1, 2, 17);
      const prueba = g.preview('atletismo.prueba.club_ciudad')!;
      expect(prueba.available).toBe(false);
      expect(prueba.reason).toMatch(/10 años/);
    });

    /** Partida con 12 años y el nivel pedido en las habilidades. */
    const con12 = (nivel: number) => {
      const g = nuevaPartida({ seed: 31 });
      const guardado = g.serialize();
      (guardado.modules.gen as { edadInicial: number }).edadInicial = 12;
      for (const id of Object.keys(guardado.stats)) {
        if (/^(gen\.(velocidad|resistencia)|atletismo\.(tecnica|ritmo|salida))$/.test(id)) guardado.stats[id] = nivel;
      }
      return cargarPartida(guardado);
    };

    it('con nivel suficiente la prueba te abre las puertas de un club de mayor calidad', () => {
      const g = con12(95);
      advanceToWeek(g, 'gen.descansar', 1, 2, 17);
      expect(g.perform('atletismo.prueba.club_ciudad').ok).toBe(true);
      expect(club(g)?.id).toBe('club_ciudad');
      expect(g.log.some((l) => /Ya eres del Club Atletismo Ciudad/.test(l.text))).toBe(true);
      advanceToWeek(g, 'gen.descansar', 2, 1, 18); // martes de club de la ciudad
      const sesion = g.preview('atletismo.club_sesion')!;
      expect(sesion.available).toBe(true);
      expect(sesion.modifiers.some((m) => m.id === 'clubes.calidad')).toBe(true);
    });

    it('sin nivel suficiente no te cogen y no puedes repetirla enseguida', () => {
      const g = con12(20);
      advanceToWeek(g, 'gen.descansar', 1, 2, 17);
      g.perform('atletismo.prueba.club_ciudad');
      expect(club(g)).toBeUndefined();
      expect(g.log.some((l) => /todavía no tienes el nivel/.test(l.text))).toBe(true);
      expect(g.preview('atletismo.prueba.club_ciudad')!.available).toBe(false);
      expect(g.preview('atletismo.prueba.club_ciudad')!.reason).toMatch(/espera/);
    });

    it('la clasificación muestra el club de cada corredor y el tuyo', () => {
      const g = nuevaPartida({ seed: 31 });
      advanceToWeek(g, 'gen.descansar', 4, 2, 14);
      g.perform('atletismo.apuntarse_colegio');
      advanceToWeek(g, 'gen.descansar', 4, 5, 10);
      const r = g.perform('atletismo.carrera');
      const tabla = r.log.find((l) => l.table)!.table!;
      const mia = tabla.rows[tabla.highlight!];
      expect(mia[2]).toBe('Club deportivo del colegio');
      const otros = tabla.rows.filter((_, i) => i !== tabla.highlight);
      expect(otros.every((f) => f[2] !== '—')).toBe(true);
    });

    it('se puede dejar el club', () => {
      const g = nuevaPartida({ seed: 31 });
      advanceToWeek(g, 'gen.descansar', 1, 2, 14);
      g.perform('atletismo.apuntarse_colegio');
      expect(g.perform('atletismo.dejar_club').ok).toBe(true);
      expect(club(g)).toBeUndefined();
    });
  });

  it('una partida guardada antes de las categorías, el currículo y los clubes se carga y sigue funcionando', () => {
    const s = nuevaPartida({ seed: 5, playerName: 'Vieja' }).serialize();
    delete (s.modules as Record<string, unknown>).clubes;
    for (const k of ['gen.madurez', 'estudios.biologia', 'estudios.naturales', 'estudios.ingles', 'estudios.latin']) {
      delete s.stats[k];
      delete s.peaks[k];
      delete s.baseline[k];
      delete s.talent[k];
      delete s.lastTrained[k];
    }
    // Rivales del formato antiguo: sin edad ni club.
    const npcs = s.modules.npcs as NpcsState;
    npcs.npcs = npcs.npcs
      .filter((n) => n.role !== 'rival')
      .concat(
        Array.from({ length: 16 }, (_, i) => ({
          id: `rival_${i + 1}`, name: `Rival ${i}`, role: 'rival' as const, gender: 'm' as const, tags: ['atleta'], supports: [],
          affinity: 20, levels: { atletismo: 40 }, potential: { atletismo: 80 }, lastDay: -1,
        })),
      );
    const g = cargarPartida(s);
    advanceToWeek(g, 'gen.descansar', 6, 5, 10);
    expect(g.perform('atletismo.carrera').ok).toBe(true); // sin rivales con edad, la serie se completa con corredores genéricos
    advanceToWeek(g, 'gen.descansar', 14, 4, 20);
    expect(checkInvariants(g)).toEqual([]);
  });
});
