import { describe, expect, it } from 'vitest';
import { SERVICES, apellidosDeFamilia, madurezPorEdad, origen, reservaDeNombres, ventajaDeCrianza, type FamilyService, type NpcDirectory, type PresenciaService } from '@ds/contracts';
import { Game, advanceTo, advanceToWeek, advanceUntil } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { familia } from '@ds/mod-familia';
import { lugares } from '@ds/mod-lugares';
import { desarrolloRival, npcs, type NpcsState } from './index';

/** Avanza hasta una hora y minuto concretos (de 5 en 5 minutos). */
function irA(g: Game, weekday: number, hora: number, minuto = 0): void {
  advanceTo(g, 'gen.descansar', weekday, hora);
  for (let i = 0; g.time.minuteOfDay < hora * 60 + minuto && i < 30; i++) g.perform('gen.esperar');
}

const nueva = () => Game.create([personaje, npcs, lugares], { seed: 9 });

describe('módulo NPCs', () => {
  it('genera un reparto y lo publica como servicio', () => {
    const g = nueva();
    const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
    const hermanos = dir.list({ tag: 'hermano' }).length;
    expect(dir.list().length).toBe(403 + 2 + 5 + 2 + hermanos); // 4 del entorno + 108 rivales (9 por edad de 8 a 19) + la población del colegio y del barrio + los padres + 5 entrenadores de clubes + 2 bibliotecarios + los hermanos
    expect(dir.list({ role: 'rival' })).toHaveLength(108);
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

    it('hay 9 rivales por cada edad de 8 a 19, desconocidos al principio y con nombres únicos', () => {
      const g = nueva();
      for (let edad = 8; edad <= 19; edad++) {
        expect(dir(g).list({ role: 'rival', minAge: edad, maxAge: edad })).toHaveLength(9);
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
      // La edad de competición es por año de nacimiento: tras el relevo cada edad tiene exactamente 9 rivales.
      for (let edad = 8; edad <= 19; edad++) {
        expect(dir(g).list({ role: 'rival', minAge: edad, maxAge: edad })).toHaveLength(9);
      }
      expect(despues).toHaveLength(108);
      expect(dir(g).list({ role: 'rival', minAge: 21 })).toHaveLength(0);
      // Se han ido los de 19 años y han entrado niños de 8 que antes no estaban.
      expect(despues.filter((n) => !idsAntes.has(n.id)).length).toBeGreaterThanOrEqual(9);
      expect(despues.filter((n) => idsAntes.has(n.id)).length).toBeLessThan(108);
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
      // El padre y el hijo comparten apellido (el último de los dos nombres).
      expect(padre.nombre.split(' ').pop()).toBe(r.name.split(' ').pop());
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

    it('en clase están ocupados (no se les puede hablar); en el recreo, el tutor y los compañeros están en el patio, y no los rivales de otros clubes', () => {
      const g = nueva();
      advanceTo(g, 'gen.descansar', 0, 10); // lunes, 10:00: en clase
      expect(nombres(g, 'colegio')).toEqual([]);
      advanceTo(g, 'gen.descansar', 0, 11); // el recreo es de 10:40 a 11:20 (en el patio hasta las 11:10)
      const aqui = nombres(g, 'patio');
      // El profesorado está en la sala de profesores (menos un par que salen al patio); para hablar con ellos hay que ir allí.
      const sala = nombres(g, 'sala_profesores');
      expect(sala.length).toBeGreaterThanOrEqual(7);
      expect(sala.every((id) => id === 'tutor' || id.startsWith('profesor_'))).toBe(true);
      const alPatio = aqui.filter((id) => id === 'tutor' || id.startsWith('profesor_'));
      expect(alPatio.length).toBeLessThanOrEqual(5);
      expect(sala.length + alPatio.length).toBe(12);
      expect(aqui).toContain('companero_estudio');
      expect(aqui).toContain('companero_social');
      expect(aqui.some((id) => id.startsWith('rival_'))).toBe(false);
    });

    it('el sábado por la mañana los rivales y el entrenador están en el estadio', () => {
      const g = nueva();
      irA(g, 5, 8, 50); // llegando a las carreras de 9 a 13 (durante ellas están ocupados)
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
      // (Los hermanos duermen en casa: no cuentan.)
      for (const l of ['colegio', 'estadio', 'parque', 'gimnasio', 'supermercado', 'restaurante', 'casa']) expect(nombres(g, l).filter((id) => !id.startsWith('hermano'))).toEqual([]);
    });

    it('se puede limitar cuántos hay, y primero salen los conocidos y los de mayor nivel (el tutor, si lo conoces, antes que un compañero)', () => {
      const g = nueva();
      const st = g.moduleState<NpcsState>('npcs') as NpcsState;
      st.npcs = st.npcs.map((n) => (n.id === 'tutor' ? { ...n, known: true } : n));
      advanceTo(g, 'gen.descansar', 0, 11);
      const donde = g.service<PresenciaService>(SERVICES.presencia)!.donde('tutor')!;
      const dos = nombres(g, donde, 2);
      expect(dos).toHaveLength(2);
      expect(dos).toContain('tutor');
    });

    it('cada persona sabe dónde está y tiene su agenda', () => {
      const g = nueva();
      advanceTo(g, 'gen.descansar', 0, 11);
      const p = g.service<PresenciaService>(SERVICES.presencia)!;
      expect(['sala_profesores', 'colegio']).toContain(p.donde('tutor'));
      expect(p.donde('nadie')).toBeUndefined();
      expect(p.agenda('tutor').some((x) => x.tipo === 'profesor')).toBe(true);
    });

    it('la presencia reutilizada entre cambios de tramo da lo mismo que calcularla persona a persona, a cualquier minuto', () => {
      const g = nueva();
      advanceTo(g, 'gen.descansar', 0, 0);
      const lugares = ['colegio', 'estadio', 'parque', 'gimnasio', 'supermercado', 'restaurante'];
      let cambios = 0;
      let anterior = '';
      // Se avanza de 6 en 6 minutos (ir al parque y volver) durante dos días y se compara con la agenda de cada persona.
      for (let i = 0; i < (2 * 1440) / 6; i++) {
        const p = g.service<PresenciaService>(SERVICES.presencia)!;
        const porLugar = new Map<string, string[]>();
        for (const n of g.service<NpcDirectory>(SERVICES.npcs)!.list()) {
          const donde = p.donde(n.id);
          if (donde) porLugar.set(donde, [...(porLugar.get(donde) ?? []), n.id]);
        }
        for (const l of lugares) {
          expect(p.en(l).map((n) => n.id).sort(), `${l} a las ${g.time.hour}:${g.time.minuteOfDay % 60}`).toEqual((porLugar.get(l) ?? []).sort());
        }
        const foto = lugares.map((l) => p.en(l).length).join(',');
        if (foto !== anterior) cambios++;
        anterior = foto;
        g.perform('gen.esperar');
      }
      // Cambia solo cuando cambia algún tramo: unas pocas veces al día, no cada pocos minutos.
      expect(cambios).toBeLessThan(60);
    });

    it('la presencia no cambia dentro de un mismo tramo horario', () => {
      const g = nueva();
      advanceTo(g, 'gen.descansar', 1, 15);
      const a = nombres(g, 'parque');
      g.perform('gen.descansar'); // 16:00, misma tarde libre
      expect(nombres(g, 'parque')).toEqual(a);
    });
  });

  describe('población del colegio y del barrio', () => {
    const lista = (g: Game) => g.moduleState<NpcsState>('npcs').npcs;
    const de = (g: Game, f: (n: NpcsState['npcs'][number]) => boolean) => lista(g).filter(f);

    it('hay 25 alumnos por aula, un equipo de 16 y profesores, vecinos y rivales en sus clubes', () => {
      const g = nueva();
      const alumnos = de(g, (n) => n.tipos?.some((t) => t.tipo === 'alumno') ?? false);
      // Tu clase (24 compañeros) y la otra de tu curso (25): los de 8 años, sin ti.
      expect(alumnos.filter((n) => n.id.startsWith('clase_') || n.id.startsWith('companero_')).length).toBe(24);
      expect(alumnos.filter((n) => n.id.startsWith('curso_')).length).toBe(25);
      expect(alumnos.filter((n) => n.id.startsWith('alumno_')).length).toBe(153);
      expect(de(g, (n) => n.tags.includes('equipo')).length).toBe(16);
      expect(de(g, (n) => n.role === 'profesor').length).toBe(12);
      expect(de(g, (n) => n.role === 'vecino' && !n.tags.includes('bibliotecario')).length).toBe(80);
      expect(de(g, (n) => n.tags.includes('bibliotecario')).map((n) => n.id)).toEqual(['bibliotecario_1', 'bibliotecario_2']);
      const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
      for (const id of ['bibliotecario_1', 'bibliotecario_2']) expect(dir.get(id)).toMatchObject({ profesion: expect.stringMatching(/^Bibliotecari[oa]$/), trabajo: 'Biblioteca municipal' });
      const clubes = new Set(de(g, (n) => n.role === 'rival').map((n) => n.club));
      expect(clubes.size).toBeGreaterThanOrEqual(10);
      expect([...clubes].every((c) => ['Club Atletismo Ciudad', 'Club de Alto Rendimiento'].includes(c!) || /^(colegio|club)\d+$/.test(c!))).toBe(true);
    });

    it('todos tienen aspecto y nombre únicos, y son desconocidos salvo los del reparto inicial', () => {
      const g = nueva();
      const todos = lista(g);
      expect(new Set(todos.map((n) => n.name)).size).toBe(todos.length);
      expect(new Set(todos.map((n) => n.id)).size).toBe(todos.length);
      expect(todos.every((n) => n.rasgos)).toBe(true);
      expect(todos.filter((n) => n.known !== false).map((n) => n.id).filter((id) => !id.startsWith('hermano')).sort()).toEqual(['madre', 'padre']); // el reparto inicial no: se conoce hablando (o, el entrenador, apuntándose a su club); solo la familia
      expect(g.service<NpcDirectory>(SERVICES.npcs)!.list({ known: true }).filter((n) => n.role !== 'familia')).toHaveLength(0);
    });

    it('hay homónimos solo si son dos, de momentos distintos (15 años o más), y los nombres salen del origen de cada persona', () => {
      let conRepetidos = 0;
      let compuestos = 0;
      for (const seed of [1, 2, 3, 9, 31]) {
        const g = Game.create([personaje, npcs, familia, lugares], { seed });
        const todos = lista(g);
        const porNombre = new Map<string, number[]>();
        for (const n of todos) porNombre.set(n.name, [...(porNombre.get(n.name) ?? []), n.nacimiento ?? 0]);
        for (const [nombre, nacimientos] of porNombre) {
          expect(nacimientos.length, `${nombre} (semilla ${seed})`).toBeLessThanOrEqual(2);
          if (nacimientos.length === 2) {
            conRepetidos++;
            expect(Math.abs(nacimientos[0] - nacimientos[1]), nombre).toBeGreaterThanOrEqual(15 * 365);
          }
        }
        for (const n of todos) {
          // Nombre de pila de una cultura de su origen (o, en una mezcla sin el país de juego, del país de juego).
          const culturas = n.rasgos!.origen.flatMap((o) => reservaDeNombres(origen(o.id)!.reserva));
          const locales = reservaDeNombres('espana');
          const pila = n.name.split(' ')[0];
          const conocido = [...culturas, ...(n.rasgos!.origen.length > 1 ? locales : [])].some((c) => [...c.nombres.f.jovenes, ...c.nombres.f.adultos, ...c.nombres.m.jovenes, ...c.nombres.m.adultos, ...(c.compuestos?.f ?? []), ...(c.compuestos?.m ?? [])].some((x) => x.split(' ')[0] === pila));
          expect(conocido, `${n.id} ${n.name} ${JSON.stringify(n.rasgos!.origen)}`).toBe(true);
          if (/^(José|Juan|Luis|Miguel|María|Ana) \p{Lu}/u.test(n.name) && n.name.split(' ').length > 3) compuestos++;
        }
      }
      expect(compuestos).toBeGreaterThan(0);
      expect(conRepetidos).toBeGreaterThanOrEqual(0);
    });

    it('el patio tiene gente de todos los cursos (en el recreo) y el parque, de todas las edades', () => {
      const g = nueva();
      const edades = (ids: string[]) => ids.map((id) => g.service<NpcDirectory>(SERVICES.npcs)!.get(id)!.age!).filter((e) => e !== undefined);
      advanceTo(g, 'gen.descansar', 0, 11); // en el recreo
      const enElColegio = g.service<PresenciaService>(SERVICES.presencia)!.en('patio').map((n) => n.id);
      expect(enElColegio.length).toBeGreaterThan(200);
      const e = edades(enElColegio.filter((id) => id.startsWith('alumno_') || id.startsWith('curso_') || id.startsWith('clase_')));
      expect(Math.min(...e)).toBe(8);
      expect(Math.max(...e)).toBeGreaterThanOrEqual(16);
      advanceTo(g, 'gen.descansar', 5, 12); // sábado a mediodía
      const enElParque = g.service<PresenciaService>(SERVICES.presencia)!.en('parque').map((n) => n.id);
      expect(enElParque.length).toBeGreaterThan(15);
      expect(enElParque.some((id) => id.startsWith('vecino_'))).toBe(true);
      expect(enElParque.some((id) => id.startsWith('rival_'))).toBe(true); // los rivales también pasan por el parque
    });

    it('al empezar un curso quien acaba el colegio se va y entra otro niño de 8 años con los mismos tipos: el equipo sigue en 16', () => {
      const g = nueva();
      const antes = lista(g).length;
      advanceToWeek(g, 'gen.descansar', 52, 0, 8); // comienza el segundo curso
      const despues = lista(g);
      expect(despues.filter((n) => n.tags.includes('equipo')).length).toBe(16);
      expect(despues.filter((n) => n.role === 'companero' && n.id.startsWith('alumno_')).length).toBeGreaterThanOrEqual(153);
      // Los rivales también se renuevan, pero la población del colegio no crece ni se vacía.
      expect(Math.abs(despues.length - antes)).toBeLessThan(12);
    });
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
      for (const h of hs) {
        expect(h.role).toBe('familia');
        expect(h.name.endsWith(apellidosDeFamilia(partidas.indexOf(g) + 1, h.gender))).toBe(true);
        expect(h.known).not.toBe(false);
      }
    }
    expect(cuenta[1]).toBeGreaterThan(cuenta[0]);
    expect(cuenta[1]).toBeGreaterThan(cuenta[3]);
    expect(cuenta.every((c) => c > 0)).toBe(true);
  });

  it('«mayor» y «pequeño» concuerdan con la edad: el que tiene más años que el personaje (8) es mayor, y el que tiene menos, pequeño', () => {
    let mayores = 0, menores = 0;
    for (const g of partidas) {
      for (const h of hermanosDe(g)) {
        const mayor = h.age! > 8, menor = h.age! < 8;
        expect(h.description, `${h.name}, ${h.age} años`).toMatch(mayor ? /mayor\./ : menor ? /pequeñ[oa]\./ : /Tu melliz[oa]\./);
        if (mayor) mayores++;
        if (menor) menores++;
      }
    }
    expect(mayores).toBeGreaterThan(0);
    expect(menores).toBeGreaterThan(0);
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

  it('pasan el tiempo en casa y, si tienen edad, en el colegio y en su deporte', () => {
    const g = partidas.find((x) => hermanosDe(x).some((h) => h.age! >= 3 && h.age! < 18 && h.tags.includes('atleta')))!;
    const h = hermanosDe(g).find((x) => x.age! >= 3 && x.age! < 18 && x.tags.includes('atleta'))!;
    const donde = (dia: number, hora: number, minuto = 0) => {
      irA(g, dia, hora, minuto);
      return g.service<PresenciaService>(SERVICES.presencia)!.donde(h.id);
    };
    expect(donde(0, 9)).toBeNull(); // lunes, en clase: ocupado
    expect(donde(0, 11)).toBe('patio'); // en el recreo
    expect(donde(0, 22)).toBe('casa'); // de noche, en casa
    expect(donde(5, 8, 50)).toMatch(/casa|estadio/); // sábado: casa o llegando a las carreras
    // Si va a las carreras (el 40 %), a media mañana está corriendo (ocupado); si no, en casa.
    expect([null, 'casa']).toContain(donde(5, 10));
    expect(g.service<PresenciaService>(SERVICES.presencia)!.agenda(h.id).some((x) => x.tipo === 'hermano' && x.ocupado?.length && x.destinos[0][0] === 'estadio')).toBe(true);
    const mayor = partidas.flatMap((x) => x.moduleState<NpcsState>('npcs').npcs).find((n) => n.tags.includes('hermano') && n.tipos?.every((t) => !t.escolar));
    if (mayor) expect(mayor.tipos).toEqual([{ tipo: 'hermano', ...(mayor.levels.atletismo !== undefined ? { deporte: true } : {}) }]);
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
