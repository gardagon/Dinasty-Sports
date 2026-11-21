import { describe, expect, it } from 'vitest';
import {
  APORTE_DE_CONFIG_DE_SUCESOS,
  APORTE_DE_SUCESOS,
  SERVICES,
  SHARED_EVENTS,
  SUCESOS_DE_PRUEBA,
  contador,
  defineModule,
  hilo,
  suceso,
  validarCatalogo,
  type AporteDeSucesos,
  type CambioDeRelacionData,
  type GameModule,
  type SucesosDePruebaService,
  type SucesosService,
} from '@ds/contracts';
import { Game } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { sucesos, type SucesosState } from './index';

/** Lo que una prueba fija sin jugar: dónde estás, quién hay, cuántas faltas llevas, cómo sale una tirada. Se cambia entre acciones. */
const dado = { lugar: 'casa', presentes: ['madre'] as string[], faltas: 12, tirada: 'exito' as 'exito' | 'fallo', honestidad: 0, azar: undefined as number | undefined };

const CATALOGO: AporteDeSucesos[] = [
  contador({ id: 't.descansos', cuenta: { accion: { tags: ['descanso'] } } }),
  hilo({
    id: 't.faltas',
    nombre: 'Las faltas llegan a casa',
    reparto: { tutor: { tipo: 'progenitor' } },
    sucesos: [
      {
        id: 't.faltas.charla',
        titulo: 'Han llamado del colegio',
        disparo: { al: 'clase.faltas_excesivas' },
        ejemploDeSeñal: { faltas: 12 },
        cuando: [{ lugar: 'casa' }, { presente: 'tutor' }],
        aguanta: { dias: 3 },
        texto: '{tutor.Nombre}, muy seri{tutor:o|a}: «Llevas {señal.faltas} faltas».',
        plazo: { dias: 1, porDefecto: 'callar' },
        opciones: [
          {
            id: 'prometer',
            texto: 'Prometer que no volverás a faltar',
            caracter: { honestidad: 2 },
            minutos: 10,
            efectos: [{ relacion: 'tutor', confianza: 2 }, { estado: 'gen.estres', mas: 4 }, { marca: 't_prometio', dura: { dias: 30 } }, { recuerda: { faltas_antes: 'faltas' } }, { programa: 't.faltas.revision', en: { dias: 21 } }],
            resultado: '{tutor.Nombre} suspira.',
          },
          {
            id: 'mentir',
            texto: 'Decir que es un error',
            caracter: { honestidad: -3 },
            requiere: [{ stat: 'gen.picardia', min: 1 }],
            tirada: { con: 'gen.picardia', dificultad: 45 },
            exito: { efectos: [{ entrena: 'gen.picardia', cantidad: 2 }, { marca: 't_mintio' }, { fin: true }], resultado: 'Te cree.' },
            fallo: { efectos: [{ restriccion: { tags: ['ocio'], dias: 7, motivo: 'Estás castigad{yo:o|a} sin salir' } }, { fin: true }], resultado: 'No cuela.' },
          },
          { id: 'callar', texto: 'No decir nada', efectos: [{ relacion: 'tutor', afinidad: -2 }, { fin: true }] },
        ],
      },
      {
        id: 't.faltas.revision',
        titulo: 'Tres semanas después',
        disparo: { programado: true },
        cuando: [{ lugar: 'casa' }],
        aguanta: { dias: 5 },
        variantes: [
          { id: 'cumplio', si: [{ hecho: 'faltas', max: 1, sobreRecuerdo: 'faltas_antes' }, { marca: 't_prometio' }], texto: '«No has vuelto a faltar», dice {tutor.nombre}.', efectos: [{ relacion: 'tutor', confianza: 5 }, { fin: true }] },
          { id: 'no_cumplio', si: [], texto: '«Has vuelto a faltar».', efectos: [{ relacion: 'tutor', confianza: -8 }, { marca: 't_rompio' }, { fin: true }] },
        ],
      },
    ],
  }),
  suceso({ id: 't.comentario', titulo: 'Un comentario', categoria: 'menor', disparo: { cada: 'dia', prob: 0.5 }, cuando: [{ no: { marca: 't_mintio' } }, { no: { marca: 't_rompio' } }], repite: 'siempre', texto: 'Alguien dice algo de pasada.' }),
  suceso({ id: 't.muchos_descansos', titulo: 'Qué descansado', disparo: { umbral: [{ contador: 't.descansos', min: 3 }] }, repite: 'nunca', texto: 'Has descansado mucho.', efectos: [{ estado: 'gen.motivacion', mas: 1 }] }),
];

