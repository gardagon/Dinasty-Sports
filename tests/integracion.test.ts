import { describe, expect, it } from 'vitest';
import { GEN, GENTE_CERCANA, SERVICES, claveDeDeporte, type DeporteService, type PresenciaService, categoriaDeEdad, type ClubDirectory, type FamilyService, type LugaresService, type IdentityService, type NpcDirectory, type RelationsService, type StudiesService } from '@ds/contracts';
import { CATEGORIAS_ESPANA } from '@ds/mod-atletismo';
import { advanceTo, advanceToWeek, advanceUntil, checkInvariants, seededRng, type Game } from '@ds/core';
import { MODULOS, cargarPartida, nuevaPartida } from '@ds/game';
import type { AtletismoState } from '@ds/mod-atletismo';
import type { EstudiosState } from '@ds/mod-estudios';
import { conocer, hacer, llegarA, posible, viajarA } from './ayudas';
import { faltaViajar as faltaViajarA } from '@ds/contracts';

const baseNueva = nuevaPartida;
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

  it('quien se te da bien en algo te ayuda cuando lo hacéis juntos, según lo bien que os conozcáis', () => {
    const g = conocer(nuevaPartida({ seed: 11 }));
    advanceTo(g, 'gen.descansar', 0, 16);
    const modulo = (gm: Game, id: string) => gm.preview(id)!.modifiers.find((m) => m.id === 'relaciones.compania');
    expect(modulo(g, 'relaciones.estudiar.companero_estudio')).toBeUndefined(); // sin conocerse apenas, no ayuda
    const s = g.serialize();
    (s.modules.relaciones as RelacionesState).vinculos.companero_estudio = {
      npcId: 'companero_estudio', afinidad: 60, confianza: 40, estado: 'amigo', desde: 0, ultimoContacto: -1, contactos: [],
    };
    const g2 = cargarPartida(s);
    expect(modulo(g2, 'relaciones.estudiar.companero_estudio')?.result.efficiency).toBeGreaterThan(1);
    // Lo que no se le da bien no ayuda: salir con el aplicado rinde menos que estudiar con él.
    const quedar = modulo(g2, 'relaciones.quedar.companero_estudio')?.result.efficiency ?? 1;
    expect(quedar).toBeLessThan((modulo(g2, 'relaciones.estudiar.companero_estudio')?.result.efficiency ?? 0));
  });

  it('las carreras usan a los rivales NPC y el entrenador reacciona', () => {
    const g = conocer(nuevaPartida({ seed: 11 }), 'entrenador');
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
  }, 20000); // en una máquina lenta (la integración continua) la semana entera de acciones tarda más de los 5 s por defecto

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
      advanceToWeek(g, 'gen.descansar', 5, 4, 10); // viernes: el colegio (sede del club) está abierto
      expect(posible(g, 'atletismo.subir_categoria')).toBe(true);
      expect(hacer(g, 'atletismo.subir_categoria').ok).toBe(true);
      expect(posible(g, 'atletismo.subir_categoria')).toBe(false);
      expect(posible(g, 'atletismo.volver_categoria')).toBe(true);
      advanceToWeek(g, 'gen.descansar', 5, 5, 10); // el sábado, a la carrera
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

    it('empieza sin club y se apunta al del colegio en la administración, que tiene horario (y se ve cerrada, no desaparece)', () => {
      const g = nuevaPartida({ seed: 31 });
      expect(club(g)).toBeUndefined();
      advanceToWeek(g, 'gen.descansar', 1, 2, 14); // la administración cierra de 13:30 a 15:00
      const cerrada = g.preview('atletismo.apuntarse_colegio')!;
      expect(cerrada.available).toBe(false);
      expect(cerrada.reason).toMatch(/cerrad.*9:00 a 13:30 y de 15:00 a 18:00/);
      expect(cerrada.description).toMatch(/lunes y miércoles de 15 a 17/); // se cuenta cuándo entrena y compite antes de apuntarse
      expect(cerrada.description).toMatch(/sábados de 9 a 13/);
      expect(cerrada.lugar).toEqual(['administracion']);
      advanceToWeek(g, 'gen.descansar', 1, 2, 15);
      expect(hacer(g, 'atletismo.apuntarse_colegio').ok).toBe(true);
      expect(g.service<LugaresService>(SERVICES.lugares)!.actual().id).toBe('administracion');
      expect(club(g)?.id).toBe('colegio');
      expect(g.preview('atletismo.apuntarse_colegio')).toBeUndefined();
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
      advanceToWeek(g, 'gen.descansar', 1, 2, 15);
      hacer(g, 'atletismo.apuntarse_colegio');
      advanceToWeek(g, 'gen.descansar', 2, 1, 15); // martes: el colegio entrena lunes y miércoles
      expect(g.preview('atletismo.club_sesion')!.available).toBe(false);
      advanceToWeek(g, 'gen.descansar', 2, 2, 12);
      expect(g.preview('atletismo.club_sesion')!.available).toBe(false); // antes de la hora
    });

    it('un club de fuera pide edad y nivel, y se puede repetir la prueba pasadas unas semanas', () => {
      const g = nuevaPartida({ seed: 31 });
      advanceToWeek(g, 'gen.descansar', 1, 1, 18);
      const prueba = g.preview('atletismo.prueba.club_ciudad')!;
      expect(prueba.available).toBe(false);
      expect(prueba.reason).toMatch(/10 años/);
      // Y fuera de sus entrenamientos no hay prueba aunque tengas la edad.
      const g12 = con12(95);
      advanceToWeek(g12, 'gen.descansar', 1, 2, 18);
      expect(g12.preview('atletismo.prueba.club_ciudad')!.reason).toMatch(/entrenamientos: martes y jueves de 18 a 20/);
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
      advanceToWeek(g, 'gen.descansar', 1, 1, 18); // martes: entrena el club de la ciudad (las pruebas son en sus entrenamientos)
      expect(hacer(g, 'atletismo.prueba.club_ciudad').ok).toBe(true);
      expect(g.service<LugaresService>(SERVICES.lugares)!.actual().id).toBe('sala_club_ciudad');
      expect(club(g)?.id).toBe('club_ciudad');
      expect(g.log.some((l) => /Ya eres del Club Atletismo Ciudad/.test(l.text))).toBe(true);
      advanceToWeek(g, 'gen.descansar', 2, 1, 18); // martes de club de la ciudad
      const sesion = g.preview('atletismo.club_sesion')!;
      expect(posible(g, 'atletismo.club_sesion')).toBe(true);
      expect(sesion.modifiers.some((m) => m.id === 'clubes.calidad')).toBe(true);
    });

    it('sin nivel suficiente no te cogen y no puedes repetirla enseguida', () => {
      const g = con12(20);
      advanceToWeek(g, 'gen.descansar', 1, 1, 18);
      hacer(g, 'atletismo.prueba.club_ciudad');
      expect(club(g)).toBeUndefined();
      expect(g.log.some((l) => /todavía no tienes el nivel/.test(l.text))).toBe(true);
      expect(g.preview('atletismo.prueba.club_ciudad')!.available).toBe(false);
      expect(g.preview('atletismo.prueba.club_ciudad')!.reason).toMatch(/espera/);
    });

    it('la clasificación muestra el club de cada corredor y el tuyo', () => {
      const g = nuevaPartida({ seed: 31 });
      advanceToWeek(g, 'gen.descansar', 4, 2, 15);
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
      advanceToWeek(g, 'gen.descansar', 1, 2, 15);
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
        else g.perform('gen.esperar');
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
      llegarA(g, 'patio', 10, 45); // el recreo
      const posibles = presentaciones(g);
      expect(posibles.length).toBeGreaterThan(10);
      expect(posibles.length).toBeLessThanOrEqual(46); // solo los que tienes cerca
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
      // Y puede hablar con ella o él enseguida (en el recreo se charla).
      expect(g.listActions().some((a) => a.available && a.id.startsWith('relaciones.') && a.id.endsWith(`.${id}`) && !a.id.startsWith('relaciones.presentarse.'))).toBe(true);
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
      expect(presentaciones(g).length).toBeLessThanOrEqual(Math.round(GENTE_CERCANA * 1.15)); // 40 más o menos un 15 %
    });
  });

  describe('hablar con la gente: presencia, habilidad y disposición', () => {
    // Aquí las cuatro personas del reparto ya se conocen (los tests de arriba parten de lo que se haya hablado).
    const nuevaPartida = (o: Parameters<typeof baseNueva>[0]) => conocer(baseNueva(o));
    const colegioEnElRecreo = (semilla = 31) => {
      const g = nuevaPartida({ seed: semilla });
      llegarA(g, 'patio', 10, 45);
      return g;
    };

    it('en el recreo se puede charlar con un compañero que está en el colegio, y en clase no', () => {
      const g = nuevaPartida({ seed: 31 });
      g.perform('lugares.ir_colegio');
      advanceTo(g, 'gen.descansar', 0, 9); // 9:xx: en clase
      expect(g.preview('relaciones.charlar.companero_social')!.reason).toMatch(/fuera de clase \(o en el recreo\)/);
      llegarA(g, 'patio', 10, 45); // el recreo es en el patio
      expect(g.time.minuteOfDay).toBeLessThan(11 * 60 + 10); // hay recreo
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

  describe('pestaña del deporte', () => {
    const vista = (g: Game) => g.service<DeporteService>(claveDeDeporte('atletismo'))!.view();
    /** Corre las carreras semanales de unas semanas del curso (los sábados a las 9; el viaje al estadio entra dentro de la ventana de 9 a 13). */
    const correr = (g: Game, desde: number, hasta: number) => {
      for (let semana = desde; semana <= hasta; semana++) {
        advanceToWeek(g, 'gen.descansar', semana, 5, 9);
        for (const id of ['atletismo.clasificatoria', 'atletismo.final', 'atletismo.carrera']) {
          if (posible(g, id)) {
            hacer(g, id);
            break;
          }
        }
      }
    };

    it('antes de competir no hay pruebas ni clasificaciones y dice cuándo es la primera carrera', () => {
      const v = vista(nuevaPartida({ seed: 41 }));
      expect(v).toMatchObject({ id: 'atletismo', nombre: 'Atletismo', disciplina: '400 m' });
      expect(v.temporada.pruebas).toEqual([]);
      expect(v.clasificaciones).toEqual([]);
      expect(v.temporada.proxima).toMatch(/Pretemporada: la primera carrera es la semana 5/);
      expect(v.resumen.find((r) => r.etiqueta === 'Mejor marca')!.valor).toBe('—');
      expect(v.habilidades).toEqual(['atletismo.tecnica', 'atletismo.ritmo', 'atletismo.salida', 'atletismo.conocimiento']); // solo las del deporte
    });

    it('tras una temporada enseña todas las carreras con su clasificación completa y las clasificaciones del año', () => {
      const g = nuevaPartida({ seed: 41 });
      correr(g, 5, 30);
      const v = vista(g);
      expect(v.temporada.pruebas.length).toBeGreaterThanOrEqual(15);
      for (const p of v.temporada.pruebas) {
        expect(p.tabla?.rows.length).toBeGreaterThanOrEqual(8);
        expect(p.tabla!.rows[p.tabla!.highlight!][1]).toBe('Tú');
        expect(p.tabla!.rows[p.posicion - 1][1]).toBe('Tú');
      }
      expect(v.temporada.pruebas.some((p) => /clasificatoria autonómica/.test(p.titulo))).toBe(true);
      // Una clasificación por puntos y otra de mejores marcas, con el personaje (en su sitio real) y como mucho 11 filas.
      expect(v.clasificaciones.map((c) => c.titulo)).toEqual([expect.stringMatching(/^Clasificación por puntos/), expect.stringMatching(/^Mejores marcas/)]);
      for (const c of v.clasificaciones) {
        expect(c.tabla.rows.length).toBeLessThanOrEqual(11);
        expect(c.tabla.rows.some((r) => r[1] === 'Tú')).toBe(true);
      }
      const puntos = v.clasificaciones[0].tabla.rows.map((r) => Number(r[3]));
      expect([...puntos.slice(0, 10)]).toEqual([...puntos.slice(0, 10)].sort((a, b) => b - a));
      expect(v.resumen.find((r) => r.etiqueta === 'Mejor marca')!.valor).toMatch(/s$/);
      expect(v.resumen.find((r) => r.etiqueta === 'Carreras este curso')!.valor).toBe(String(v.temporada.pruebas.length));
    });

    it('al empezar otro curso la temporada vuelve a cero y la anterior queda como resumen', () => {
      const g = nuevaPartida({ seed: 41 });
      correr(g, 5, 14);
      const hechas = vista(g).temporada.pruebas.length;
      expect(hechas).toBeGreaterThan(5);
      advanceToWeek(g, 'gen.descansar', 53, 0, 9);
      const v = vista(g);
      expect(v.temporada.etiqueta).toBe('Curso 2');
      expect(v.temporada.pruebas).toEqual([]);
      expect(v.temporadasAnteriores).toHaveLength(1);
      expect(v.temporadasAnteriores[0]).toMatchObject({ etiqueta: 'Curso 1', pruebas: hechas });
    });

    it('la partida guardada crece poco con las pruebas y se carga igual', () => {
      const g = nuevaPartida({ seed: 41 });
      const antes = JSON.stringify(g.serialize()).length;
      correr(g, 5, 30);
      const despues = g.serializarJSON().length;
      expect(despues - antes).toBeLessThan(80_000); // ~25 carreras con su clasificación y lo que cambia por jugar medio curso
      const otra = cargarPartida(JSON.parse(g.serializarJSON()).state, undefined, { copiar: false });
      expect(vista(otra).temporada.pruebas.length).toBe(vista(g).temporada.pruebas.length);
    });
  });
});

describe('clubes: la pestaña del deporte, el entrenador y cambiar de club', () => {
  const vista = (g: Game) => g.service<DeporteService>(claveDeDeporte('atletismo'))!.view();
  const club = (g: Game) => g.service<ClubDirectory>(SERVICES.clubes)!.membership('atletismo');

  it('sin club la pestaña del deporte está desactivada; al apuntarte se activa, conoces al entrenador y sale en el resumen', () => {
    const g = nuevaPartida({ seed: 31 });
    expect(vista(g).inactivo).toMatch(/club/);
    expect(g.service<NpcDirectory>(SERVICES.npcs)!.get('entrenador')!.known).toBe(false);
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    hacer(g, 'atletismo.apuntarse_colegio');
    const v = vista(g);
    expect(v.inactivo).toBeUndefined();
    expect(g.service<NpcDirectory>(SERVICES.npcs)!.get('entrenador')!.known).toBe(true);
    expect(v.resumen.find((r) => r.etiqueta === 'Entrenador')!.valor).not.toBe('—');
    hacer(g, 'atletismo.dejar_club');
    expect(vista(g).inactivo).toMatch(/club/);
  });

  it('pasar la prueba de otro club estando en uno ofrece plaza; aceptarla sin haber salido antes enfada al entrenador y al equipo y estresa', () => {
    const g = nuevaPartida({ seed: 31 });
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    hacer(g, 'atletismo.apuntarse_colegio');
    // Plaza ofrecida (se fuerza el guardado: la prueba depende de la forma del personaje).
    const s = g.serialize();
    (s.modules.atletismo as AtletismoState).ofertas = { club_ciudad: g.time.week };
    const g2 = cargarPartida(s);
    advanceTo(g2, 'gen.descansar', g2.time.weekday, 17); // la sala del club abre de 16 a 21
    const afinidadAntes = rel2(g2, 'entrenador');
    const estresAntes = g2.stat(GEN.estres);
    expect(hacer(g2, 'atletismo.aceptar_plaza.club_ciudad').ok).toBe(true);
    expect(club(g2)?.id).toBe('club_ciudad');
    expect(rel2(g2, 'entrenador')).toBeLessThan(afinidadAntes);
    expect(g2.stat(GEN.estres)).toBeGreaterThan(estresAntes);
    expect(g2.log.some((l) => /sin avisar/.test(l.text))).toBe(true);
  });

  it('dejar el club antes de aceptar la plaza no cuesta nada', () => {
    const g = nuevaPartida({ seed: 31 });
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    hacer(g, 'atletismo.apuntarse_colegio');
    const s = g.serialize();
    (s.modules.atletismo as AtletismoState).ofertas = { club_ciudad: g.time.week };
    const g2 = cargarPartida(s);
    advanceTo(g2, 'gen.descansar', g2.time.weekday, 17);
    const afinidadAntes = rel2(g2, 'entrenador');
    hacer(g2, 'atletismo.dejar_club');
    expect(hacer(g2, 'atletismo.aceptar_plaza.club_ciudad').ok).toBe(true);
    expect(rel2(g2, 'entrenador')).toBe(afinidadAntes);
    expect(g2.log.some((l) => /sin avisar/.test(l.text))).toBe(false);
  });

  it('no se puede aceptar una plaza que no se ha ganado', () => {
    const g = nuevaPartida({ seed: 31 });
    expect(g.preview('atletismo.aceptar_plaza.club_ciudad')!.available).toBe(false);
  });
});

const rel2 = (g: Game, id: string): number => g.service<RelationsService>(SERVICES.relaciones)!.get(id)?.afinidad ?? 0;

describe('familia en casa y planes con los demás', () => {
  const rel = (g: Game) => g.service<RelationsService>(SERVICES.relaciones)!;
  const aq = (g: Game, id: string) => rel(g).get(id)?.afinidad ?? 0;
  /** Una partida con el compañero aplicado conocido y con la afinidad y confianza indicadas. */
  const conAmigo = (afinidad: number, semilla = 31) => {
    const g = conocer(nuevaPartida({ seed: semilla }), 'companero_estudio');
    const s = g.serialize();
    (s.modules.relaciones as RelacionesState).vinculos.companero_estudio = {
      npcId: 'companero_estudio', afinidad, confianza: afinidad, estado: 'amigo', desde: 0, ultimoContacto: -1, contactos: [],
    };
    return cargarPartida(s);
  };
  /** Va al colegio en el recreo de un día de clase y propone el plan; devuelve si lo han aceptado. */
  const proponerEnElRecreo = (g: Game, cuando: 'hoy' | 'manana') => {
    advanceTo(g, 'gen.descansar', g.time.weekday, 10);
    llegarA(g, 'patio', 10, 45);
    const antes = rel(g).planes().length;
    expect(hacer(g, `relaciones.plan_${cuando}.companero_estudio`).ok).toBe(true);
    return rel(g).planes().length > antes;
  };

  it('el padre y la madre son personas con las que relacionarse: están en casa por la tarde-noche, sin plan de estudio', () => {
    const g = nuevaPartida({ seed: 31 });
    advanceTo(g, 'gen.descansar', 0, 19);
    g.perform('lugares.ir_casa');
    const aqui = g.service<PresenciaService>(SERVICES.presencia)!.en('casa').map((n) => n.id);
    expect(aqui).toContain('padre');
    expect(aqui).toContain('madre');
    expect(rel(g).get('padre')!.afinidad).toBeGreaterThan(10);
    expect(g.preview('relaciones.quedar.madre')!.available).toBe(true);
    expect(g.preview('relaciones.estudiar.madre')).toBeUndefined();
    expect(g.preview('relaciones.plan_hoy.padre')).toBeUndefined();
    // De día lectivo a media mañana no están (trabajan).
    advanceTo(g, 'gen.descansar', 1, 11);
    expect(g.service<PresenciaService>(SERVICES.presencia)!.en('casa').map((n) => n.id)).not.toContain('padre');
  });

  it('sin quedar antes no se puede estudiar con alguien; con una amistad alta acepta, y a la hora acordada en tu casa se estudia', () => {
    const g = conAmigo(100);
    expect(g.preview('relaciones.estudiar.companero_estudio')!.available).toBe(false);
    let aceptado = false;
    for (let i = 0; i < 20 && !aceptado; i++) {
      aceptado = proponerEnElRecreo(g, 'manana');
      if (!aceptado) advanceTo(g, 'gen.descansar', (g.time.weekday + 1) % 7, 7);
    }
    expect(aceptado).toBe(true);
    const plan = rel(g).planes()[0];
    expect(plan).toMatchObject({ npcId: 'companero_estudio', actividad: 'estudiar', lugar: 'casa', minuto: 17 * 60 });
    expect(g.log.some((l) => /acepta: estudiar mañana a las 17:00/.test(l.text))).toBe(true);
    // El día del plan, a las 17:00 en casa, se puede estudiar (y no a otra hora).
    advanceUntil(g, 'gen.descansar', (t) => t.day === plan.dia && t.hour === 12, 80);
    expect(posible(g, 'relaciones.estudiar.companero_estudio')).toBe(false);
    advanceUntil(g, 'gen.descansar', (t) => t.day === plan.dia && t.hour >= 16, 20);
    advanceUntil(g, 'gen.esperar', (t) => t.minuteOfDay >= 17 * 60); // a las 17:00 ya vale el plan; el viaje a casa (10 min) cabe en la cortesía
    expect(hacer(g, 'relaciones.estudiar.companero_estudio').ok).toBe(true);
    expect(rel(g).planes()).toEqual([]);
    expect(g.preview('relaciones.estudiar.companero_estudio')!.available).toBe(false);
  });

  it('quien se te da bien estudiando ayuda al estudiar juntos (compañía)', () => {
    const g = conAmigo(80);
    const s = g.serialize();
    (s.modules.relaciones as RelacionesState).planes = [{ npcId: 'companero_estudio', actividad: 'estudiar', dia: 0, minuto: 17 * 60, lugar: 'casa' }];
    const g2 = cargarPartida(s);
    advanceTo(g2, 'gen.descansar', 0, 17);
    g2.perform('lugares.ir_casa');
    expect(g2.preview('relaciones.estudiar.companero_estudio')!.modifiers.some((m) => m.id === 'relaciones.compania')).toBe(true);
  });

  it('entre un plan y otro hace falta un día de margen salvo con mucha amistad', () => {
    const base = conAmigo(30);
    const s = base.serialize();
    (s.modules.relaciones as RelacionesState).planes = [{ npcId: 'companero_estudio', actividad: 'estudiar', dia: 3, minuto: 17 * 60, lugar: 'casa', resuelto: true }];
    const g = cargarPartida(s);
    // El día 2 y el 4 caen pegados al plan del día 3: con afinidad 30 siempre dice que no por el margen (o por otra razón), nunca acepta.
    let aceptadosPegados = 0;
    for (const dia of [2, 4]) {
      const sg = g.serialize();
      sg.minute = (dia - 1) * 1440 + 11 * 60;
      const gd = cargarPartida(sg);
      viajarA(gd, 'patio');
      hacer(gd, 'relaciones.plan_manana.companero_estudio');
      aceptadosPegados += rel(gd).planes().filter((p) => p.dia === dia).length;
    }
    expect(aceptadosPegados).toBe(0);
  });

  it('plantar un plan cuesta afinidad y confianza', () => {
    const g = conAmigo(50);
    const s = g.serialize();
    (s.modules.relaciones as RelacionesState).planes = [{ npcId: 'companero_estudio', actividad: 'estudiar', dia: 0, minuto: 17 * 60, lugar: 'casa' }];
    const g2 = cargarPartida(s);
    const antes = aq(g2, 'companero_estudio');
    advanceTo(g2, 'gen.descansar', 1, 8); // pasa el día sin ir
    expect(aq(g2, 'companero_estudio')).toBeLessThan(antes);
    expect(g2.log.some((l) => /Dejaste plantado/.test(l.text))).toBe(true);
    expect(rel(g2).planes()).toEqual([]);
  });
});

describe('clase, profesores, apellidos y fichas', () => {
  it('el profesor de una asignatura se presenta al ir a su clase si no lo conoces', () => {
    const g = nuevaPartida({ seed: 31 });
    advanceTo(g, 'gen.descansar', 0, 7);
    const npcs = () => g.service<NpcDirectory>(SERVICES.npcs)!;
    const antes = npcs().list({ role: 'profesor', known: true }).length;
    for (let i = 0; i < 12 && g.time.minuteOfDay < 7 * 60 + 50; i++) g.perform(i % 2 === 0 ? 'lugares.ir_parque' : 'lugares.ir_casa');
    expect(hacer(g, 'estudios.clase_1').ok).toBe(true);
    expect(npcs().list({ role: 'profesor', known: true }).length).toBe(antes + 1);
    expect(g.log.some((l) => /se presenta al empezar la clase/.test(l.text))).toBe(true);
  });

  it('los padres tienen sus dos apellidos y los hijos el primero de cada uno', () => {
    for (const seed of [1, 2, 3, 4, 5, 31]) {
      const g = nuevaPartida({ seed });
      const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
      const padre = dir.get('padre')!.name.split(' ');
      const madre = dir.get('madre')!.name.split(' ');
      expect(padre).toHaveLength(3);
      expect(madre).toHaveLength(3);
      expect(new Set([...padre.slice(1), ...madre.slice(1)]).size).toBe(4);
      for (const h of dir.list({ tag: 'hermano' })) expect(h.name.split(' ').slice(1)).toEqual([padre[1], madre[1]]);
    }
  });
});

describe('los 10 minutos antes de clase: hablar con alguien al azar', () => {
  it('solo en esos 10 minutos y con gente delante; sube la relación según el rato y presenta a quien no conocías', () => {
    const g = nuevaPartida({ seed: 31 });
    llegarA(g, 'aula', 7, 52); // el aula se abre a las 7:50: dentro ya están tus compañeros
    expect(g.time.minuteOfDay).toBeLessThan(8 * 60);
    const o = g.preview('relaciones.al_azar')!;
    {
      expect(o.available).toBe(true);
      expect(o.duration).toBe(8 * 60 - g.time.minuteOfDay);
      const conocidos = g.service<NpcDirectory>(SERVICES.npcs)!.list({ known: true }).length;
      expect(g.perform('relaciones.al_azar').ok).toBe(true);
      expect(g.time.minuteOfDay).toBe(8 * 60); // se consume el tiempo hasta la clase
      expect(g.log.some((l) => /Mientras llega la clase hablas con/.test(l.text))).toBe(true);
      expect(g.service<NpcDirectory>(SERVICES.npcs)!.list({ known: true }).length).toBeGreaterThanOrEqual(conocidos);
    }
    // Fuera de la ventana no se puede.
    advanceTo(g, 'gen.descansar', 1, 12);
    expect(g.preview('relaciones.al_azar')!.available).toBe(false);
  });
});

describe('datos de las personas: edad, cumpleaños, altura, colegio y clase', () => {
  const dir = (g: Game) => g.service<NpcDirectory>(SERVICES.npcs)!;

  it('todas las personas tienen fecha de nacimiento y cumpleaños; los padres, la misma edad y altura que en su ficha', () => {
    const g = nuevaPartida({ seed: 31 });
    for (const n of dir(g).list()) {
      expect(n.nacimiento, n.id).toBeDefined();
      expect(n.cumple, n.id).toMatch(/^\d\d\/\d\d$/);
      expect(n.alturaCm, n.id).toBeGreaterThan(50);
    }
    const f = g.service<FamilyService>(SERVICES.familia)!.parents();
    for (const p of f) {
      const n = dir(g).get(p.id)!;
      expect(n.edadExacta).toBe(p.edad);
      expect(n.alturaCm).toBeCloseTo(p.alturaCm, 0);
    }
  });

  it('de la familia se sabe todo; del resto, solo el colegio de los compañeros y la clase de los de tu clase', () => {
    const g = nuevaPartida({ seed: 31 });
    expect(dir(g).get('madre')!.sabe).toEqual(expect.arrayContaining(['edad', 'colegio', 'clase']));
    const social = dir(g).get('companero_social')!;
    expect(social.sabe).toEqual(['colegio', 'clase']);
    expect(social.colegio).toBe('Colegio Cervantes');
    expect(social.clase).toBe('3.ºA de primaria (tu clase)'); // a los 8 años, 3.º de primaria: los compañeros, en la A
    const otra = dir(g).get('curso_1')!;
    expect(otra.sabe).toEqual(['colegio']);
    expect(otra.clase).toBe('3.ºB de primaria'); // la otra clase de tu curso
    // Los demás cursos se reparten entre la A y la B, cada uno con su número.
    const otros = dir(g).list({ role: 'companero' }).filter((n) => n.id.startsWith('alumno_'));
    expect(otros.every((n) => /^[1-6]\.º[AB] de (infantil|primaria|ESO|bachillerato)$/.test(n.clase ?? ''))).toBe(true);
    expect(new Set(otros.map((n) => n.clase?.match(/\.º([AB])/)?.[1]))).toEqual(new Set(['A', 'B']));
    const rival = dir(g).get('rival_1')!;
    expect(rival.sabe).toEqual([]);
    expect(rival.colegio === undefined || /^colegio\d$/.test(rival.colegio)).toBe(true);
    expect(rival.clase).toBeUndefined(); // la clase solo se enseña a los compañeros de colegio
    expect(dir(g).get('profesor_1')!.clase).toBeUndefined();
    // Los vecinos adultos no van al colegio.
    const adulto = dir(g).list({ role: 'vecino' }).find((n) => (n.age ?? 0) >= 18)!;
    expect(adulto.colegio).toBeUndefined();
  });

  it('se puede preguntar la edad (y el cumpleaños) y a qué colegio va un rival, y entonces se sabe', () => {
    const g = conocer(nuevaPartida({ seed: 31 }), 'companero_estudio');
    llegarA(g, 'patio', 10, 45); // el recreo
    const pregunta = g.listActions().find((a) => a.id === 'relaciones.preguntar_edad.companero_estudio');
    expect(pregunta).toBeDefined();
    expect(pregunta!.duration).toBe(2);
    expect(dir(g).get('companero_estudio')!.sabe).not.toContain('edad');
    expect(g.perform('relaciones.preguntar_edad.companero_estudio').ok).toBe(true);
    const n = dir(g).get('companero_estudio')!;
    expect(n.sabe).toContain('edad');
    expect(g.log.some((l) => l.text.includes(`tiene ${n.edadExacta} años y cumple el `))).toBe(true);
    expect(g.preview('relaciones.preguntar_edad.companero_estudio')?.available ?? false).toBe(false);
    // De un compañero ya sabes el colegio y, de uno de tu clase, la clase: no se pregunta.
    expect(g.preview('relaciones.preguntar_colegio.companero_estudio')).toBeUndefined();
    expect(g.preview('relaciones.preguntar_clase.companero_estudio')).toBeUndefined();
  });

  it('se puede preguntar qué le gusta a alguien: antes no se ve y después salen sus intereses, de más a menos', () => {
    const g = conocer(nuevaPartida({ seed: 31 }), 'companero_estudio');
    llegarA(g, 'patio', 10, 45); // el recreo
    expect(dir(g).get('companero_estudio')!.gustos).toBeUndefined();
    const pregunta = g.listActions().find((a) => a.id === 'relaciones.preguntar_gustos.companero_estudio');
    expect(pregunta).toBeDefined();
    expect(pregunta!.duration).toBe(2);
    expect(g.perform('relaciones.preguntar_gustos.companero_estudio').ok).toBe(true);
    const n = dir(g).get('companero_estudio')!;
    expect(n.sabe).toContain('gustos');
    expect(n.gustos!.length).toBeGreaterThanOrEqual(2);
    expect(g.log.some((l) => l.text.includes('le gusta: ') && !l.text.includes('undefined'))).toBe(true);
    expect(g.preview('relaciones.preguntar_gustos.companero_estudio')?.available ?? false).toBe(false);
  });
});

describe('horarios de los lugares en las acciones', () => {
  it('en vacaciones, si el colegio aún no ha abierto cuando se pasaría por su entrada, la acción va a otro sitio; ya abierto, vuelve a ser la pista del colegio', () => {
    const g = nuevaPartida({ seed: 31 });
    advanceToWeek(g, 'gen.descansar', 42, 2, 8); // un miércoles de verano (vacaciones)
    g.perform('lugares.ir_calle_casa');
    g.perform('lugares.ir_avenida_parque');
    g.perform('lugares.ir_parque');
    const primero = () => (g.preview('atletismo.series')!.lugar ?? [])[0];
    const hasta = (minuto: number) => advanceUntil(g, 'gen.esperar', (t) => t.minuteOfDay >= minuto, 400);
    expect(g.service<LugaresService>(SERVICES.lugares)!.actual().id).toBe('parque');
    // El colegio abre a las 10:00. Justo cuando se llegaría a su entrada un minuto antes, aunque a la pista (2 minutos más allá) se llegaría ya abierto.
    const alColegio = g.service<LugaresService>(SERVICES.lugares)!.minutosA('colegio')!;
    hasta(10 * 60 - alColegio - 1);
    expect(primero()).not.toBe('pista_colegio');
    hasta(10 * 60 + 30);
    expect(primero()).toBe('pista_colegio');
    // La academia no se puede hacer antes de que abra el colegio, y el motivo es el horario, no el lugar.
    expect(g.preview('atletismo.series')!.available || faltaViajarA(g.preview('atletismo.series')!)).toBe(true);
  });
});

describe('biblioteca, gimnasio y estadio', () => {
  const lugarActual = (g: Game) => g.service<LugaresService>(SERVICES.lugares)!.actual().id;
  const idEstudiar = (g: Game) => `estudios.estudiar_${g.service<StudiesService>(SERVICES.estudios)!.activeSubjects()[0].replace('estudios.', '')}`;
  const ir = (g: Game, lugar: string) => g.preview(`lugares.ir_${lugar}`)!;

  it('se estudia en casa o en la biblioteca, ya no en la entrada del colegio ni en el patio', () => {
    const g = nuevaPartida({ seed: 31 });
    const id = idEstudiar(g);
    expect(g.preview(id)!.lugar).toEqual(['casa', 'biblioteca']);
    expect(g.preview('estudios.repaso')?.lugar).toEqual(['casa', 'biblioteca']);
    // En la entrada del colegio no se puede estudiar.
    advanceToWeek(g, 'gen.descansar', 3, 2, 16);
    viajarA(g, 'colegio');
    expect(lugarActual(g)).toBe('colegio');
    expect(g.preview(id)!.available).toBe(false);
    // En la biblioteca, abierta, sí.
    viajarA(g, 'biblioteca');
    expect(lugarActual(g)).toBe('biblioteca');
    expect(g.preview(id)!.available).toBe(true);
    expect(hacer(g, id).ok).toBe(true);
  });

  it('la biblioteca cierra los domingos y de noche; su personal está en los turnos de entre semana', () => {
    const g = nuevaPartida({ seed: 31 });
    advanceToWeek(g, 'gen.descansar', 3, 6, 11); // domingo
    viajarA(g, 'calle_colegio');
    expect(ir(g, 'biblioteca')).toMatchObject({ available: false });
    expect(ir(g, 'biblioteca').reason).toMatch(/Biblioteca estará cerrado cuando llegues/);
    advanceToWeek(g, 'gen.descansar', 4, 2, 21); // miércoles por la noche
    expect(ir(g, 'biblioteca').available).toBe(false);
    // Entre semana a las 10:00 está el turno de mañana; a las 17:00, el de tarde.
    advanceToWeek(g, 'gen.descansar', 5, 2, 10);
    const presentes = () => g.service<PresenciaService>(SERVICES.presencia)!.en('biblioteca').map((n) => n.id);
    expect(presentes()).toContain('bibliotecario_1');
    expect(presentes()).not.toContain('bibliotecario_2');
    advanceToWeek(g, 'gen.descansar', 5, 2, 17);
    expect(presentes()).toContain('bibliotecario_2');
    expect(presentes()).not.toContain('bibliotecario_1');
  });

  it('el gimnasio abre de 8:00 a 22:00 y el estadio de 8:00 a 21:00; el parque, siempre', () => {
    const g = nuevaPartida({ seed: 31 });
    advanceToWeek(g, 'gen.descansar', 3, 2, 7); // 7:00
    viajarA(g, 'avenida_parque');
    expect(ir(g, 'gimnasio').available).toBe(false); // abre a las 8:00 y desde la avenida se tardan 5 minutos
    expect(ir(g, 'gimnasio').reason).toMatch(/Gimnasio estará cerrado/);
    expect(ir(g, 'parque').available).toBe(true);
    viajarA(g, 'avenida_estadio');
    expect(ir(g, 'estadio').available).toBe(false);
    advanceToWeek(g, 'gen.descansar', 3, 2, 9);
    expect(ir(g, 'estadio').available).toBe(true);
    advanceToWeek(g, 'gen.descansar', 3, 2, 21);
    expect(ir(g, 'estadio').available).toBe(false);
    viajarA(g, 'avenida_parque');
    expect(ir(g, 'gimnasio').available).toBe(true); // el estadio ya ha cerrado (21:00), pero el gimnasio sigue abierto hasta las 22:00
  });
});

describe('adultos, sala de profesores y entrenadores de los clubes', () => {
  const dir = (g: Game) => g.service<NpcDirectory>(SERVICES.npcs)!;

  it('los adultos tienen profesión y lugar de trabajo; el profesorado, «Profesor» y su colegio, y la asignatura al ir a su clase', () => {
    const g = nuevaPartida({ seed: 31 });
    const tutor = dir(g).get('tutor')!;
    expect(tutor.profesionBasica).toMatch(/^Profesor/);
    expect(tutor.trabajo).toBe('Colegio Cervantes');
    expect(tutor.sabe).toEqual(['trabajo']); // dónde trabaja se sabe; la asignatura, no
    expect(tutor.colegio).toBeUndefined(); // el profesorado trabaja en el colegio, no va
    expect(tutor.clase).toBeUndefined();
    const adultos = dir(g).list({ role: 'vecino' }).filter((n) => (n.edadExacta ?? 0) >= 18);
    expect(adultos.length).toBeGreaterThan(20);
    for (const v of adultos) {
      expect(v.profesion, v.id).toBeDefined();
      expect(v.colegio, v.id).toBeUndefined();
      if (v.profesion !== 'Jubilado' && v.profesion !== 'Jubilada') expect(v.trabajo, v.id).toBeDefined();
    }
    // Los niños tienen colegio y clase, no profesión.
    expect(dir(g).get('companero_social')!.profesion).toBeUndefined();
    // Ir a la clase de lengua enseña qué da su profesor.
    advanceTo(g, 'gen.descansar', 0, 7);
    for (let i = 0; i < 12 && g.time.minuteOfDay < 7 * 60 + 50; i++) g.perform(i % 2 === 0 ? 'lugares.ir_parque' : 'lugares.ir_casa');
    const asignatura = g.service<StudiesService>(SERVICES.estudios)!.timetable(0)[0];
    expect(hacer(g, 'estudios.clase_1').ok).toBe(true);
    const numero = { 'estudios.lengua': 1, 'estudios.matematicas': 2, 'estudios.ingles': 3 }[asignatura as string];
    if (numero) {
      const p = dir(g).get(`profesor_${numero}`)!;
      expect(p.sabe).toContain('profesion');
      expect(p.profesion).toMatch(/^Profesor(a)? de /);
    }
  });

  it('tus padres tienen profesión y lugar de trabajo, que sabes sin preguntar, y cambian según la partida', () => {
    const g = nuevaPartida({ seed: 31 });
    for (const id of ['padre', 'madre']) {
      const p = dir(g).get(id)!;
      expect(p.profesion, id).toBeDefined();
      expect(p.trabajo, id).toBeDefined();
      expect(p.sabe).toEqual(expect.arrayContaining(['profesion', 'trabajo']));
    }
    expect(g.preview('relaciones.preguntar_profesion.padre')).toBeUndefined(); // ya lo sabes
    const oficios = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => dir(nuevaPartida({ seed })).get('padre')!.profesion));
    expect(oficios.size).toBeGreaterThan(2);
  });

  it('el profesorado está en la sala de profesores en el recreo (menos un par en el patio): para hablar con ellos hay que ir allí', () => {
    const g = conocer(nuevaPartida({ seed: 31 }), 'tutor');
    advanceTo(g, 'gen.descansar', 0, 10);
    advanceUntil(g, 'gen.esperar', (t) => t.minuteOfDay >= 10 * 60 + 45); // el recreo
    const donde = g.service<PresenciaService>(SERVICES.presencia)!.donde('tutor')!;
    expect(['sala_profesores', 'patio']).toContain(donde);
    g.perform('lugares.ir_colegio');
    const antes = g.time.minuteOfDay;
    g.perform('lugares.ir_sala_profesores');
    expect(g.time.minuteOfDay - antes).toBe(2);
    const ahi = g.service<PresenciaService>(SERVICES.presencia)!.en('sala_profesores').map((n) => n.id);
    expect(ahi.length).toBeGreaterThanOrEqual(7);
    expect(ahi.every((id) => id === 'tutor' || id.startsWith('profesor_'))).toBe(true);
    if (donde === 'sala_profesores') {
      expect(g.preview('relaciones.hablar.tutor')?.available).toBe(true);
      // Preguntarle a qué se dedica: responde con su profesión (antes decía «va a undefined»).
      expect(g.perform('relaciones.preguntar_profesion.tutor').ok).toBe(true);
      expect(g.log.some((l) => /trabaja como profesor/i.test(l.text) && !l.text.includes('undefined'))).toBe(true);
    }
  });

  it('cada club de fuera tiene entrenadores por edades (alguno lleva varias categorías) y se presenta el que lleva tu edad', () => {
    const g = nuevaPartida({ seed: 31 });
    const delClub = (club: string) => dir(g).list({ role: 'entrenador' }).filter((n) => n.club === club);
    expect(delClub('club_ciudad').map((n) => n.edades)).toEqual([[10, 13], [14, 17], [18, 99]]);
    expect(delClub('club_alto_rendimiento').map((n) => n.edades)).toEqual([[14, 17], [18, 99]]);
    expect(delClub('colegio')).toHaveLength(1);
    for (const n of delClub('club_ciudad')) {
      expect(n.trabajo).toBe('Club Atletismo Ciudad');
      expect(n.profesionBasica).toMatch(/^Entrenador/);
      expect(n.known).toBe(false);
    }
  });

  it('en la pestaña del deporte salen tu entrenador, los días de entreno y las carreras', () => {
    const g = nuevaPartida({ seed: 31 });
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    hacer(g, 'atletismo.apuntarse_colegio');
    const v = g.service<DeporteService>(claveDeDeporte('atletismo'))!.view();
    const dato = (e: string) => v.resumen.find((r) => r.etiqueta === e)!.valor;
    expect(dato('Entrenador')).toBe(dir(g).get('entrenador')!.name);
    expect(dato('Entrenamientos')).toBe('lunes y miércoles de 15 a 17');
    expect(dato('Carreras')).toMatch(/sábados de 9 a 13/);
  });

  it('tu entrenador en un club de fuera es el que lleva tu edad', () => {
    const base = nuevaPartida({ seed: 31 });
    const guardado = base.serialize();
    (guardado.modules.gen as { edadInicial: number }).edadInicial = 12;
    (guardado.modules.clubes as { membresias: Record<string, unknown> }).membresias = { atletismo: { clubId: 'club_ciudad', desde: 0 } };
    const g = conocer(cargarPartida(guardado), 'entrenador_club_ciudad_1', 'entrenador_club_ciudad_2');
    const v = g.service<DeporteService>(claveDeDeporte('atletismo'))!.view();
    expect(v.resumen.find((r) => r.etiqueta === 'Entrenador')!.valor).toBe(g.service<NpcDirectory>(SERVICES.npcs)!.get('entrenador_club_ciudad_1')!.name); // 10 a 13 años
    expect(v.resumen.find((r) => r.etiqueta === 'Entrenamientos')!.valor).toBe('martes y jueves de 18 a 20');
  });
});

