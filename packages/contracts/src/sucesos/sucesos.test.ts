import { describe, expect, it } from 'vitest';
import {
  CONFIG_DE_SUCESOS,
  analizarTexto,
  compilarCatalogo,
  componerTexto,
  configDeSucesos,
  cumple,
  dificultadDeTirada,
  elegirPorCaracter,
  encajaConCaracter,
  evaluarOpcion,
  hilo,
  ordenarCondiciones,
  probabilidadDeExito,
  suceso,
  validarCatalogo,
  type AporteDeSucesos,
  type ContextoDeCondicion,
  type LectorDeHechos,
  type SucesoDef,
} from './index';

const lector = (x: Partial<LectorDeHechos> = {}): LectorDeHechos => ({
  stat: () => undefined,
  hecho: () => undefined,
  periodo: () => 'clase',
  diaDeLaSemana: () => 0,
  minutoDelDia: () => 600,
  lugar: () => 'casa',
  presente: () => false,
  relacion: () => undefined,
  familia: () => undefined,
  perk: () => 'no',
  caracter: () => 0,
  enClub: () => false,
  ...x,
});
const ctx = (x: Partial<ContextoDeCondicion> = {}): ContextoDeCondicion => ({ hechos: lector(), reparto: {}, marca: () => false, contador: () => 0, recuerdo: () => undefined, ...x });

describe('textos de los sucesos', () => {
  const datos = { yo: { nombre: 'Alex', gender: 'm' as const }, papeles: { tutor: { nombre: 'tu madre', gender: 'f' as const } }, señal: { faltas: 12 } };

  it('concuerdan con el género de cada papel y ponen mayúscula cuando el campo la lleva', () => {
    expect(componerTexto('{tutor.Nombre} está seri{tutor:o|a}: llevas {señal.faltas} faltas, castigad{yo:o|a}.', datos)).toBe('Tu madre está seria: llevas 12 faltas, castigado.');
    expect(componerTexto('Con {tutor.nombre}: {tutor:él|ella}.', { ...datos, papeles: { tutor: { nombre: 'tu padre', gender: 'm' } } })).toBe('Con tu padre: él.');
  });

  it('avisan de las llaves mal escritas y fallan si falta alguien', () => {
    expect(analizarTexto('{tutor.nombre} {tutor:o|a} {pais}').problemas).toEqual([]);
    expect(analizarTexto('hola {tutor').problemas).toHaveLength(1);
    expect(analizarTexto('{tutor:o}').problemas).toHaveLength(1);
    expect(analizarTexto('{cosa}').problemas).toHaveLength(1);
    expect(() => componerTexto('{amigo.nombre}', datos)).toThrow(/amigo/);
  });
});

describe('condiciones', () => {
  it('miran stats, calendario, sitio, memoria y la señal', () => {
    const c = ctx({ hechos: lector({ stat: (id) => (id === 'gen.salud' ? 10 : undefined), hecho: (n) => (n === 'faltas' ? 14 : undefined) }), marca: (m) => m === 'prometio', contador: () => 21, recuerdo: () => 12, señal: { faltas: 12, tags: ['cardio'] } });
    expect(cumple({ stat: 'gen.salud', max: 15 }, c)).toBe(true);
    expect(cumple({ stat: 'gen.otra', max: 15 }, c)).toBe(false);
    expect(cumple({ periodo: ['clase', 'verano'] }, c)).toBe(true);
    expect(cumple({ hora: { desde: 700 } }, c)).toBe(false);
    expect(cumple({ lugar: 'casa' }, c)).toBe(true);
    expect(cumple({ marca: 'prometio' }, c)).toBe(true);
    expect(cumple({ no: { marca: 'prometio' } }, c)).toBe(false);
    expect(cumple({ contador: 'x.c', min: 20 }, c)).toBe(true);
    expect(cumple({ señal: 'faltas', min: 12 }, c)).toBe(true);
    expect(cumple({ señal: 'tags', incluye: 'cardio' }, c)).toBe(true);
    expect(cumple({ hecho: 'faltas', max: 1, sobreRecuerdo: 'r' }, c)).toBe(false);
    expect(cumple({ hecho: 'faltas', max: 2, sobreRecuerdo: 'r' }, c)).toBe(true);
    expect(cumple({ alguna: [{ lugar: 'parque' }, { marca: 'prometio' }] }, c)).toBe(true);
  });

  it('las de personas usan el reparto; sin nadie en el papel son falsas', () => {
    const c = ctx({ reparto: { tutor: 'madre' }, hechos: lector({ presente: (p) => p === 'madre', relacion: () => ({ afinidad: 30, confianza: 50, estado: 'conocido' }), perk: (p) => (p === 'pulmones_grandes' ? 'latente' : 'no') }), marca: (m, p) => m === 'planton' && p === 'madre' });
    expect(cumple({ presente: 'tutor' }, c)).toBe(true);
    expect(cumple({ presente: 'amigo' }, c)).toBe(false);
    expect(cumple({ relacion: 'tutor', afinidad: { min: 20 }, estado: ['conocido', 'amigo'] }, c)).toBe(true);
    expect(cumple({ marca: 'planton', de: 'tutor' }, c)).toBe(true);
    expect(cumple({ perk: 'pulmones_grandes', revelado: false }, c)).toBe(true);
    expect(cumple({ perk: 'pulmones_grandes', revelado: true }, c)).toBe(false);
    expect(cumple({ perk: 'gigante' }, c)).toBe(false);
  });

  it('se ordenan con las baratas delante', () => {
    expect(ordenarCondiciones([{ presente: 'a' }, { stat: 's' }, { marca: 'm' }]).map((c) => Object.keys(c)[0])).toEqual(['marca', 'stat', 'presente']);
  });
});