/** Módulo de prueba: aporta el catálogo, lanza la señal del colegio, apunta lo que el director pide a `relaciones` y fija los hechos. */
const prueba = (catalogo: AporteDeSucesos[] = CATALOGO, config: object[] = []): GameModule<{ relacion: CambioDeRelacionData[] }> =>
  defineModule<{ relacion: CambioDeRelacionData[] }>({
    id: 't',
    name: 'Prueba',
    initState: () => ({ relacion: [] }),
    aportes: { [APORTE_DE_SUCESOS]: catalogo, [APORTE_DE_CONFIG_DE_SUCESOS]: config },
    actions: [{ id: 't.aviso_del_colegio', name: 'Aviso', tags: ['prueba'], duration: 1, run: (ctx) => ctx.emit({ type: SHARED_EVENTS.FALTAS_EXCESIVAS, data: { faltas: dado.faltas, curso: 0, trimestre: 1 } }) }],
    on: { [SHARED_EVENTS.CAMBIO_DE_RELACION]: (ctx, ev) => ctx.updateState<{ relacion: CambioDeRelacionData[] }>((s) => ({ relacion: [...s.relacion, ev.data] })) },
    services: {
      [SUCESOS_DE_PRUEBA]: (): SucesosDePruebaService => ({
        hechos: { lugar: () => dado.lugar, presente: (p) => dado.presentes.includes(p), hecho: (n) => (n === 'faltas' ? dado.faltas : undefined), caracter: (e) => (e === 'honestidad' ? dado.honestidad : 0), perk: () => 'no' },
        papel: (n) => (n === 'tutor' ? 'madre' : null),
        persona: () => ({ nombre: 'tu madre', gender: 'f' }),
        tirada: () => dado.tirada,
        azar: () => dado.azar,
      }),
    },
  });

const nueva = (catalogo?: AporteDeSucesos[], config?: object[]) => {
  Object.assign(dado, { lugar: 'casa', presentes: ['madre'], faltas: 12, tirada: 'exito', honestidad: 0, azar: 1 });
  return Game.create([personaje, sucesos, prueba(catalogo, config)], { seed: 7 });
};
const svc = (g: Game) => g.service<SucesosService>(SERVICES.sucesos)!;
const delHilo = (g: Game) => svc(g).recuerdos().filter((r) => r.suceso.startsWith('t.faltas.'));
const estado = (g: Game) => g.moduleState<SucesosState>('sucesos');
const pasarDias = (g: Game, n: number) => {
  const hasta = g.time.day + n;
  // Una siesta tras otra (se puede a cualquier hora): 24 al día.
  while (g.time.day < hasta) expect(g.perform('gen.descansar').ok).toBe(true);
};

