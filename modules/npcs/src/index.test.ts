import { describe, expect, it } from 'vitest';
import { SERVICES, apellidosDeFamilia, idDePonerApodo, madurezPorEdad, origen, reservaDeNombres, ventajaDeCrianza, type FamilyService, type NpcDirectory, type PresenciaService } from '@ds/contracts';
import { Game, advanceTo, advanceToWeek, advanceUntil } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { familia } from '@ds/mod-familia';
import { lugares } from '@ds/mod-lugares';
import { atletismo } from '@ds/mod-atletismo';
import { desarrolloRival, npcs, type Npc, type NpcsState } from './index';

/** Avanza hasta una hora y minuto concretos (de 5 en 5 minutos). */
function irA(g: Game, weekday: number, hora: number, minuto = 0): void {
  advanceTo(g, 'gen.descansar', weekday, hora);
  for (let i = 0; g.time.minuteOfDay < hora * 60 + minuto && i < 30; i++) g.perform('gen.esperar');
}

const nueva = () => Game.create([personaje, npcs, lugares, atletismo], { seed: 9 });

describe('módulo NPCs', () => {
  /** Los deportistas del atletismo de la partida (lo que pone el atletismo; los niños de otros colegios que reclutan los clubes son «rivales»). */
  const atletas = (g: Game) => g.moduleState<NpcsState>('npcs').npcs.filter((n) => n.deporte === 'atletismo' && n.genetica);
  const objetivos = (g: Game) => g.moduleState<NpcsState>('npcs').poblaciones![0].equipos.reduce((a, e) => a + e.objetivo, 0);

  it('genera un reparto, lo publica como servicio y guarda lo que pidió el atletismo', () => {
    const g = nueva();
    const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
    const lista = g.moduleState<NpcsState>('npcs').npcs;
    expect(dir.get('entrenador')?.role).toBe('entrenador');
    // Los rivales son niños de otros colegios que reclutaron los clubes: no hay un número fijo, sino las plantillas de los clubes.
    const rivales = dir.list({ role: 'rival' });
    expect(rivales.length).toBeGreaterThan(60);
    expect(rivales.every((r) => r.id.startsWith('nino_'))).toBe(true);
    expect(lista.length).toBe(lista.filter((n) => !n.id.startsWith('nino_')).length + rivales.length);
    expect(atletas(g)).toHaveLength(objetivos(g)); // todos los equipos completan su plantilla
  });

  it('los deportistas progresan con los días', () => {
    const g = nueva();
    const id = atletas(g).find((n) => n.role === 'rival')!.id;
    const nivel = () => g.service<NpcDirectory>(SERVICES.npcs)!.get(id)!.levels.atletismo;
    const antes = nivel();
    advanceTo(g, 'gen.descansar', 6, 20);
    expect(nivel()).toBeGreaterThan(antes);
  });

  it('los deportistas son distintos entre sí: unos parten con ventaja y otros con más potencial', () => {
    const lista = atletas(nueva());
    const niveles = lista.map((n) => n.levels.atletismo);
    const potenciales = lista.map((n) => n.potential.atletismo);
    const ritmos = lista.map((n) => n.ritmo?.atletismo ?? 1);
    expect(Math.max(...niveles) - Math.min(...niveles)).toBeGreaterThan(8);
    expect(Math.max(...potenciales) - Math.min(...potenciales)).toBeGreaterThan(12);
    expect(Math.max(...ritmos) - Math.min(...ritmos)).toBeGreaterThan(0.2);
    expect(new Set(lista.map((n) => n.name)).size).toBe(lista.length);
  });

  describe('deportistas por edad', () => {
    const rivales = (g: Game) => g.moduleState<NpcsState>('npcs').npcs.filter((n) => n.role === 'rival');
    const dir = (g: Game) => g.service<NpcDirectory>(SERVICES.npcs)!;

    it('hay deportistas de todas las edades de 8 a 19, ninguno de otras; los rivales son desconocidos al principio y tienen nombres únicos', () => {
      const g = nueva();
      for (let edad = 8; edad <= 19; edad++) {
        const hay = dir(g).list({ tag: 'atleta', minAge: edad, maxAge: edad }).length;
        expect(hay, `edad ${edad}`).toBeGreaterThanOrEqual(3);
        expect(hay, `edad ${edad}`).toBeLessThanOrEqual(20);
      }
      expect(dir(g).list({ tag: 'atleta', minAge: 20 })).toHaveLength(0);
      expect(rivales(g).every((n) => n.known === false)).toBe(true);
      expect(new Set(rivales(g).map((n) => n.name)).size).toBe(rivales(g).length);
    });

    it('nadie supera el techo de su edad: potencial × desarrollo', () => {
      const g = nueva();
      advanceTo(g, 'gen.descansar', 6, 20);
      for (const n of atletas(g)) {
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

    it('cada curso se van los mayores y entran niños nuevos, y los equipos vuelven a tener su plantilla', () => {
      const g = nueva();
      const idsAntes = new Set(atletas(g).map((n) => n.id));
      advanceUntil(g, 'gen.descansar', (t) => t.schoolYear >= 1, 20000);
      expect(atletas(g)).toHaveLength(objetivos(g));
      expect(dir(g).list({ tag: 'atleta', minAge: 20 })).toHaveLength(0);
      // Se han ido los de 19 años y han entrado niños de 8 que antes no estaban.
      expect(atletas(g).filter((n) => !idsAntes.has(n.id)).length).toBeGreaterThanOrEqual(5);
      expect(atletas(g).filter((n) => idsAntes.has(n.id)).length).toBeLessThan(objetivos(g));
    });
  });

  it('los niños llevan lo que heredaron de sus padres: topes de las capacidades físicas, perks, ventaja de crianza y lo que practicó cada padre', () => {
    const niños = nueva().moduleState<NpcsState>('npcs').npcs.filter((n) => n.genetica);
    expect(niños.length).toBeGreaterThan(200);
    for (const n of niños) {
      const g = n.genetica!;
      expect(Object.keys(g.topes)).toHaveLength(6);
      for (const t of Object.values(g.topes)) {
        expect(t).toBeGreaterThanOrEqual(20);
        expect(t).toBeLessThanOrEqual(100);
      }
      expect(g.ventaja).toBeGreaterThanOrEqual(0.95);
      expect(g.ventaja).toBeLessThanOrEqual(1.1);
      expect(['ninguna', 'aficionado', 'federado', 'profesional']).toContain(g.padres.padre);
    }
    // Cada niño es distinto: sus topes no son planos.
    expect(niños.filter((n) => Math.max(...Object.values(n.genetica!.topes)) - Math.min(...Object.values(n.genetica!.topes)) > 12).length).toBeGreaterThan(niños.length / 2);
    // Y nadie parte por encima de su potencial.
    for (const a of atletas(nueva())) expect(a.levels.atletismo).toBeLessThanOrEqual(a.potential.atletismo);
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
    const entrenadores = Array.from({ length: 40 }, (_, i) => Game.create([personaje, npcs, atletismo], { seed: i + 1 }).moduleState<NpcsState>('npcs').npcs.find((n) => n.id === 'entrenador')!);
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
      expect(aqui.some((id) => id.startsWith('nino_'))).toBe(false);
    });

    it('el sábado por la mañana los rivales y el entrenador están en el estadio', () => {
      const g = nueva();
      const dir = (x: Game) => x.service<NpcDirectory>(SERVICES.npcs)!;
      irA(g, 5, 8, 50); // llegando a las carreras de 9 a 13 (durante ellas están ocupados)
      const aqui = nombres(g, 'estadio');
      expect(aqui).toContain('entrenador');
      // Va a las carreras algo menos de la mitad de los niños de otros colegios que juegan al atletismo.
      const total = dir(g).list({ role: 'rival' }).length;
      const rivales = aqui.filter((id) => id.startsWith('nino_')).length;
      expect(rivales).toBeGreaterThan(total * 0.25);
      expect(rivales).toBeLessThan(total * 0.6);
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

    it('hay 25 alumnos por aula, un equipo del colegio con su plantilla y profesores, vecinos y rivales en sus clubes', () => {
      const g = nueva();
      const alumnos = de(g, (n) => n.tipos?.some((t) => t.tipo === 'alumno') ?? false);
      // Tu clase (24 compañeros) y la otra de tu curso (25): los de 8 años, sin ti.
      expect(alumnos.filter((n) => n.id.startsWith('clase_') || n.id.startsWith('companero_')).length).toBe(24);
      expect(alumnos.filter((n) => n.id.startsWith('curso_')).length).toBe(25);
      expect(alumnos.filter((n) => n.id.startsWith('alumno_')).length).toBe(153);
      // El equipo del colegio tiene el número de niños que pide el atletismo (más o menos definido), todos alumnos del colegio.
      const equipo = de(g, (n) => n.tags.includes('equipo'));
      const colegio = g.moduleState<NpcsState>('npcs').poblaciones![0].equipos.find((e) => e.club === 'colegio')!;
      expect(equipo).toHaveLength(colegio.objetivo);
      expect(colegio.objetivo).toBeGreaterThanOrEqual(10);
      expect(colegio.objetivo).toBeLessThanOrEqual(14);
      expect(equipo.every((n) => n.tipos?.some((t) => t.tipo === 'alumno' || t.tipo === 'hermano'))).toBe(true);
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

    it('el nombre corto es el nombre de pila entero (José Manuel) o, si lo tiene, su apodo; y el jugador puede ponérselo o quitárselo', () => {
      const g = Game.create([personaje, npcs, familia, lugares], { seed: 3 });
      const dir = () => g.service<NpcDirectory>(SERVICES.npcs)!;
      const todos = dir().list();
      // Todos tienen nombre de pila y el nombre completo empieza por él.
      for (const n of todos) {
        expect(n.nombrePila, n.id).toBeDefined();
        expect(n.name.startsWith(n.nombrePila!), n.id).toBe(true);
        expect(n.nombreCorto).toBe(n.apodo ?? n.nombrePila);
      }
      expect(todos.some((n) => n.nombrePila!.includes(' '))).toBe(true); // hay compuestos y salen enteros
      expect(todos.some((n) => n.apodo)).toBe(true); // y apodos al azar
      // Poner un apodo a alguien que conoces (el padre) cambia su nombre corto; quitarlo vuelve al nombre de pila.
      const padre = dir().get('padre')!;
      const id = idDePonerApodo('padre', 'Papá Oso');
      expect(g.preview(id)!.available).toBe(true);
      expect(g.perform(id).ok).toBe(true);
      expect(dir().get('padre')!.nombreCorto).toBe('Papá Oso');
      expect(g.perform(id).ok).toBe(false); // ya se llama así
      expect(g.perform(idDePonerApodo('padre', '')).ok).toBe(true);
      expect(dir().get('padre')!.nombreCorto).toBe(padre.nombrePila);
      // Los textos no valen, y a quien no conoces no se le pone apodo.
      expect(g.preview('npcs.apodo.padre.%3Cb%3E')).toBeUndefined();
      const desconocido = todos.find((n) => n.known === false)!;
      expect(g.preview(idDePonerApodo(desconocido.id, 'Fulano'))!.available).toBe(false);
      expect(g.preview(idDePonerApodo('no_existe', 'Fulano'))).toBeUndefined();
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
      expect(enElParque.some((id) => id.startsWith('nino_'))).toBe(true); // los rivales también pasan por el parque
    });

    it('al empezar un curso quien acaba el colegio se va y entra otro niño de 8 años, y el equipo del colegio vuelve a tener su plantilla', () => {
      const g = nueva();
      const antes = lista(g).length;
      advanceToWeek(g, 'gen.descansar', 52, 0, 8); // comienza el segundo curso
      const despues = lista(g);
      const colegio = g.moduleState<NpcsState>('npcs').poblaciones![0].equipos.find((e) => e.club === 'colegio')!;
      expect(despues.filter((n) => n.tags.includes('equipo')).length).toBe(colegio.objetivo);
      expect(despues.filter((n) => n.role === 'companero' && n.id.startsWith('alumno_')).length).toBeGreaterThanOrEqual(153);
      // Los niños nuevos del colegio también tienen su genética y ninguno juega todavía a nada por ser de la clase.
      expect(despues.filter((n) => n.role === 'companero' && n.id.startsWith('alumno_') && !n.genetica)).toHaveLength(0);
      // La población del colegio no crece ni se vacía (los deportistas de otros colegios se renuevan aparte).
      expect(Math.abs(despues.length - antes)).toBeLessThan(40);
    });
  });
});

describe('hermanos', () => {
  const partidas = Array.from({ length: 200 }, (_, i) => Game.create([personaje, familia, npcs, atletismo], { seed: i + 1 }));
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

  it('pasan el tiempo en casa y, si tienen edad, en el colegio; si un club los recluta, también en su deporte', () => {
    const g = partidas.find((x) => hermanosDe(x).some((h) => h.age! >= 3 && h.age! < 18 && h.tags.includes('atleta')))!;
    expect(g, 'alguna partida tiene un hermano reclutado por un club').toBeDefined();
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
    // Un hermano que no juega a nada solo tiene el tipo de hermano (con el colegio si tiene edad).
    const sinDeporte = partidas.flatMap((x) => hermanosDe(x).filter((h) => h.age! >= 8).map((h) => x.moduleState<NpcsState>('npcs').npcs.find((n) => n.id === h.id)!)).find((n) => !n.deporte && n.tipos?.every((t) => !t.escolar));
    if (sinDeporte) expect(sinDeporte.tipos).toEqual([{ tipo: 'hermano' }]);
  });

  it('heredan carácter e intereses de sus padres y tienen su propia genética', () => {
    const hs = partidas.flatMap((g) => g.moduleState<NpcsState>('npcs').npcs.filter((n) => n.tags.includes('hermano')));
    expect(hs.length).toBeGreaterThan(100);
    const potenciales = hs.map((n) => Object.values(n.genetica!.topes).reduce((a, b) => a + b, 0) / 6);
    for (const p of potenciales) {
      expect(p).toBeGreaterThanOrEqual(20);
      expect(p).toBeLessThanOrEqual(100);
    }
    const sd = Math.sqrt(potenciales.reduce((a, p) => a + (p - potenciales.reduce((x, y) => x + y, 0) / potenciales.length) ** 2, 0) / potenciales.length);
    expect(sd).toBeGreaterThan(3); // cada hermano es distinto
  });

  it('un hermano no compite porque sí: solo lo hace si un club lo recluta, y entonces tiene nivel, etiqueta y equipo', () => {
    const todos = partidas.flatMap((g) => g.moduleState<NpcsState>('npcs').npcs.filter((n) => n.tags.includes('hermano')));
    const compiten = todos.filter((n) => n.tags.includes('atleta'));
    expect(compiten.length).toBeGreaterThan(0);
    expect(compiten.length).toBeLessThan(todos.length / 4); // una minoría: no por defecto
    for (const n of compiten) {
      expect(n.deporte).toBe('atletismo');
      expect(n.levels.atletismo).toBeGreaterThan(0);
      expect(n.equipo).toBeDefined();
    }
    for (const n of todos.filter((x) => !x.tags.includes('atleta'))) expect(n.levels.atletismo).toBeUndefined();
  });

  it('un hermano reclutado aparece en su categoría junto a los demás deportistas', () => {
    const g = partidas.find((x) => hermanosDe(x).some((h) => x.moduleState<NpcsState>('npcs').npcs.find((n) => n.id === h.id)!.deporte))!;
    const h = g.moduleState<NpcsState>('npcs').npcs.find((n) => n.tags.includes('hermano') && n.deporte)!;
    const edad = g.service<NpcDirectory>(SERVICES.npcs)!.get(h.id)!.age!;
    expect(g.service<NpcDirectory>(SERVICES.npcs)!.list({ tag: 'atleta', minAge: edad, maxAge: edad }).map((n) => n.id)).toContain(h.id);
  });

  it('los hermanos no se retiran con los cursos: siguen cuando los deportistas se renuevan', () => {
    const g = partidas.find((x) => hermanosDe(x).length >= 2)!;
    const antes = hermanosDe(g).map((h) => h.id);
    advanceUntil(g, 'gen.descansar', (t) => t.schoolYear >= 3, 30000);
    expect(hermanosDe(g).map((h) => h.id)).toEqual(antes);
  });
});
