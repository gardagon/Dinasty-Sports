import { describe, expect, it } from 'vitest';
import { GEN, GENTE_CERCANA, SERVICES, type PresenciaService, categoriaDeEdad, type ClubDirectory, type IdentityService, type NpcDirectory, type RelationsService, type StudiesService } from '@ds/contracts';
import { CATEGORIAS_ESPANA } from '@ds/mod-atletismo';
import { advanceTo, advanceToWeek, advanceUntil, checkInvariants, seededRng, type Game } from '@ds/core';
import { MODULOS, cargarPartida, nuevaPartida } from '@ds/game';
import type { AtletismoState } from '@ds/mod-atletismo';
import type { EstudiosState } from '@ds/mod-estudios';
import { hacer, posible } from './ayudas';
import { asignaturasDelCurso } from '../modules/estudios/src/curriculo';
import type { NpcsState } from '@ds/mod-npcs';
import type { RelacionesState } from '@ds/mod-relaciones';

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
    (s.modules.relaciones as RelacionesState).vinculos.entrenador = {
      npcId: 'entrenador', afinidad: 90, confianza: 70, estado: 'mejor_amigo', desde: 0, ultimoContacto: 16, contactos: [16],
    };
    const g2 = cargarPartida(s);
    const con = g2.preview('atletismo.tecnica')!;
    expect(con.efficiency).toBeGreaterThan(sin);
    expect(con.modifiers.some((m) => m.id === 'relaciones.apoyo')).toBe(true);
  });

  it('las carreras usan a los rivales NPC y el entrenador reacciona', () => {
    const g = nuevaPartida({ seed: 11 });
    advanceToWeek(g, 'gen.descansar', 5, 5, 10);
    const antes = g.service<RelationsService>(SERVICES.relaciones)!.get('entrenador')!.afinidad;
    const r = hacer(g, 'atletismo.carrera');
    expect(r.ok).toBe(true);
    const entrada = r.log.find((l) => /de 8/.test(l.text)); // tú + 7 rivales de los 16 NPC
    expect(entrada).toBeDefined();
    // La carrera deja una clasificación con nombres, posiciones y tiempos.
    expect(entrada!.table?.rows).toHaveLength(8);
    expect(entrada!.table?.header).toEqual(['Pos.', 'Corredor', 'Club', 'Tiempo', 'Dif.']);
    const mia = entrada!.table!.rows[entrada!.table!.highlight!];
    expect(mia[1]).toBe('Tú');
    expect(g.service<RelationsService>(SERVICES.relaciones)!.get('entrenador')!.afinidad).toBeGreaterThan(antes);
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
      if (!posible(g, 'atletismo.carrera')) continue;
      const top = mejores();
      const r = hacer(g, 'atletismo.carrera');
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
      const r = hacer(g, 'atletismo.carrera');
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
        if (/^(gen\.(velocidad|resistencia)|atletismo\.(tecnica|ritmo|salida))$/.test(id)) {
          guardado.stats[id] = 90;
          guardado.peaks[id] = 90;
        }
      }
      const at = guardado.modules.atletismo as AtletismoState;
      at.carreras = Array.from({ length: 5 }, (_, i) => ({ week: 4 + i, position: 1, total: 8, mark: 50, categoria: 'sub10', superior: false }));
      return cargarPartida(guardado);
    };

    it('quien destaca mucho puede subir de categoría y compite contra mayores', () => {
      const g = destacado();
      advanceToWeek(g, 'gen.descansar', 5, 5, 10);
      expect(posible(g, 'atletismo.subir_categoria')).toBe(true);
      expect(hacer(g, 'atletismo.subir_categoria').ok).toBe(true);
      expect(posible(g, 'atletismo.subir_categoria')).toBe(false);
      expect(posible(g, 'atletismo.volver_categoria')).toBe(true);
      const r = hacer(g, 'atletismo.carrera');
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
      expect(posible(g, 'atletismo.subir_categoria')).toBe(false);
      expect(g.preview('atletismo.subir_categoria')!.reason).toMatch(/competido lo suficiente/);
      // Gana su categoría pero sin nivel para competir arriba: tampoco.
      const guardado = g.serialize();
      const at = guardado.modules.atletismo as AtletismoState;
      at.carreras = Array.from({ length: 5 }, (_, i) => ({ week: 4 + i, position: 1, total: 8, mark: 50, categoria: 'sub10', superior: false }));
      const g2 = cargarPartida(guardado);
      expect(posible(g2, 'atletismo.subir_categoria')).toBe(false);
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
      expect(hacer(g, 'atletismo.apuntarse_colegio').ok).toBe(true);
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
      hacer(g, 'atletismo.apuntarse_colegio');
      advanceToWeek(g, 'gen.descansar', 2, 0, 15); // lunes: sesión del colegio de 15 a 17
      const sesion = g.preview('atletismo.club_sesion')!;
      expect(posible(g, 'atletismo.club_sesion')).toBe(true);
      expect(sesion.modifiers.some((m) => m.id === 'atletismo.por_tu_cuenta')).toBe(false);
      const antes = g.stat('atletismo.conocimiento');
      expect(hacer(g, 'atletismo.club_sesion').ok).toBe(true);
      expect(g.stat('atletismo.conocimiento')).toBeGreaterThan(antes);
      expect(g.preview('atletismo.club_sesion')!.available).toBe(false); // una al día
    });

    it('las sesiones del club solo son los días y horas del club', () => {
      const g = nuevaPartida({ seed: 31 });
      advanceToWeek(g, 'gen.descansar', 1, 2, 14);
      hacer(g, 'atletismo.apuntarse_colegio');
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
        if (/^(gen\.(velocidad|resistencia)|atletismo\.(tecnica|ritmo|salida))$/.test(id)) {
          guardado.stats[id] = nivel;
          guardado.peaks[id] = nivel;
        }
      }
      return cargarPartida(guardado);
    };

    it('con nivel suficiente la prueba te abre las puertas de un club de mayor calidad', () => {
      const g = con12(95);
      advanceToWeek(g, 'gen.descansar', 1, 2, 17);
      expect(hacer(g, 'atletismo.prueba.club_ciudad').ok).toBe(true);
      expect(club(g)?.id).toBe('club_ciudad');
      expect(g.log.some((l) => /Ya eres del Club Atletismo Ciudad/.test(l.text))).toBe(true);
      advanceToWeek(g, 'gen.descansar', 2, 1, 18); // martes de club de la ciudad
      const sesion = g.preview('atletismo.club_sesion')!;
      expect(posible(g, 'atletismo.club_sesion')).toBe(true);
      expect(sesion.modifiers.some((m) => m.id === 'clubes.calidad')).toBe(true);
    });

    it('sin nivel suficiente no te cogen y no puedes repetirla enseguida', () => {
      const g = con12(20);
      advanceToWeek(g, 'gen.descansar', 1, 2, 17);
      hacer(g, 'atletismo.prueba.club_ciudad');
      expect(club(g)).toBeUndefined();
      expect(g.log.some((l) => /todavía no tienes el nivel/.test(l.text))).toBe(true);
      expect(g.preview('atletismo.prueba.club_ciudad')!.available).toBe(false);
      expect(g.preview('atletismo.prueba.club_ciudad')!.reason).toMatch(/espera/);
    });

    it('la clasificación muestra el club de cada corredor y el tuyo', () => {
      const g = nuevaPartida({ seed: 31 });
      advanceToWeek(g, 'gen.descansar', 4, 2, 14);
      hacer(g, 'atletismo.apuntarse_colegio');
      advanceToWeek(g, 'gen.descansar', 4, 5, 10);
      const r = hacer(g, 'atletismo.carrera');
      const tabla = r.log.find((l) => l.table)!.table!;
      const mia = tabla.rows[tabla.highlight!];
      expect(mia[2]).toBe('Club deportivo del colegio');
      const otros = tabla.rows.filter((_, i) => i !== tabla.highlight);
      expect(otros.every((f) => f[2] !== '—')).toBe(true);
    });

    it('se puede dejar el club', () => {
      const g = nuevaPartida({ seed: 31 });
      advanceToWeek(g, 'gen.descansar', 1, 2, 14);
      hacer(g, 'atletismo.apuntarse_colegio');
      expect(hacer(g, 'atletismo.dejar_club').ok).toBe(true);
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
          levels: { atletismo: 40 }, potential: { atletismo: 80 },
        })),
      );
    const g = cargarPartida(s);
    advanceToWeek(g, 'gen.descansar', 6, 5, 10);
    expect(hacer(g, 'atletismo.carrera').ok).toBe(true); // sin rivales con edad, la serie se completa con corredores genéricos
    advanceToWeek(g, 'gen.descansar', 14, 4, 20);
    expect(checkInvariants(g)).toEqual([]);
  });

  describe('verano según las notas', () => {
    const verano = (g: Game) => g.service<StudiesService>(SERVICES.estudios)!.summerPath();

    /** Partida en el último viernes lectivo (semana 40) con unos controles de trimestre que dan la nota indicada. */
    const finDeCurso = (notaMedia: number) => {
      const g = nuevaPartida({ seed: 41 });
      const guardado = g.serialize();
      const e = guardado.modules.estudios as EstudiosState;
      // Las notas del curso: los dos trimestres anteriores y los controles del tercero.
      e.boletines = [
        { curso: 0, trimestre: 1, media: notaMedia },
        { curso: 0, trimestre: 2, media: notaMedia },
      ];
      e.examenes = Object.fromEntries(asignaturasDelCurso(0).flatMap((k) => ['parcial1', 'parcial2', 'global'].map((t) => [`${k}:${t}`, notaMedia])));
      guardado.minute = (40 * 7 + 4) * 1440 + 22 * 60; // viernes de la semana 40 a las 22:00
      return cargarPartida(guardado);
    };
    const pasarElViernes = (g: Game) => advanceToWeek(g, 'gen.descansar', 41, 0, 12);

    it('con notas flojas toca academia obligatoria en verano, y no se repite curso', () => {
      const g = finDeCurso(3);
      pasarElViernes(g);
      expect(verano(g)).toBe('academia');
      expect(g.log.some((l) => /academia obligatoria/.test(l.text))).toBe(true);
      expect(g.preview('atletismo.campamento')!.available).toBe(false);
      expect(g.preview('atletismo.amigos')!.available).toBe(false);
    });

    it('la academia exige sesiones de lunes a viernes por la mañana, una al día', () => {
      const g = finDeCurso(3);
      advanceToWeek(g, 'gen.descansar', 42, 1, 9);
      expect(g.preview('estudios.academia')!.available).toBe(false); // antes de las 10
      advanceToWeek(g, 'gen.descansar', 42, 1, 10);
      const flojas = g.stat('estudios.matematicas');
      expect(hacer(g, 'estudios.academia').ok).toBe(true);
      expect(g.preview('estudios.academia')!.available).toBe(false);
      advanceToWeek(g, 'gen.descansar', 42, 5, 10);
      expect(g.preview('estudios.academia')!.available).toBe(false); // sábado
      expect(flojas).toBeLessThanOrEqual(g.stat('estudios.matematicas') + 100);
      expect(g.moduleState<EstudiosState>('estudios').verano!.hechas).toBe(1);
    });

    it('faltar a la academia cuenta como falta; terminarla sin ir de más te libra del resto del verano', () => {
      const g = finDeCurso(3);
      const faltasAntes = g.moduleState<EstudiosState>('estudios').faltas;
      advanceToWeek(g, 'gen.descansar', 42, 1, 6); // un día entero sin ir
      expect(g.moduleState<EstudiosState>('estudios').faltas).toBeGreaterThan(faltasAntes);
      expect(g.log.some((l) => /faltado a la academia/.test(l.text))).toBe(true);
      // Va a todas las sesiones hasta sacar los aprobados.
      for (let dia = 0; g.moduleState<EstudiosState>('estudios').verano!.superada === false && dia < 80; dia++) {
        advanceUntil(g, 'gen.descansar', (t) => !t.isWeekend && t.hour === 10, 5000);
        if (posible(g, 'estudios.academia')) hacer(g, 'estudios.academia');
        else g.perform('gen.descansar');
      }
      expect(g.moduleState<EstudiosState>('estudios').verano!.superada).toBe(true);
      expect(g.log.some((l) => /sacado los aprobados/.test(l.text))).toBe(true);
      expect(g.preview('estudios.academia')!.available).toBe(false);
    });

    it('si se acaba el verano sin terminar la academia no se repite, pero se empieza el curso flojo', () => {
      const g = finDeCurso(3);
      advanceToWeek(g, 'gen.descansar', 52, 0, 12);
      expect(g.log.some((l) => /No has terminado la academia/.test(l.text))).toBe(true);
      expect(g.time.schoolYear).toBe(1); // pasa de curso igualmente
      expect(g.moduleState<EstudiosState>('estudios').verano).toBeUndefined();
    });

    it('con buenas notas se puede pedir un campamento del deporte, que rinde más que cualquier otro entrenamiento', () => {
      const g = finDeCurso(8.5);
      pasarElViernes(g);
      expect(verano(g)).toBe('campamento');
      advanceToWeek(g, 'gen.descansar', 43, 2, 9);
      const campamento = g.preview('atletismo.campamento')!;
      expect(posible(g, 'atletismo.campamento')).toBe(true);
      expect(campamento.modifiers.some((m) => m.id === 'atletismo.campamento')).toBe(true);
      const antes = g.stat('atletismo.tecnica');
      expect(hacer(g, 'atletismo.campamento').ok).toBe(true);
      expect(g.stat('atletismo.tecnica')).toBeGreaterThan(antes);
      expect(g.preview('estudios.academia')!.available).toBe(false);
    });

    it('con notas aceptables el verano es con los amigos, que se mejora menos', () => {
      const g = finDeCurso(6.2);
      pasarElViernes(g);
      expect(verano(g)).toBe('amigos');
      advanceToWeek(g, 'gen.descansar', 43, 2, 10);
      const antes = g.stat('atletismo.tecnica');
      expect(hacer(g, 'atletismo.amigos').ok).toBe(true);
      const conAmigos = g.stat('atletismo.tecnica') - antes;
      const g2 = finDeCurso(8.5);
      pasarElViernes(g2);
      advanceToWeek(g2, 'gen.descansar', 43, 2, 9);
      const antes2 = g2.stat('atletismo.tecnica');
      hacer(g2, 'atletismo.campamento');
      expect(g2.stat('atletismo.tecnica') - antes2).toBeGreaterThan(conAmigos * 2);
    });

    it('fuera del verano no hay camino de verano', () => {
      const g = nuevaPartida({ seed: 41 });
      expect(verano(g)).toBeNull();
    });
  });

  describe('clasificatoria autonómica y final del campeonato', () => {
    /** Partida con el nivel indicado en las habilidades de atletismo (95 = fuera de serie, 20 = principiante). */
    const conNivel = (nivel: number) => {
      const g = nuevaPartida({ seed: 51 });
      const guardado = g.serialize();
      for (const id of Object.keys(guardado.stats)) {
        if (/^(gen\.(velocidad|resistencia)|atletismo\.(tecnica|ritmo|salida))$/.test(id)) {
          guardado.stats[id] = nivel;
          guardado.peaks[id] = nivel;
        }
      }
      return cargarPartida(guardado);
    };
    const filas = (g: Game, id: string) => hacer(g, id).log.find((l) => l.table)!;

    it('en la semana de la clasificatoria no hay carrera semanal y sí clasificatoria, con 16 corredores', () => {
      const g = conNivel(60);
      advanceToWeek(g, 'gen.descansar', 24, 5, 10);
      expect(posible(g, 'atletismo.carrera')).toBe(false);
      expect(g.preview('atletismo.carrera')!.reason).toMatch(/clasificatoria/);
      expect(posible(g, 'atletismo.clasificatoria')).toBe(true);
      expect(posible(g, 'atletismo.final')).toBe(false);
      const entrada = filas(g, 'atletismo.clasificatoria');
      expect(entrada.table!.rows).toHaveLength(16);
      expect(entrada.text).toMatch(/clasificatoria autonómica/);
    });

    it('la clasificatoria y la final solo se pueden correr en su semana', () => {
      const g = conNivel(60);
      advanceToWeek(g, 'gen.descansar', 10, 5, 10);
      expect(posible(g, 'atletismo.clasificatoria')).toBe(false);
      expect(posible(g, 'atletismo.final')).toBe(false);
      expect(posible(g, 'atletismo.carrera')).toBe(true);
    });

    it('quien destaca se clasifica y corre la final de 8 con una medalla en juego', () => {
      const g = conNivel(97);
      advanceToWeek(g, 'gen.descansar', 24, 5, 10);
      const clasif = filas(g, 'atletismo.clasificatoria');
      expect(clasif.text).toMatch(/Te clasificas para la final/);
      advanceToWeek(g, 'gen.descansar', 38, 5, 10);
      expect(posible(g, 'atletismo.carrera')).toBe(false); // esa semana es la final
      expect(posible(g, 'atletismo.final')).toBe(true);
      const final = filas(g, 'atletismo.final');
      expect(final.table!.rows).toHaveLength(8);
      expect(final.text).toMatch(/final del campeonato de España/);
      expect(final.text).toMatch(/Medalla de (oro|plata|bronce)/);
      // Los finalistas son los mejores de la clasificatoria.
      const clasificados = new Set(clasif.table!.rows.slice(0, 8).map((f) => f[1]));
      const corredores = final.table!.rows.map((f) => f[1]).filter((n) => n !== 'Tú');
      expect(corredores.filter((n) => clasificados.has(n)).length).toBeGreaterThanOrEqual(6);
    });

    it('quien no se clasifica no corre la final, pero sí su carrera semanal', () => {
      const g = conNivel(8);
      advanceToWeek(g, 'gen.descansar', 24, 5, 10);
      const clasif = filas(g, 'atletismo.clasificatoria');
      expect(clasif.text).toMatch(/No te clasificas/);
      advanceToWeek(g, 'gen.descansar', 38, 5, 10);
      expect(posible(g, 'atletismo.final')).toBe(false);
      expect(g.preview('atletismo.final')!.reason).toMatch(/No te has clasificado/);
      expect(posible(g, 'atletismo.carrera')).toBe(true);
    });

    it('el campeonato del curso siguiente empieza de cero', () => {
      const g = conNivel(97);
      advanceToWeek(g, 'gen.descansar', 24, 5, 10);
      hacer(g, 'atletismo.clasificatoria');
      advanceToWeek(g, 'gen.descansar', 52 + 38, 5, 10);
      expect(posible(g, 'atletismo.final')).toBe(false); // no se ha clasificado en este curso
    });
  });

  describe('categoría por año de nacimiento', () => {
    /** Partida con el día de nacimiento del personaje fijado: `fraccion` es la parte del año ya pasada desde su último cumpleaños. */
    const conFraccion = (fraccion: number) => {
      const g = nuevaPartida({ seed: 61 });
      const guardado = g.serialize();
      (guardado.modules.gen as { fraccionInicial: number }).fraccionInicial = fraccion;
      return cargarPartida(guardado);
    };
    const vista = (g: Game) => g.service<IdentityService>(SERVICES.identidad)!.view();

    it('dos niños de la misma edad pueden tener categoría distinta según su año de nacimiento', () => {
      const reciente = conFraccion(0.1); // cumplió hace poco: nació en el año natural más reciente
      const antiguo = conFraccion(0.9); // cumplió hace casi un año: nació en el año natural anterior
      expect(vista(reciente).age).toBe(8);
      expect(vista(antiguo).age).toBe(8);
      expect(vista(antiguo).seasonAge).toBe(vista(reciente).seasonAge + 1);
    });

    it('la edad de competición no cambia durante el curso aunque el personaje cumpla años', () => {
      const g = conFraccion(0.5);
      const inicial = vista(g).seasonAge;
      advanceToWeek(g, 'gen.descansar', 30, 2, 12); // ya ha cumplido años
      expect(vista(g).age).toBe(9);
      expect(vista(g).seasonAge).toBe(inicial);
    });

    it('el rival y el jugador de la misma cohorte comparten categoría', () => {
      const g = nuevaPartida({ seed: 61 });
      const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
      const edades = dir.list({ tag: 'atleta' }).map((n) => n.age!);
      expect(Math.min(...edades)).toBe(8);
      expect(Math.max(...edades)).toBe(19);
      // La edad de competición de los rivales es constante durante todo el curso.
      const antes = new Map(dir.list({ tag: 'atleta' }).map((n) => [n.id, n.age]));
      advanceToWeek(g, 'gen.descansar', 40, 2, 12);
      for (const n of g.service<NpcDirectory>(SERVICES.npcs)!.list({ tag: 'atleta' })) expect(n.age).toBe(antes.get(n.id));
    });
  });

  describe('preguntar el nombre', () => {
    const presentaciones = (g: Game) => g.listActions().filter((o) => o.id.startsWith('relaciones.presentarse.'));

    it('a quien no conoces y tienes cerca le puedes preguntar el nombre (2 minutos), y entonces lo conoces', () => {
      const g = nuevaPartida({ seed: 21 });
      advanceTo(g, 'gen.descansar', 0, 10);
      g.perform('lugares.ir_colegio');
      const posibles = presentaciones(g);
      expect(posibles.length).toBeGreaterThan(10);
      expect(posibles.length).toBeLessThanOrEqual(40); // solo los que tienes cerca
      const o = posibles.find((x) => x.available)!;
      const id = o.id.replace('relaciones.presentarse.', '');
      // Los servicios son una foto del momento: se piden de nuevo después de cada acción.
      const dir = () => g.service<NpcDirectory>(SERVICES.npcs)!;
      expect(dir().get(id)!.known).toBe(false);
      const antes = g.time.minute;
      const r = g.perform(o.id);
      expect(r.ok).toBe(true);
      expect(g.time.minute - antes).toBe(2);
      expect(dir().get(id)!.known).toBe(true);
      expect(g.log.some((l) => l.text.startsWith(`Se llama ${dir().get(id)!.name}`))).toBe(true);
      // Ya no se le puede preguntar otra vez, y ahora tiene acciones de relación.
      expect(g.preview(o.id)).toBeUndefined();
      expect(g.listActions().some((a) => a.id.startsWith('relaciones.') && a.id.endsWith(`.${id}`) && !a.id.startsWith('relaciones.presentarse.'))).toBe(true);
    });

    it('no se puede preguntar el nombre a quien no está donde tú: lejos no hay a quién', () => {
      const g = nuevaPartida({ seed: 21 });
      advanceTo(g, 'gen.descansar', 2, 3); // madrugada: no hay nadie en ningún sitio
      expect(presentaciones(g)).toEqual([]);
    });

    it('los bots no se paran a preguntar nombres y la gente cerca no pasa de 40', () => {
      const g = nuevaPartida({ seed: 22 });
      advanceTo(g, 'gen.descansar', 0, 10);
      g.perform('lugares.ir_colegio');
      expect(presentaciones(g).length).toBeLessThanOrEqual(GENTE_CERCANA);
    });
  });

  describe('hablar con la gente: presencia, habilidad y disposición', () => {
    const colegioEnElRecreo = (semilla = 31) => {
      const g = nuevaPartida({ seed: semilla });
      g.perform('lugares.ir_colegio');
      advanceTo(g, 'gen.descansar', 0, 10);
      advanceUntil(g, 'gen.descansar', (t) => t.minuteOfDay >= 10 * 60 + 40 || t.hour >= 11, 20);
      return g;
    };

    it('en el recreo se puede charlar con un compañero que está en el colegio, y en clase no', () => {
      const g = nuevaPartida({ seed: 31 });
      g.perform('lugares.ir_colegio');
      advanceTo(g, 'gen.descansar', 0, 9); // 9:xx: en clase
      expect(g.preview('relaciones.charlar.companero_social')!.reason).toMatch(/fuera de clase \(o en el recreo\)/);
      advanceUntil(g, 'gen.descansar', (t) => t.minuteOfDay >= 10 * 60 + 40, 20);
      expect(g.time.minuteOfDay).toBeLessThan(11 * 60 + 20); // hay recreo
      const o = g.preview('relaciones.charlar.companero_social')!;
      expect(o.available).toBe(true);
      expect(g.perform(o.id).ok).toBe(true);
      expect(g.service<RelationsService>(SERVICES.relaciones)!.get('companero_social')!.afinidad).toBeGreaterThan(0);
    });

    it('si la persona no está donde tú estás no se puede hablar con ella, y no te dice dónde está', () => {
      const g = nuevaPartida({ seed: 31 });
      const presencia = () => g.service<PresenciaService>(SERVICES.presencia)!;
      // Sábado a mediodía, en casa: el compañero no está en casa (casa solo es de la familia).
      advanceTo(g, 'gen.descansar', 5, 11);
      expect(presencia().donde('companero_social')).not.toBe('casa');
      const o = g.preview('relaciones.charlar.companero_social')!;
      expect(o.available).toBe(false);
      expect(o.reason).toMatch(/no está aquí/);
      expect(o.lugar).toBeUndefined(); // no se ofrece ir a buscarla: no sabes dónde está
      expect(posible(g, o.id)).toBe(false);
      // Para hablar con ella hay que coincidir: en una semana cualquiera se encuentra donde él esté, sin que el juego lo diga.
      let habladas = 0;
      for (let semana = 1; semana < 25 && habladas === 0; semana++) {
        advanceToWeek(g, 'gen.descansar', semana, 5, 11);
        const donde = presencia().donde('companero_social');
        if (!donde) continue;
        g.perform(`lugares.ir_${donde}`); // el jugador va a mirar a un sitio y se lo encuentra
        if (g.preview('relaciones.charlar.companero_social')!.available) habladas++;
      }
      expect(habladas).toBe(1);
    });

    it('las conversaciones llevan dos motivos nuevos: tu habilidad y cómo es la otra persona', () => {
      const g = colegioEnElRecreo();
      const ids = g.preview('relaciones.charlar.companero_social')!.modifiers.map((m) => m.id);
      expect(ids).toContain('relaciones.compatibilidad');
      // Con un carácter o unas habilidades corrientes alguno de los dos puede no aparecer; con extremos, sí.
      const guardado = g.serialize();
      guardado.stats[GEN.comunicacion] = 100;
      guardado.stats[GEN.carisma] = 100;
      const bueno = cargarPartida(guardado);
      expect(bueno.preview('relaciones.charlar.companero_social')!.modifiers.map((m) => m.id)).toContain('relaciones.habilidad');
      const mala = structuredClone(guardado);
      mala.stats[GEN.comunicacion] = 1;
      mala.stats[GEN.carisma] = 1;
      expect(cargarPartida(mala).preview('relaciones.charlar.companero_social')!.modifiers.find((m) => m.id === 'relaciones.habilidad')!.result.reason).toMatch(/Te falta soltura/);
    });

    it('con más comunicación y carisma la misma charla sube más la afinidad', () => {
      const g = colegioEnElRecreo();
      const base = g.serialize();
      const con = (valor: number) => {
        const s = structuredClone(base);
        s.stats[GEN.comunicacion] = valor;
        s.stats[GEN.carisma] = valor;
        const x = cargarPartida(s);
        x.perform('relaciones.charlar.companero_social');
        return x.service<RelationsService>(SERVICES.relaciones)!.get('companero_social')!.afinidad;
      };
      expect(con(90)).toBeGreaterThan(con(10) * 1.3);
    });

    it('la disposición de la otra persona cambia lo que rinde: una persona sociable rinde más que una solitaria', () => {
      const g = colegioEnElRecreo();
      const base = g.serialize();
      const con = (sociabilidad: number) => {
        const s = structuredClone(base);
        const n = (s.modules.npcs as { npcs: { id: string; rasgos: { caracter: Record<string, number> } }[] }).npcs.find((x) => x.id === 'companero_social')!;
        n.rasgos.caracter.sociabilidad = sociabilidad;
        return cargarPartida(s).preview('relaciones.charlar.companero_social')!.efficiency;
      };
      expect(con(50)).toBeGreaterThan(con(-50) * 1.3);
    });
  });
});