describe('el director de los sucesos', () => {
  it('se carga solo con el módulo base y, sin catálogo, no hace ni guarda nada', () => {
    const g = Game.create([personaje, sucesos], { seed: 7 });
    const antes = JSON.stringify(estado(g));
    for (let i = 0; i < 60; i++) g.perform('gen.descansar');
    expect(JSON.stringify(estado(g))).toBe(antes);
    expect(svc(g).pendientes()).toEqual([]);
  });

  it('el catálogo de prueba pasa la validación', () => {
    const g = nueva();
    const stats = new Map([...g.registry.stats].map(([id, s]) => [id, { category: s.def.category }]));
    expect(validarCatalogo([{ modulo: 't', aportes: CATALOGO }], { stats, modulos: new Set(['gen', 't', 'sucesos']) }).errores).toEqual([]);
  });

  it('una señal dispara un suceso, que queda pendiente con sus opciones y su texto concordado', () => {
    const g = nueva();
    g.perform('t.aviso_del_colegio');
    const [p] = svc(g).pendientes();
    expect(p).toMatchObject({ suceso: 't.faltas.charla', titulo: 'Han llamado del colegio', texto: 'Tu madre, muy seria: «Llevas 12 faltas».', reparto: { tutor: 'madre' } });
    expect(p.opciones.map((o) => [o.id, o.elegible])).toEqual([['prometer', true], ['mentir', true], ['callar', true]]);
    expect(p.opciones[1].pista).toMatch(/Arriesgado/);
    expect(g.preview(p.opciones[0].accion)).toMatchObject({ name: 'Prometer que no volverás a faltar', duration: 10, available: true });
  });

  it('un hilo entero: prometer, tres semanas, y la revisión según lo que haya pasado; se guarda y se carga a mitad', () => {
    for (const [faltasDespues, variante, confianza] of [[12, 'cumplio', 5], [16, 'no_cumplio', -8]] as const) {
      let g = nueva();
      g.perform('t.aviso_del_colegio');
      const estres = g.stat('gen.estres');
      expect(g.perform(svc(g).pendientes()[0].opciones[0].accion)).toMatchObject({ ok: true, duration: 10 });
      expect(g.stat('gen.estres')).toBeGreaterThan(estres);
      expect(svc(g).tiene('t_prometio')).toBe(true);
      expect(estado(g)).toMatchObject({ pendientes: [], hilos: [{ def: 't.faltas', reparto: { tutor: 'madre' }, recuerdos: { faltas_antes: 12 } }], programados: [{ suceso: 't.faltas.revision', dia: g.time.day + 21 }] });

      // Guardar y cargar a mitad del hilo: la memoria es JSON y sigue donde estaba.
      g = Game.load([personaje, sucesos, prueba()], JSON.parse(JSON.stringify(g.serialize())));
      dado.faltas = faltasDespues;
      pasarDias(g, 21);
      expect(estado(g)).toMatchObject({ hilos: [], programados: [] });
      expect(delHilo(g).map((r) => [r.suceso, r.opcion])).toEqual([['t.faltas.charla', 'prometer'], ['t.faltas.revision', undefined]]);
      expect(g.moduleState<{ relacion: CambioDeRelacionData[] }>('t').relacion.at(-1)).toMatchObject({ npcId: 'madre', confianza });
      expect(svc(g).tiene('t_rompio')).toBe(variante === 'no_cumplio');
      expect(g.log.some((l) => l.text.includes(variante === 'cumplio' ? 'No has vuelto a faltar' : 'Has vuelto a faltar'))).toBe(true);
      expect(svc(g).recuerdos('madre')).toHaveLength(2);
    }
  });

  it('si no es el momento, el suceso aguanta y sale cuando lo es; pasado su aguante, se pierde', () => {
    const g = nueva();
    dado.lugar = 'colegio';
    g.perform('t.aviso_del_colegio');
    expect(svc(g).pendientes()).toEqual([]);
    dado.lugar = 'casa';
    g.perform('gen.esperar');
    expect(svc(g).pendientes()).toHaveLength(1);

    const h = nueva();
    dado.lugar = 'colegio';
    h.perform('t.aviso_del_colegio');
    pasarDias(h, 5);
    dado.lugar = 'casa';
    h.perform('gen.esperar');
    expect(svc(h).pendientes()).toEqual([]);
    expect(estado(h).programados).toEqual([]);
  });

  it('nunca bloquea: si vence el plazo sin elegir, se aplica la opción por defecto', () => {
    const g = nueva();
    g.perform('t.aviso_del_colegio');
    expect(g.preview('gen.ocio')?.available).toBe(true);
    pasarDias(g, 2);
    expect(svc(g).pendientes()).toEqual([]);
    expect(delHilo(g)[0]).toMatchObject({ suceso: 't.faltas.charla', opcion: 'callar' });
    expect(g.moduleState<{ relacion: CambioDeRelacionData[] }>('t').relacion).toEqual([expect.objectContaining({ afinidad: -2 })]);
  });

  it('una tirada tiene dos ramas; la que sale mal castiga bloqueando acciones por etiqueta durante unos días', () => {
    const g = nueva();
    g.perform('t.aviso_del_colegio');
    dado.tirada = 'fallo';
    g.perform(svc(g).pendientes()[0].opciones[1].accion);
    expect(g.preview('gen.ocio')).toMatchObject({ available: false, reason: 'Estás castigado sin salir' });
    expect(g.preview('gen.descansar')?.available).toBe(true);
    pasarDias(g, 7);
    expect(g.preview('gen.ocio')?.available).toBe(true);

    const h = nueva();
    h.perform('t.aviso_del_colegio');
    const picardia = h.stat('gen.picardia');
    h.perform(svc(h).pendientes()[0].opciones[1].accion);
    expect(h.stat('gen.picardia')).toBeGreaterThan(picardia);
    expect(svc(h).tiene('t_mintio')).toBe(true);
    expect(h.preview('gen.ocio')?.available).toBe(true);
  });

  it('las opciones que no van con el carácter se presentan como diga la configuración', () => {
    const ver = (modo: string) => {
      const g = nueva(CATALOGO, [{ presentacion: { fueraDeCaracter: modo } }]);
      dado.honestidad = 40;
      g.perform('t.aviso_del_colegio');
      const o = svc(g).pendientes()[0].opciones[1];
      return [o.visible, o.elegible, g.preview(o.accion)?.available];
    };
    expect(ver('normales')).toEqual([true, true, true]);
    expect(ver('sombreadas')).toEqual([true, false, false]);
    expect(ver('ocultas')).toEqual([false, false, false]);
  });

  it('con números, cada consecuencia sale con el nombre del juego y nunca con su identificador', () => {
    const g = nueva(CATALOGO, [{ presentacion: { consecuencias: 'numeros' } }]);
    g.perform('t.aviso_del_colegio');
    const [p] = svc(g).pendientes();
    const nombre = (id: string) => g.registry.stats.get(id)!.def.name;
    expect(p.opciones[0].pista).toContain(`${nombre('gen.estres')} +4`);
    expect(p.opciones[1].pista).toContain(`entrena ${nombre('gen.picardia')}`);
    for (const o of p.opciones) expect(o.pista ?? '').not.toMatch(/\bgen\.|\bt\.|\btutor\b/);
    expect(p.opciones[0].pista).toContain('relación con tu madre: confianza +2');
    expect(p.opciones[2].pista).toMatch(/afinidad −2/);
  });

  it('con números también salen el estado de juego, la familia, el carácter y el dinero con «€», siempre con nombres legibles', () => {
    const catalogo: AporteDeSucesos[] = [
      suceso({
        id: 't.numeros',
        titulo: 'Una decisión',
        disparo: { al: 'clase.faltas_excesivas' },
        ejemploDeSeñal: { faltas: 12 },
        reparto: { tutor: { tipo: 'progenitor' } },
        cuando: [{ lugar: 'casa' }, { presente: 'tutor' }],
        texto: 'Hay que decidir.',
        plazo: { dias: 1, porDefecto: 'a' },
        opciones: [
          { id: 'a', texto: 'A', efectos: [{ estadoDeJugador: { moral: 3, forma: -2, fisica: -4, salud: 1 } }, { familia: 'tutor', apoyo: 2, expectativas: -1 }, { caracter: { honestidad: -3 } }, { estado: 'gen.dinero', mas: -5 }] },
          { id: 'b', texto: 'B', efectos: [{ estado: 'gen.dinero', mas: 10 }, { estadoDeJugador: { baja: 1 }, de: 'tutor' }] },
        ],
      }),
    ];
    const g = nueva(catalogo, [{ presentacion: { consecuencias: 'numeros' } }]);
    g.perform('t.aviso_del_colegio');
    const [p] = svc(g).pendientes();
    const nombre = (id: string) => g.registry.stats.get(id)!.def.name;
    expect(p.opciones[0].pista).toContain(`${nombre('gen.motivacion')} +3`);
    expect(p.opciones[0].pista).toContain(`${nombre('gen.forma')} −2`);
    expect(p.opciones[0].pista).toContain(`${nombre('gen.energia')} −4`);
    expect(p.opciones[0].pista).toContain(`${nombre('gen.salud')} +1`);
    expect(p.opciones[0].pista).toContain('familia (tu madre): apoyo +2, expectativas −1');
    expect(p.opciones[0].pista).toContain('honestidad −3');
    expect(p.opciones[0].pista).toContain('Dinero −5 €');
    expect(p.opciones[1].pista).toContain('Dinero +10 €');
    expect(p.opciones[1].pista).toContain('de tu madre');
    for (const o of p.opciones) expect(o.pista ?? '').not.toMatch(/\bgen\.|\bt\.|\btutor\b|estadoDeJugador|undefined/);
  });

  it('una opción elegible que no va con el carácter dice con qué choca solo en modo normales; la pista no cambia', () => {
    const ver = (modo: string) => {
      const g = nueva(CATALOGO, [{ presentacion: { fueraDeCaracter: modo } }]);
      dado.honestidad = 40;
      g.perform('t.aviso_del_colegio');
      const [p] = svc(g).pendientes();
      return [p.opciones[0].ejeEnContra, p.opciones[1].ejeEnContra, p.opciones[1].elegible, p.opciones[1].pista];
    };
    expect(ver('normales')).toEqual([undefined, 'honestidad', true, 'Arriesgado: puede salir mal']);
    expect(ver('sombreadas')).toEqual([undefined, undefined, false, 'Arriesgado: puede salir mal']);
  });

  it('los sucesos espontáneos respetan el cupo de su categoría, que es un dato editable', () => {
    const g = nueva();
    dado.azar = 0;
    pasarDias(g, 14);
    // Menores: como mucho 2 al día y 8 a la semana por defecto; este sale una vez al día (un suceso, un día).
    expect(svc(g).recuerdos().filter((r) => r.suceso === 't.comentario').length).toBeGreaterThanOrEqual(13);

    const h = nueva(CATALOGO, [{ cupo: { menor: { aLaSemana: 2 } } }]);
    dado.azar = 0;
    pasarDias(h, 14);
    const porSemana = new Map<number, number>();
    for (const r of svc(h).recuerdos().filter((x) => x.suceso === 't.comentario')) porSemana.set(Math.floor(r.dia / 7), (porSemana.get(Math.floor(r.dia / 7)) ?? 0) + 1);
    expect(Math.max(...porSemana.values())).toBe(2);
  });

  it('un contador declarado como dato cuenta acciones por etiqueta y un umbral se dispara una sola vez al cruzarse', () => {
    const g = nueva();
    pasarDias(g, 6);
    expect(svc(g).contador('t.descansos')).toBeGreaterThanOrEqual(6);
    expect(svc(g).recuerdos().filter((r) => r.suceso === 't.muchos_descansos')).toHaveLength(1);
  });

  it('el estado es JSON y la partida con sucesos es determinista', () => {
    const jugar = () => {
      const g = nueva();
      dado.azar = undefined;
      g.perform('t.aviso_del_colegio');
      g.perform(svc(g).pendientes()[0].opciones[0].accion);
      pasarDias(g, 30);
      return JSON.stringify(g.serialize());
    };
    const a = jugar();
    expect(jugar()).toBe(a);
    expect(JSON.parse(a).modules.sucesos.historia.length).toBeGreaterThan(2);
  });
});