describe('opciones, tiradas y carácter', () => {
  it('la tirada va del 5 % al 95 % y es del 50 % con el nivel igual a la dificultad', () => {
    expect(probabilidadDeExito(45, 45)).toBe(0.5);
    expect(probabilidadDeExito(55, 45)).toBeCloseTo(0.65);
    expect(probabilidadDeExito(0, 100)).toBe(0.05);
    expect(probabilidadDeExito(100, 0)).toBe(0.95);
  });

  it('los ajustes suben o bajan la dificultad si se cumplen sus condiciones, se suman y no se salen de 0 a 100', () => {
    const c = (afinidad: number, valor: number): ContextoDeCondicion => ctx({ reparto: { jefe: 'x' }, hechos: lector({ relacion: () => ({ afinidad, confianza: 0, estado: 'conocido' }), hecho: () => valor }) });
    const t = { con: 'gen.comunicacion', dificultad: 50, ajustes: [{ si: [{ relacion: 'jefe', afinidad: { min: 20 } }], mas: -5 }, { si: [{ hecho: 'h', max: -3 }], mas: 8 }] };
    expect(dificultadDeTirada(t, c(0, 0))).toBe(50);
    expect(dificultadDeTirada(t, c(25, 0))).toBe(45);
    expect(dificultadDeTirada(t, c(25, -5))).toBe(53);
    expect(dificultadDeTirada({ ...t, dificultad: 98 }, c(0, -5))).toBe(100);
    expect(dificultadDeTirada({ con: 'x', dificultad: 3, ajustes: [{ si: [{ marca: 'm' }], mas: -9 }] }, ctx({ marca: () => true }))).toBe(0);
    expect(dificultadDeTirada({ con: 'x', dificultad: 40 }, c(0, 0))).toBe(40);
  });

  const mentir = { id: 'mentir', texto: 'Mentir', caracter: { honestidad: -3 }, requiere: [{ stat: 'gen.picardia', min: 12 }] };
  const honesto = (picardia: number) => ctx({ hechos: lector({ stat: () => picardia, caracter: (e) => (e === 'honestidad' ? 40 : 0) }) });

  it('una opción que no encaja con el carácter se presenta según la configuración', () => {
    const p = CONFIG_DE_SUCESOS.presentacion;
    expect(encajaConCaracter({ honestidad: -3 }, () => 40, p)).toEqual({ encaja: false, eje: 'honestidad' });
    expect(encajaConCaracter({ honestidad: -3 }, () => 10, p)).toEqual({ encaja: true });
    expect(evaluarOpcion(mentir, honesto(30), p)).toMatchObject({ visible: true, elegible: true, ejeEnContra: 'honestidad' });
    expect(evaluarOpcion(mentir, honesto(30), { ...p, fueraDeCaracter: 'sombreadas' })).toMatchObject({ visible: true, elegible: false, motivo: 'caracter' });
    expect(evaluarOpcion(mentir, honesto(30), { ...p, fueraDeCaracter: 'ocultas' })).toMatchObject({ visible: false, elegible: false });
    expect(evaluarOpcion(mentir, honesto(5), p)).toMatchObject({ visible: true, elegible: false, motivo: 'requisito' });
  });

  it('quien decide por su carácter elige más lo que va con él', () => {
    const ops = [mentir, { id: 'reconocer', texto: 'Reconocerlo', caracter: { honestidad: 3 } }];
    const veces = (honestidad: number) => Array.from({ length: 100 }, (_, i) => elegirPorCaracter(ops, ['mentir', 'reconocer'], () => honestidad, i / 100)).filter((x) => x === 'reconocer').length;
    expect(veces(45)).toBeGreaterThan(90);
    expect(veces(-45)).toBeLessThan(10);
    expect(veces(0)).toBe(50);
    expect(elegirPorCaracter(ops, [], () => 0, 0.5)).toBeUndefined();
  });

  it('la configuración es un dato que se cambia por partes', () => {
    const c = configDeSucesos([{ cupo: { menor: { alDia: 5 } } }, { presentacion: { fueraDeCaracter: 'ocultas' } }]);
    expect(c.cupo).toEqual({ base: { alDia: 1, aLaSemana: 4 }, deporte: { alDia: 1, aLaSemana: 2 }, menor: { alDia: 5, aLaSemana: 8 } });
    expect(c.presentacion.fueraDeCaracter).toBe('ocultas');
    expect(c.pnj.clases).toEqual(['lesion']);
  });
});

