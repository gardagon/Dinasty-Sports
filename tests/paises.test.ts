import { describe, expect, it } from 'vitest';
import {
  CALENDARIO_ESPANA,
  apellidosDeFamilia,
  identidadDeJugador,
  CATEGORIAS_ESPANA,
  HORARIOS_DE_ESPANA,
  SERVICES,
  copiaDeEspana,
  describirOrigen,
  formaDeApellido,
  identidadAlAzar,
  listarPaises,
  paisPorId,
  rngEstable,
  nombreCompleto,
  origen,
  padresDeSemilla,
  registrarPais,
  reservaDeNombres,
  type DeporteService,
  type LugaresService,
  type NpcDirectory,
  type StudiesService,
  claveDeDeporte,
} from '@ds/contracts';
import { cargarPartida, nuevaPartida } from '@ds/game';

/** Un país de prueba, copia de España con lo que se indique. */
const pais = (id: string, cambios: Parameters<typeof copiaDeEspana>[2] = {}) => registrarPais(copiaDeEspana(id, `País ${id}`, cambios));

describe('el país de la partida', () => {
  it('España por defecto; el país se elige al crear la partida, se guarda y vuelve al cargar', () => {
    const g = nuevaPartida({ seed: 5 });
    expect(g.pais.id).toBe('espana');
    expect(g.serialize().pais).toBe('espana');
    const a = nuevaPartida({ seed: 5, pais: 'argentina' });
    expect(a.pais).toMatchObject({ id: 'argentina', nombre: 'Argentina' });
    expect(a.serialize().pais).toBe('argentina');
    expect(cargarPartida(a.serialize()).pais.id).toBe('argentina');
    expect(nuevaPartida({ seed: 5, pais: 'atlantida' }).pais.id).toBe('espana'); // un país que no existe es España
  });

  it('las copias de España juegan igual que España (mismo calendario, cursos, categorías y horarios)', () => {
    const e = nuevaPartida({ seed: 7 });
    for (const id of ['argentina', 'inglaterra']) {
      const g = nuevaPartida({ seed: 7, pais: id });
      expect(g.time).toEqual(e.time);
      expect(g.service<StudiesService>(SERVICES.estudios)!.courseName()).toBe(e.service<StudiesService>(SERVICES.estudios)!.courseName());
      expect(g.service<LugaresService>(SERVICES.lugares)!.lugar('biblioteca')!.horario!.texto).toBe(e.service<LugaresService>(SERVICES.lugares)!.lugar('biblioteca')!.horario!.texto);
    }
  });

  it('el calendario es el del país: otra distribución de vacaciones cambia el periodo, el trimestre y los días lectivos', () => {
    const base = CALENDARIO_ESPANA;
    pais('cal_prueba', {
      calendario: {
        ...base,
        id: 'cal_prueba',
        nombre: 'Calendario de prueba',
        // El curso empieza con las vacaciones de verano y la clase es de la semana 6 en adelante.
        tramos: [{ desde: 0, hasta: 5, periodo: 'verano', trimestre: 0 }, { desde: 6, hasta: 51, periodo: 'clase', trimestre: 1 }],
        evaluaciones: [30],
        parciales: [10, 20],
      },
    });
    const g = nuevaPartida({ seed: 5, pais: 'cal_prueba' });
    expect(g.time.period).toBe('verano');
    expect(g.time.isSchoolDay).toBe(false);
    expect(nuevaPartida({ seed: 5 }).time.period).toBe('clase');
  });

  it('el currículo es el del país: cursos y asignaturas', () => {
    pais('cur_prueba', { cursos: [{ nombre: 'Primer año', etapa: 'primaria', asignaturas: ['lengua', 'matematicas'] }, { nombre: 'Segundo año', etapa: 'primaria', asignaturas: ['lengua'] }], cursoDeModalidad: 99 });
    const g = nuevaPartida({ seed: 5, pais: 'cur_prueba' });
    const est = g.service<StudiesService>(SERVICES.estudios)!;
    expect(est.courseName()).toBe('Primer año');
    expect(est.activeSubjects().sort()).toEqual(['estudios.lengua', 'estudios.matematicas']);
    expect(nuevaPartida({ seed: 5 }).service<StudiesService>(SERVICES.estudios)!.courseName()).toBe('3.º de primaria');
  });

  it('las categorías deportivas son las del país', () => {
    pais('cat_prueba', { categorias: { atletismo: [{ id: 'u11', nombre: 'Under 11', edadMin: 0, edadMax: 10 }, { id: 'u13', nombre: 'Under 13', edadMin: 11, edadMax: 12 }, { id: 'abierta', nombre: 'Abierta', edadMin: 13, edadMax: 200 }] } });
    const categoria = (id: string) => nuevaPartida({ seed: 5, pais: id }).service<DeporteService>(claveDeDeporte('atletismo'))!.view().resumen.find((r) => r.etiqueta === 'Categoría')!.valor;
    expect(categoria('cat_prueba')).toMatch(/Under 11/);
    expect(categoria('espana')).toMatch(/Sub-10/);
    expect(CATEGORIAS_ESPANA[0].id).toBe('sub10'); // la copia es independiente
  });

  it('los horarios de los lugares son los del país', () => {
    pais('hor_prueba', { horarios: { ...HORARIOS_DE_ESPANA, biblioteca: { tramos: [{ dias: 'todos', desde: 0, hasta: 1440 }], texto: 'siempre abierta' } } });
    const texto = (id: string) => nuevaPartida({ seed: 5, pais: id }).service<LugaresService>(SERVICES.lugares)!.lugar('biblioteca')!.horario!.texto;
    expect(texto('hor_prueba')).toBe('siempre abierta');
    expect(texto('espana')).not.toBe('siempre abierta');
    // España no se ve afectada por el país de prueba.
    expect(nuevaPartida({ seed: 5 }).service<LugaresService>(SERVICES.lugares)!.lugares()).toBe(nuevaPartida({ seed: 6 }).service<LugaresService>(SERVICES.lugares)!.lugares());
  });

  it('la gente sigue la demografía del país: los padres y la población son de sus orígenes, con sus nombres', () => {
    pais('demo_prueba', { demografia: { magreb: 1 }, origenesLocales: ['magreb'], apellidosDeLosNacidosAqui: 1 });
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const g = nuevaPartida({ seed, pais: 'demo_prueba' });
      const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
      const { padre, madre } = padresDeSemilla(seed, g.pais);
      for (const p of [padre, madre]) expect(describirOrigen(p.origen)).toBe(origen('magreb')!.nombre);
      expect(dir.get('padre')!.name).toBe(nombreCompleto(padre.identidad, 'm'));
      // Todo el mundo es de origen magrebí (o mezcla de ese origen) y los nombres son de la cultura magrebí.
      const magreb = new Set(reservaDeNombres('magreb').flatMap((c) => [...c.nombres.f.jovenes, ...c.nombres.f.adultos, ...c.nombres.m.jovenes, ...c.nombres.m.adultos]));
      for (const n of dir.list()) {
        expect(n.rasgos!.origen.every((o) => o.id === 'magreb'), `${n.id} ${JSON.stringify(n.rasgos!.origen)}`).toBe(true);
        expect(magreb.has(n.nombrePila!), `${n.id} ${n.name}`).toBe(true);
        expect(n.name.split(' ').length, n.name).toBeLessThanOrEqual(4); // un apellido (como «El Idrissi»)
      }
    }
  });

  it('Argentina: la gente es argentina (criolla e italiana), con un solo apellido y nombres argentinos', () => {
    const argentinos = new Set(reservaDeNombres('argentina').flatMap((c) => [...c.nombres.f.jovenes, ...c.nombres.f.adultos, ...c.nombres.m.jovenes, ...c.nombres.m.adultos]));
    let delPais = 0;
    let total = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const g = nuevaPartida({ seed, pais: 'argentina' });
      for (const n of g.service<NpcDirectory>(SERVICES.npcs)!.list()) {
        total++;
        if (n.rasgos!.origen.some((o) => o.id === 'argentina')) delPais++;
      }
      const { padre, madre } = padresDeSemilla(seed, g.pais);
      for (const p of [padre, madre]) expect(p.identidad.apellidos.length === 1 || p.origen.some((o) => reservaDeNombres(origen(o.id)!.reserva).some((c) => c.numeroDeApellidos === 2))).toBe(true);
      // Los hijos de padres argentinos llevan el apellido del padre (uno).
      if (padre.origen.length === 1 && padre.origen[0].id === 'argentina') expect(g.service<NpcDirectory>(SERVICES.npcs)!.get('padre')!.nombrePila && argentinos.has(g.service<NpcDirectory>(SERVICES.npcs)!.get('padre')!.nombrePila!)).toBe(true);
    }
    expect(delPais / total).toBeGreaterThan(0.6);
    expect(listarPaises().find((p) => p.id === 'argentina')!.origenesLocales).toEqual(['argentina']);
    // Un apellido italiano o criollo para un argentino de origen único.
    const rng = rngEstable('arg');
    for (let k = 0; k < 100; k++) {
      const i = identidadAlAzar(rng, k % 2 ? 'f' : 'm', [{ id: 'argentina', peso: 1 }], { edad: 10, pais: paisPorId('argentina') });
      expect(i.apellidos).toHaveLength(1);
      expect(argentinos.has(i.pila.split(' ')[0]) || argentinos.has(i.pila)).toBe(true);
    }
  });

  it('Inglaterra: gente británica, de Asia del sur, afrocaribeña y de otros orígenes, con un apellido; las sikh llevan «Kaur»', () => {
    const origenes = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const g = nuevaPartida({ seed, pais: 'inglaterra' });
      for (const n of g.service<NpcDirectory>(SERVICES.npcs)!.list()) for (const o of n.rasgos!.origen) origenes.add(o.id);
    }
    expect([...origenes]).toEqual(expect.arrayContaining(['britanico', 'asia_sur', 'afrocaribeno']));
    expect(origenes.has('espana_sur')).toBe(false); // España casi no pinta nada allí
    const rng = rngEstable('ing');
    let kaur = 0;
    for (let k = 0; k < 600; k++) {
      const i = identidadAlAzar(rng, 'f', [{ id: 'asia_sur', peso: 1 }], { edad: 40, pais: paisPorId('inglaterra') });
      expect(i.apellidos).toHaveLength(1);
      const apellido = formaDeApellido(i.apellidos[0], 'f');
      expect(apellido).not.toBe('Singh');
      if (apellido === 'Kaur') kaur++;
    }
    expect(kaur).toBeGreaterThan(0);
    expect(nombreCompleto({ pila: 'Harpreet', apellidos: [{ base: 'Singh', cultura: 'asia_sur_india' }] }, 'm')).toBe('Harpreet Singh');
  });

  it('donde se lleva un solo apellido (Argentina, Inglaterra) el personaje y sus hermanos llevan el de su padre; en España, los dos', () => {
    for (const [id, apellidos] of [['argentina', 1], ['inglaterra', 1], ['espana', 2]] as const) {
      for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        const p = paisPorId(id);
        const jugador = identidadDeJugador(seed, 'madre', p);
        expect(jugador.apellidos.split(' ').length >= apellidos).toBe(true);
        if (apellidos === 1) expect(jugador.apellidos).toBe(jugador.delPadre);
        else expect(jugador.apellidos).toBe(`${jugador.delMadre} ${jugador.delPadre}`);
        const g = nuevaPartida({ seed, pais: id });
        for (const h of g.service<NpcDirectory>(SERVICES.npcs)!.list({ tag: 'hermano' })) expect(h.name.endsWith(apellidosDeFamilia(seed, h.gender, p)), `${id} ${seed} ${h.name}`).toBe(true);
        if (apellidos === 1) expect(apellidosDeFamilia(seed, 'm', p)).toBe(jugador.delPadre);
      }
    }
  });
});