describe('el aula, las calles y los viajes', () => {
  const lugar = (g: Game) => g.service<LugaresService>(SERVICES.lugares)!.actual().id;
  const aqui = (g: Game, donde: string) => g.service<PresenciaService>(SERVICES.presencia)!.en(donde).map((n) => n.id);

  it('a las 7:50 la entrada se vacía y los de tu clase están en el aula; al aula solo se entra desde el colegio y desde 10 minutos antes', () => {
    const g = conocer(nuevaPartida({ seed: 31 }));
    llegarA(g, 'colegio', 7, 40);
    expect(lugar(g)).toBe('colegio');
    expect(aqui(g, 'colegio').length).toBeGreaterThan(20); // llegando
    expect(aqui(g, 'aula')).toEqual([]);
    // Antes de las 7:50 el aula está cerrada.
    expect(g.preview('lugares.ir_aula')!.available).toBe(false);
    expect(g.preview('lugares.ir_aula')!.reason).toMatch(/cerrado|cerrará|estará cerrado/);
    advanceUntil(g, 'gen.esperar', (t) => t.minuteOfDay >= 7 * 60 + 50);
    expect(aqui(g, 'colegio')).toEqual([]); // se han ido a sus clases
    expect(aqui(g, 'aula')).toContain('companero_social');
    expect(g.preview('lugares.ir_aula')!.available).toBe(true);
    expect(g.perform('lugares.ir_aula').ok).toBe(true);
    expect(lugar(g)).toBe('aula');
  });

  it('en los 5 minutos de entre clase y clase se puede hablar con los compañeros en el aula; en clase, no', () => {
    const g = conocer(nuevaPartida({ seed: 31 }));
    llegarA(g, 'aula', 7, 52);
    expect(hacer(g, 'estudios.clase_1').ok).toBe(true); // 8:00–9:15
    expect(g.time.minuteOfDay).toBe(9 * 60 + 15);
    expect(lugar(g)).toBe('aula');
    expect(g.preview('relaciones.charlar.companero_social')!.available).toBe(true);
    expect(g.preview('relaciones.al_azar')!.available).toBe(true);
    expect(aqui(g, 'aula')).toContain('companero_social');
  });

  it('las clases se hacen en el aula: desde otro sitio piden estar allí, y llegar tarde cuenta lo asistido', () => {
    const g = nuevaPartida({ seed: 31 });
    llegarA(g, 'colegio', 8, 5);
    expect(g.preview('estudios.clase_1')!.reason).toMatch(/Tienes que estar en tu aula/);
    llegarA(g, 'aula', 8, 20);
    const o = g.preview('estudios.clase_1')!;
    expect(o.available).toBe(true);
    expect(o.modifiers.some((m) => m.id === 'estudios.llegada_tarde')).toBe(true);
  });

  it('en el aula, en clase, los compañeros no desaparecen: se ven «atendiendo en clase» y no se puede hablar con ellos', () => {
    const g = conocer(nuevaPartida({ seed: 31 }));
    advanceTo(g, 'gen.descansar', 0, 7);
    llegarA(g, 'aula', 8, 5); // la clase de las 8:00 ya ha empezado y no entras a ella
    const presencia = g.service<PresenciaService>(SERVICES.presencia)!;
    expect(presencia.en('aula').map((n) => n.id)).not.toContain('companero_social');
    const ocupados = presencia.ocupadosEn('aula');
    expect(ocupados.length).toBeGreaterThan(10);
    expect(ocupados.find((o) => o.persona.id === 'companero_social')?.motivo).toBe('atendiendo en clase');
    // No se puede hablar con ellos, y el motivo lo dice.
    const charla = g.preview('relaciones.charlar.companero_social')!;
    expect(charla.available).toBe(false);
    expect(charla.reason).toMatch(/atendiendo en clase.*no puedes hablar/);
    // Al acabar la clase vuelven a poder hablar.
    advanceUntil(g, 'gen.esperar', (t) => t.minuteOfDay >= 9 * 60 + 15);
    expect(g.service<PresenciaService>(SERVICES.presencia)!.ocupadosEn('aula')).toEqual([]);
    expect(g.service<PresenciaService>(SERVICES.presencia)!.en('aula').map((n) => n.id)).toContain('companero_social');
  });

  it('los padres siguen en casa a las 23:00 y se puede hablar con ellos; un hermano pequeño duerme y no', () => {
    const g = conocer(nuevaPartida({ seed: 31 }), 'padre', 'madre');
    advanceTo(g, 'gen.descansar', 1, 22);
    advanceUntil(g, 'gen.esperar', (t) => t.minuteOfDay >= 23 * 60 + 10);
    expect(g.service<LugaresService>(SERVICES.lugares)!.actual().id).toBe('casa');
    const presencia = g.service<PresenciaService>(SERVICES.presencia)!;
    expect(presencia.en('casa').map((n) => n.id)).toEqual(expect.arrayContaining(['padre', 'madre']));
    expect(g.preview('relaciones.charlar.padre')!.available).toBe(true);
    // Un hermano menor de 8 años duerme a esa hora: está en casa, pero ocupado.
    const dormidos = presencia.ocupadosEn('casa');
    for (const d of dormidos) {
      expect(d.motivo).toBe('durmiendo');
      expect(d.persona.age!).toBeLessThan(8);
    }
  });

  it('desde casa no se llega a una zona ni a otra calle sin pasar por la suya; el viaje rápido salta a lugares', () => {
    const g = nuevaPartida({ seed: 31 });
    expect(g.preview('lugares.ir_aula')!.available).toBe(false);
    expect(g.preview('lugares.ir_calle_colegio')!.available).toBe(false);
    expect(g.preview('lugares.ir_calle_casa')!.available).toBe(true);
    expect(g.service<LugaresService>(SERVICES.lugares)!.pasos().map((p) => p.lugar.id)).toEqual(['calle_casa']);
    g.perform('lugares.ir_calle_casa');
    expect(g.service<LugaresService>(SERVICES.lugares)!.pasos().map((p) => p.lugar.id).sort()).toEqual(['avenida_parque', 'calle_colegio', 'casa', 'restaurante', 'supermercado']);
    expect(g.preview('lugares.ir_colegio')!.available).toBe(true); // viaje rápido
  });
});