describe('lo que pasa durante una actividad y lo que no se puede aplazar', () => {
  const opciones = (extra: object = {}) => [
    { id: 'responder', texto: 'Responder', efectos: [{ estado: 'gen.estres', mas: 1 }], ...extra },
    { id: 'callar', texto: 'Callar', efectos: [] },
  ];
  const en = (id: string, def: object) =>
    suceso({ id, titulo: id, disparo: { al: 'u.clase' }, repite: 'siempre', texto: 'Algo pasa.', plazo: { dias: 1, porDefecto: 'callar' }, opciones: opciones(), ...def } as Parameters<typeof suceso>[0]);
  /** Un módulo con una «clase» (la señal `u.clase`, que la config da por actividad) y otra acción cualquiera. */
  const clase = defineModule({
    id: 'u',
    name: 'Clase',
    initState: () => ({}),
    actions: [
      { id: 'u.clase', name: 'Clase', tags: ['clase'], duration: 50, run: (ctx) => ctx.emit({ type: 'u.clase', data: {} }) },
      { id: 'u.otra', name: 'Otra cosa', tags: [], duration: 5 },
    ],
  });
  const partida = (catalogo: AporteDeSucesos[]) => {
    const g = Game.create([personaje, sucesos, prueba(catalogo, [{ durante: ['u.clase'] }]), clase], { seed: 7 });
    dado.azar = 1;
    return g;
  };
  const elegida = (g: Game, id: string) => svc(g).recuerdos().find((r) => r.suceso === id)?.opcion;

  it('un suceso que sale durante una actividad no gasta minutos propios, ni sus opciones con «minutos» antiguos', () => {
    const g = partida([en('t.en_clase', {})]);
    expect(g.perform('u.clase').ok).toBe(true);
    const [p] = svc(g).pendientes();
    expect(p.opciones.map((o) => o.minutos)).toEqual([0, 0]);
    expect(g.preview(p.opciones[0].accion)).toMatchObject({ duration: 0 });
    const antes = g.time.minute;
    expect(g.perform(p.opciones[0].accion)).toMatchObject({ ok: true, duration: 0 });
    expect(g.time.minute).toBe(antes);
  });

  it('con `durante: false` es otra cosa (quedarse a hablar después): sus opciones gastan los minutos que digan', () => {
    const g = partida([en('t.despues', { durante: false, opciones: opciones({ minutos: 5 }) })]);
    g.perform('u.clase');
    const [p] = svc(g).pendientes();
    expect(p.opciones[0].minutos).toBe(5);
    expect(g.perform(p.opciones[0].accion)).toMatchObject({ ok: true, duration: 5 });
  });

  it('lo que no es durante una actividad sigue gastando los minutos de su opción', () => {
    const g = nueva();
    g.perform('t.aviso_del_colegio');
    expect(svc(g).pendientes()[0].opciones[0].minutos).toBe(10);
  });

  it('lo que se pregunta en el momento no se puede aplazar: si haces otra cosa sin responder, se aplica la opción por defecto', () => {
    const g = partida([en('t.pregunta', {})]);
    g.perform('u.clase');
    expect(svc(g).pendientes()[0]).toMatchObject({ urgencia: 'ahora', aplazable: false });
    g.perform('u.otra');
    expect(svc(g).pendientes()).toEqual([]);
    expect(elegida(g, 't.pregunta')).toBe('callar');
  });

  it('responder no hace perder otra pregunta que esperaba, y lo recién abierto en la misma acción sigue ahí', () => {
    const g = partida([en('t.una', {}), en('t.dos', {})]);
    g.perform('u.clase');
    expect(svc(g).pendientes()).toHaveLength(2);
    g.perform(svc(g).pendientes()[0].opciones[0].accion);
    expect(svc(g).pendientes()).toHaveLength(1);
    g.perform(svc(g).pendientes()[0].opciones[0].accion);
    expect(svc(g).pendientes()).toEqual([]);
    expect(svc(g).recuerdos().filter((r) => r.opcion === 'responder')).toHaveLength(2);
  });

  it('lo que puede esperar (aplazable o pendiente) sigue ahí tras otras acciones, hasta que vence su plazo', () => {
    const g = partida([suceso({ id: 't.aviso', titulo: 'Un aviso', disparo: { al: 'u.clase' }, repite: 'siempre', texto: 'Te escriben.', urgencia: 'aplazable', durante: false, plazo: { dias: 1, porDefecto: 'callar' }, opciones: opciones() })]);
    g.perform('u.clase');
    expect(svc(g).pendientes()[0]).toMatchObject({ urgencia: 'aplazable', aplazable: true });
    g.perform('u.otra');
    g.perform('u.otra');
    expect(svc(g).pendientes()).toHaveLength(1);
    pasarDias(g, 2);
    expect(svc(g).pendientes()).toEqual([]);
    expect(elegida(g, 't.aviso')).toBe('callar');
  });

  it('un suceso durante una actividad nunca es aplazable, aunque diga `aplazable`: la validación lo rechaza', () => {
    const errores = (s: AporteDeSucesos[]) => validarCatalogo([{ modulo: 't', aportes: s }]).errores.join(' | ');
    const base = { titulo: 'x', disparo: { al: 'clase.asistida' }, ejemploDeSeñal: { asignatura: 'a', tarde: 0 }, texto: 'x', plazo: { dias: 1, porDefecto: 'a' } } as const;
    expect(errores([suceso({ ...base, id: 't.a', urgencia: 'aplazable', opciones: [{ id: 'a', texto: 'A' }] })])).toMatch(/durante una actividad/);
    expect(errores([suceso({ ...base, id: 't.b', opciones: [{ id: 'a', texto: 'A', minutos: 5 }] })])).toMatch(/gasta minutos/);
    expect(errores([suceso({ ...base, id: 't.c', durante: false, opciones: [{ id: 'a', texto: 'A', minutos: 5 }] })])).toBe('');
    expect(errores([suceso({ ...base, id: 't.d', disparo: { al: 'u.x' }, urgencia: 'pendiente', reparto: { quien: { rol: 'companero', presente: true } }, opciones: [{ id: 'a', texto: 'A' }] })])).toMatch(/está presente/);
  });
});