describe('catálogo y validación', () => {
  const charla: SucesoDef = {
    id: 'familia.faltas.charla',
    titulo: 'Han llamado del colegio',
    disparo: { al: 'clase.faltas_excesivas' },
    ejemploDeSeñal: { faltas: 12 },
    cuando: [{ lugar: 'casa' }, { presente: 'tutor' }],
    texto: '{tutor.Nombre}, seri{tutor:o|a}: «Llevas {señal.faltas} faltas».',
    plazo: { dias: 1, porDefecto: 'callar' },
    opciones: [
      { id: 'prometer', texto: 'Prometer', caracter: { honestidad: 2 }, efectos: [{ marca: 'prometio' }, { recuerda: { faltas_antes: 'faltas' } }, { programa: 'familia.faltas.revision', en: { dias: 21 } }] },
      { id: 'callar', texto: 'Callar', efectos: [{ estado: 'gen.estres', mas: 4 }, { fin: true }] },
    ],
  };
  const revision: SucesoDef = {
    id: 'familia.faltas.revision',
    titulo: 'Tres semanas después',
    disparo: { programado: true },
    variantes: [
      { id: 'cumplio', si: [{ hecho: 'faltas', max: 1, sobreRecuerdo: 'faltas_antes' }, { marca: 'prometio' }], texto: 'Bien, {tutor.nombre}.', efectos: [{ relacion: 'tutor', confianza: 5 }, { fin: true }] },
      { id: 'no', si: [], texto: 'Mal.', efectos: [{ fin: true }] },
    ],
  };
  const faltas = hilo({ id: 'familia.faltas', nombre: 'Las faltas', requiere: ['estudios'], reparto: { tutor: { tipo: 'progenitor' } }, sucesos: [charla, revision] });
  const validar = (aportes: AporteDeSucesos[], modulo = 'familia') => validarCatalogo([{ modulo, aportes }], { stats: new Map([['gen.estres', { category: 'estado' }], ['gen.picardia', { category: 'generica' }]]), modulos: new Set(['gen', 'familia', 'estudios']) });
  const con = (cambios: Partial<SucesoDef>, base = charla) => validar([hilo({ id: 'familia.faltas', nombre: 'x', reparto: { tutor: { tipo: 'progenitor' } }, sucesos: [{ ...base, ...cambios }, revision] })]).errores;

  it('un hilo bien escrito no tiene errores', () => {
    expect(validar([faltas])).toEqual({ errores: [], avisos: [] });
  });

  it('compila el reparto del hilo en cada suceso y deja fuera lo que pide un módulo que no está', () => {
    const cat = compilarCatalogo([faltas]);
    expect(cat.sucesos.get('familia.faltas.revision')).toMatchObject({ reparto: { tutor: { tipo: 'progenitor' } }, requiere: ['estudios'] });
    expect(compilarCatalogo([faltas], (m) => m !== 'estudios').sucesos.size).toBe(0);
  });

  it('caza cada clase de error con un mensaje que dice dónde', () => {
    expect(validar([faltas], 'estudios').errores[0]).toMatch(/debe empezar por «estudios\.»/);
    expect(validar([faltas, suceso({ ...charla, opciones: undefined, plazo: undefined })]).errores).toContainEqual(expect.stringMatching(/id repetido/));
    expect(con({ plazo: undefined })).toContainEqual(expect.stringMatching(/no tiene plazo/));
    expect(con({ plazo: { dias: 1, porDefecto: 'otra' } })).toContainEqual(expect.stringMatching(/por defecto.*no existe/));
    expect(con({ texto: 'Hola {amigo.nombre}' })).toContainEqual(expect.stringMatching(/papel «amigo»/));
    expect(con({ texto: 'Hola {tutor' })).toContainEqual(expect.stringMatching(/llave/));
    expect(con({ cuando: [{ stat: 'gen.nada', min: 1 }] })).toContainEqual(expect.stringMatching(/«gen\.nada», que no existe/));
    expect(con({ cuando: [{ marca: 'fantasma' }] })).toContainEqual(expect.stringMatching(/marca «fantasma», que ningún suceso pone/));
    expect(con({ cuando: [{ contador: 'familia.nada', min: 1 }] })).toContainEqual(expect.stringMatching(/contador/));
    expect(con({ cuando: [{ perk: 'alas' }] })).toContainEqual(expect.stringMatching(/perk «alas»/));
    expect(con({ cuando: [{ hecho: 'futbol.goles', min: 1 }] })).toContainEqual(expect.stringMatching(/requiere: \['futbol'\]/));
    expect(con({ efectos: [{ estado: 'gen.picardia', mas: 1 }] })).toContainEqual(expect.stringMatching(/no es una stat de estado/));
    expect(con({ efectos: [{ entrena: 'gen.estres', cantidad: 1 }] })).toContainEqual(expect.stringMatching(/no se entrena/));
    expect(con({ efectos: [{ emite: 'familia.algo' }] })).toContainEqual(expect.stringMatching(/no es una señal compartida/));
    expect(con({ efectos: [{ programa: 'familia.nada', en: { dias: 1 } }] })).toContainEqual(expect.stringMatching(/no está en el catálogo/));
    expect(con({ efectos: [{ caracter: { valentia: 1 } }] })).toContainEqual(expect.stringMatching(/eje de carácter/));
    expect(con({ opciones: [{ id: 'callar', texto: 'x', tirada: { con: 'gen.picardia', dificultad: 40 } }] })).toContainEqual(expect.stringMatching(/necesita «exito» y «fallo»/));
    expect(con({ disparo: { cada: 'dia', prob: 2 } })).toContainEqual(expect.stringMatching(/probabilidad/));
    expect(con({ opciones: [charla.opciones![1]] })).toContainEqual(expect.stringMatching(/«programado» pero ningún suceso lo programa/));
  });

  it('distingue los eventos base de los deportivos: un deporte aporta solo los suyos, marcados, y compiten por otro cupo', () => {
    const gol: SucesoDef = { id: 'futbol.gol', titulo: 'Un gol', disparo: { cada: 'semana', prob: 0.1 }, texto: 'Marcas.' };
    const entorno = { stats: new Map(), modulos: new Set(['futbol', 'familia']), deportes: new Set(['futbol']) };
    expect(validarCatalogo([{ modulo: 'futbol', aportes: [suceso({ ...gol, deporte: 'futbol' })] }], entorno).errores).toEqual([]);
    expect(validarCatalogo([{ modulo: 'futbol', aportes: [suceso(gol)] }], entorno).errores).toContainEqual(expect.stringMatching(/evento deportivo/));
    expect(validarCatalogo([{ modulo: 'familia', aportes: [suceso({ ...gol, id: 'familia.gol', deporte: 'futbol' })] }], entorno).errores).toContainEqual(expect.stringMatching(/lo aporta «familia»/));
    const cat = compilarCatalogo([suceso({ ...gol, deporte: 'futbol' }), suceso({ ...gol, id: 'x.a' }), suceso({ ...gol, id: 'x.b', categoria: 'menor', deporte: 'futbol' })]);
    expect([...cat.sucesos.values()].map((x) => [x.origen, x.cupo, x.requiere])).toEqual([['deporte', 'deporte', ['futbol']], ['base', 'base', []], ['deporte', 'menor', ['futbol']]]);
    expect(compilarCatalogo([suceso({ ...gol, deporte: 'futbol' })], (m) => m !== 'futbol').sucesos.size).toBe(0);
  });

  it('un papel opcional solo se puede nombrar donde es seguro que hay alguien', () => {
    const s: SucesoDef = { id: 'gen.aviso', titulo: 'Aviso', disparo: { cada: 'semana', prob: 0.2 }, reparto: { entrenador: { rol: 'entrenador', opcional: true } }, variantes: [{ id: 'con', si: [{ papel: 'entrenador' }], texto: '{entrenador.Nombre} te para.' }, { id: 'sin', si: [], texto: 'Te das cuenta.' }] };
    expect(validar([suceso(s)], 'gen').errores).toEqual([]);
    expect(validar([suceso({ ...s, variantes: undefined, texto: '{entrenador.Nombre} te para.' })], 'gen').errores).toContainEqual(expect.stringMatching(/papel opcional/));
  });
});