describe('siesta, jugar y entrenar con el club', () => {
  const rel = (g: Game) => g.service<RelationsService>(SERVICES.relaciones)!;

  it('la siesta solo se echa en casa', () => {
    const g = nuevaPartida({ seed: 31 });
    expect(g.preview('gen.descansar')!.name).toBe('Echarse una siesta');
    expect(g.preview('gen.descansar')!.available).toBe(true);
    g.perform('lugares.ir_parque');
    expect(g.preview('gen.descansar')!.available).toBe(false);
    expect(g.preview('gen.descansar')!.reason).toMatch(/Tienes que estar en casa/);
  });

  it('en el recreo se juega con un compañero (5 minutos) o con otros tres niños de tu edad, repartiendo lo que sube la relación', () => {
    const g = conocer(nuevaPartida({ seed: 31 }));
    expect(g.preview('estudios.recreo')).toBeUndefined(); // ya no hay «Recreo»: se juega
    llegarA(g, 'patio', 10, 45);
    const jugar = g.preview('relaciones.jugar.companero_social')!;
    expect(jugar.available).toBe(true);
    expect(jugar.duration).toBe(5);
    const antes = rel(g).get('companero_social')!.afinidad;
    expect(g.perform('relaciones.jugar.companero_social').ok).toBe(true);
    expect(rel(g).get('companero_social')!.afinidad).toBeGreaterThan(antes);
    // Con otros niños: tres, de tu edad (con un año de margen), conocidos o no.
    const otros = g.preview('relaciones.jugar_con_otros')!;
    expect(otros.available).toBe(true);
    expect(otros.duration).toBe(5);
    const conocidos = (g.service<NpcDirectory>(SERVICES.npcs)!.list({ known: true })).length;
    expect(g.perform('relaciones.jugar_con_otros').ok).toBe(true);
    expect(g.log.some((l) => /^Juegas con .+\.$/.test(l.text))).toBe(true);
    expect(g.service<NpcDirectory>(SERVICES.npcs)!.list({ known: true }).length).toBeGreaterThanOrEqual(conocidos);
    // En clase no.
    llegarA(g, 'aula', 11, 12);
    expect(g.preview('relaciones.jugar_con_otros')!.available).toBe(false);
  });

  describe('entrenar con el club', () => {
    const conClubDelColegio = () => {
      const g = conocer(nuevaPartida({ seed: 31 }));
      advanceToWeek(g, 'gen.descansar', 1, 0, 15);
      hacer(g, 'atletismo.apuntarse_colegio');
      advanceToWeek(g, 'gen.descansar', 2, 0, 13); // lunes: el club del colegio entrena de 15 a 17
      return g;
    };

    it('los miembros están en la pista 10 minutos antes y mientras hay sesión no se entrena por libre', () => {
      const g = conClubDelColegio();
      llegarA(g, 'pista_colegio', 14, 40);
      expect(g.service<PresenciaService>(SERVICES.presencia)!.en('pista_colegio')).toEqual([]); // faltan más de 10 minutos
      advanceUntil(g, 'gen.esperar', (t) => t.minuteOfDay >= 14 * 60 + 50);
      expect(g.service<PresenciaService>(SERVICES.presencia)!.en('pista_colegio').map((n) => n.id)).toContain('entrenador');
      expect(g.preview('atletismo.club_sesion')!.available).toBe(true);
      // Con la sesión en marcha, entrenar por libre no está disponible.
      advanceUntil(g, 'gen.esperar', (t) => t.minuteOfDay >= 15 * 60 + 10);
      expect(g.preview('atletismo.tecnica')!.available).toBe(false);
      expect(g.preview('atletismo.tecnica')!.reason).toMatch(/entrenamiento de tu club/);
    });

    it('puedes incorporarte con la sesión empezada y solo entrenas la parte proporcional', () => {
      const g = conClubDelColegio();
      llegarA(g, 'pista_colegio', 14, 50);
      const entera = g.preview('atletismo.club_sesion')!;
      expect(entera.modifiers.some((m) => m.id === 'atletismo.llegada_tarde')).toBe(false);
      const h = conClubDelColegio();
      llegarA(h, 'pista_colegio', 16, 0);
      const tarde = h.preview('atletismo.club_sesion')!;
      expect(tarde.available).toBe(true);
      expect(tarde.duration).toBe(17 * 60 - h.time.minuteOfDay);
      expect(tarde.modifiers.find((m) => m.id === 'atletismo.llegada_tarde')!.result.efficiency).toBeCloseTo(0.5, 1);
      const antes = h.stat('atletismo.tecnica');
      const dentro = entera.efficiency;
      expect(tarde.efficiency).toBeLessThan(dentro * 0.6);
      expect(h.perform('atletismo.club_sesion').ok).toBe(true);
      expect(h.stat('atletismo.tecnica')).toBeGreaterThan(antes);
      expect(h.time.minuteOfDay).toBe(17 * 60);
    });
  });
});
