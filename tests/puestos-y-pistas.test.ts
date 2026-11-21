import { describe, expect, it, vi } from 'vitest';
import {
  type PistasDePuestos,
  SERVICES,
  familiaDePuesto,
  familiasDePuestos,
  fraseDeEntrenamiento,
  fraseDeLectura,
  fraseDelPorque,
  nacimientoParaEdad,
  pesosDeFamilia,
  valoresPorFamilia,
  type ReadContext,
  type NpcDirectory,
} from '@ds/contracts';
import { PUESTOS_DE_FUTBOL, futbol } from '@ds/mod-futbol';
import { elegirEntrenamiento, utilidadDeUnEntreno, type EntrenoRecomendable } from '@ds/kit-deporte';
import { MODULOS, nuevaPartida } from '@ds/game';
import { advanceToWeek } from '@ds/core';
import { AZAR_DEL_CONSEJO, consejoDeUnProfesor, lecturaDeUnPuesto, type Npc, type PoblacionGuardada } from '@ds/mod-npcs';

vi.setConfig({ testTimeout: 240000, hookTimeout: 240000 });

/**
 * Puestos sin lado, nombres y pistas (`docs/ANEXO_PUESTOS.md` §6 y §7, `docs/relevo/puestos-y-pistas.md`): el consejo compara con los niños de su edad y consigo mismo; las recomendaciones van por puesto sin
 * lado; el porqué, «Preguntar por un puesto» y el entrenador que recomienda entrenamientos se apoyan en datos del deporte, sin cifras.
 */

const P = PUESTOS_DE_FUTBOL;
const IDS = P.puestos.map((p) => p.id);

describe('los puestos sin lado y los nombres (datos del fútbol)', () => {
  it('cada uno de los 16 puestos está en una sola familia, y una familia junta como mucho los dos lados del mismo puesto', () => {
    const todos = familiasDePuestos(P).flatMap((f) => f.puestos);
    expect([...todos].sort()).toEqual([...IDS].sort());
    for (const f of familiasDePuestos(P)) {
      expect(f.puestos.length).toBeLessThanOrEqual(2);
      if (f.puestos.length === 2) expect(f.puestos.map((p) => p.slice(1)).every((x) => x === f.puestos[0].slice(1))).toBe(true);
      expect(f.nombre).not.toMatch(/izquierd|derech/i);
    }
    expect(familiasDePuestos(P).map((f) => f.id)).toHaveLength(11);
  });

  it('LCR/RCR se llaman Interior, LM/RM Medio de banda y no queda ningún «carrilero»; los ids no cambian', () => {
    const nombre = (id: string) => P.puestos.find((p) => p.id === id)!.nombre;
    expect(nombre('LCR')).toBe('Interior izquierdo');
    expect(nombre('RCR')).toBe('Interior derecho');
    expect(nombre('LM')).toBe('Medio de banda izquierdo');
    expect(nombre('RM')).toBe('Medio de banda derecho');
    expect(P.puestos.map((p) => p.nombre).join(' ')).not.toMatch(/carrilero/i);
    expect(familiaDePuesto(P, 'RCR')?.nombre).toBe('Interior');
    expect(familiaDePuesto(P, 'LM')?.nombre).toBe('Medio de banda');
  });

  it('los pesos de una familia son la media de los de sus puestos y suman 1; lo que vale en una familia es la media de sus puestos', () => {
    for (const f of familiasDePuestos(P)) expect(Object.values(pesosDeFamilia(P, f)).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    const valores = Object.fromEntries(IDS.map((id) => [id, id === 'LB' ? 10 : id === 'RB' ? 12 : 5]));
    expect(valoresPorFamilia(P, valores).lateral).toBe(11);
    expect(valoresPorFamilia(P, valores).portero).toBe(5);
  });

  it('un deporte sin familias (partidas anteriores) trata cada puesto como su familia', () => {
    const sin = { ...P, familias: undefined };
    expect(familiasDePuestos(sin)).toHaveLength(16);
    expect(familiaDePuesto(sin, 'LB')?.puestos).toEqual(['LB']);
  });

  it('el deporte sabe decir (sin cifras) todas las habilidades y capacidades que pesan en algún puesto', () => {
    const stats = new Set(P.puestos.flatMap((p) => Object.keys(p.pesos)));
    for (const s of stats) {
      const c = P.pistas!.cualidades[s];
      expect(c, s).toBeDefined();
      expect(c.tiene + c.falta).not.toMatch(/\d/);
    }
  });
});

// ------------------------------------------------------------------------------------------------ el consejo con fakes (sin crear una partida)

const DIA = 100;
const stats: Record<string, number> = {};
const yo = (_puestos: Record<string, number>): ReadContext =>
  ({
    time: { day: 3 },
    stat: (id: string) => stats[id] ?? 10,
    service: (id: string) => (id === SERVICES.identidad ? { view: () => ({ seasonAge: 8, leftHanded: false }) } : undefined),
  }) as unknown as ReadContext;
const rendimientoDe = (puestos: Record<string, number>) => new Map([['futbol', Object.assign(() => 50, { puestos: () => puestos })]]);
const pob = { deporte: 'futbol', nombre: 'fútbol', puestos: P, equipos: [], nombresDeClub: {}, primero: true } as unknown as PoblacionGuardada;
const companero = (i: number, puestos: Record<string, number>): Npc =>
  ({ id: `n${i}`, name: `n${i}`, role: 'rival', gender: 'm', tags: [], levels: { futbol: 50 }, deporte: 'futbol', genetica: {}, nacimiento: nacimientoParaEdad(`n${i}`, 8, DIA), vp: { futbol: { valor: 50, puestos } } }) as unknown as Npc;
const todos = (v: number, extra: Record<string, number> = {}): Record<string, number> => ({ ...Object.fromEntries(IDS.map((id) => [id, v])), ...extra });

describe('el consejo del profesor compara con los niños de su edad y consigo mismo', () => {
  // Los de su edad son grandes porteros (30) y flojos de extremo (5). Él vale 12 de portero y 9 de extremo: en valor absoluto sería portero; frente a los suyos, extremo.
  const grupo = Array.from({ length: 10 }, (_, i) => companero(i, todos(10, { GK: 30, LW: 5, RW: 5 })));
  const mios = todos(8, { GK: 12, LW: 9, RW: 9 });

  it('un puesto en que vale más que los de su edad sube, aunque en números absolutos valga menos que en otro', () => {
    const [c] = consejoDeUnProfesor(yo(mios), grupo, [pob], rendimientoDe(mios) as never, DIA);
    expect(c.puestos.map((p) => p.id)).toContain('extremo');
    expect(c.puestos.map((p) => p.id)).not.toContain('portero');
  });

  it('los puestos son familias sin lado: tres distintos y nunca el mismo puesto de los dos lados', () => {
    const [c] = consejoDeUnProfesor(yo(mios), grupo, [pob], rendimientoDe(mios) as never, DIA);
    expect(c.puestos).toHaveLength(3);
    expect(new Set(c.puestos.map((p) => p.id)).size).toBe(3);
    for (const p of c.puestos) expect(familiasDePuestos(P).map((f) => f.id)).toContain(p.id);
    for (const p of c.puestos) expect(p.nombre).not.toMatch(/izquierd|derech/i);
  });

  it('sin nadie de su edad con quien compararse, cuenta lo que destaca frente a sí mismo', () => {
    const solo = todos(8, { GK: 30 });
    const [c] = consejoDeUnProfesor(yo(solo), [], [pob], rendimientoDe(solo) as never, DIA);
    expect(c.puestos[0].id).toBe('portero');
  });

  it('se mantiene el azar de ±2 puntos (estable el mismo día) y el consejo es el mismo si se pregunta dos veces', () => {
    expect(AZAR_DEL_CONSEJO).toBe(2);
    const a = consejoDeUnProfesor(yo(mios), grupo, [pob], rendimientoDe(mios) as never, DIA);
    const b = consejoDeUnProfesor(yo(mios), grupo, [pob], rendimientoDe(mios) as never, DIA);
    expect(b).toEqual(a);
  });

  it('el porqué está en cualidades escritas por el deporte y sin cifras', () => {
    const [c] = consejoDeUnProfesor(yo(mios), grupo, [pob], rendimientoDe(mios) as never, DIA);
    expect(c.pistas).toBe(P.pistas);
    const frase = fraseDelPorque(c)!;
    expect(frase).not.toMatch(/\d/);
    expect(frase.length).toBeGreaterThan(10);
  });
});

describe('la lectura de un puesto («Preguntar por un puesto»)', () => {
  const grupo = Array.from({ length: 10 }, (_, i) => companero(i, todos(10, { GK: 20, LW: 20, RW: 20, LB: 4, RB: 4 })));
  const lee = (mios: Record<string, number>, familia: string, compañeros = grupo) => lecturaDeUnPuesto(yo(mios), compañeros, [pob], rendimientoDe(mios) as never, DIA, 'futbol', familia)!;

  it('según lo cerca que estás de los de tu edad: ya, cerca, lejos, y sin datos si no hay con quién compararse', () => {
    expect(lee(todos(10, { GK: 25 }), 'portero').nivel).toBe('ya');
    expect(lee(todos(10, { GK: 18 }), 'portero').nivel).toBe('lejos');
    expect(lee(todos(10, { LB: 4.5, RB: 4.5 }), 'lateral').nivel).toBe('ya');
    expect(lee(todos(10, { GK: 25 }), 'portero', grupo.slice(0, 2)).nivel).toBe('sinDatos');
  });

  it('acepta el id de un puesto (RW) como el de su familia (extremo), y lo que dice no lleva cifras', () => {
    const mios = todos(10, { GK: 25 });
    expect(lee(mios, 'RW').familia.id).toBe('extremo');
    const l = lee(mios, 'portero');
    const frase = fraseDeLectura(l)!;
    expect(frase).not.toMatch(/\d/);
    expect(frase).toMatch(/portero/);
  });

  it('lo que te frena sale de lo que más pesa en el puesto y más lejos está de lo normal; lo que te falta, en palabras del deporte', () => {
    const l = lee(todos(10, { GK: 25 }), 'portero');
    for (const s of l.frenan) expect(P.puestos.find((p) => p.id === 'GK')!.pesos[s]).toBeGreaterThan(0);
    for (const t of l.falta) expect(Object.values(P.pistas!.cualidades).map((c) => c.falta)).toContain(t);
    for (const t of l.tiene) expect(Object.values(P.pistas!.cualidades).map((c) => c.tiene)).toContain(t);
  });
});

describe('los textos: plantillas del deporte con el género de quien habla', () => {
  const pistas: PistasDePuestos = {
    cualidades: {},
    porque: { conMotivo: '{quien:Él|Ella} dice: {señal.tiene}.', sinMotivo: 'Nada.' },
    lectura: { ya: 'ya {señal.puesto}', cerca: '{quien:El profesor|La profesora}: de {señal.puesto} {señal.tiene}, pero {señal.falta}', lejos: 'lejos {señal.falta}', sinDatos: 'sin datos' },
    entrenamiento: { recomienda: '«{señal.entreno}» para {señal.falta}', sinEntreno: 'sin entreno {señal.falta}', yaEntrenas: 'vas bien' },
  };
  const l = (nivel: 'ya' | 'cerca' | 'lejos' | 'sinDatos', tiene: string[], falta: string[]) => ({ deporte: 'x', familia: { id: 'f', nombre: 'Portero' }, nivel, tiene, falta, frenan: [], pistas });

  it('concuerda con quien habla (profesor o profesora) y une las cualidades con «y»', () => {
    expect(fraseDeLectura(l('cerca', ['a', 'b'], ['c']), { nombre: 'Luis', gender: 'm' })).toBe('El profesor: de portero a y b, pero c');
    expect(fraseDeLectura(l('cerca', ['a'], ['c']), { nombre: 'Ana', gender: 'f' })).toBe('La profesora: de portero a, pero c');
    expect(fraseDelPorque({ tiene: ['a', 'b'], pistas }, { nombre: 'Ana', gender: 'f' })).toBe('Ella dice: a y b.');
    expect(fraseDelPorque({ tiene: [], pistas })).toBe('Nada.');
  });

  it('si falta con qué completar la frase de un nivel, usa la del siguiente (cerca sin faltas es ya; lejos sin faltas, sin datos)', () => {
    expect(fraseDeLectura(l('cerca', ['a'], []))).toBe('ya portero');
    expect(fraseDeLectura(l('lejos', [], []))).toBe('sin datos');
  });

  it('el entrenador recomienda por nombre, o dice que vas bien, o que nada lo sube', () => {
    expect(fraseDeEntrenamiento(pistas, 'Portero', ['ser rápido'], 'Entrenar de portero')).toBe('«Entrenar de portero» para ser rápido');
    expect(fraseDeEntrenamiento(pistas, 'Portero', [], undefined)).toBe('vas bien');
    expect(fraseDeEntrenamiento(pistas, 'Portero', ['x'], undefined)).toBe('sin entreno x');
  });
});

describe('el entrenador recomienda entrenamientos con los datos de lo que sube cada uno, no con un desplegable fijo', () => {
  const e = (id: string, entrena: [string, number][]): EntrenoRecomendable => ({ id, nombre: id, entrena: entrena.map(([stat, amount]) => ({ stat, amount })) });
  const catalogo = [e('porteria', [['futbol.reflejos', 2], ['futbol.blocaje', 1.5]]), e('fisico', [['gen.resistencia', 1.2], ['futbol.arrancada', 2.5]]), e('balon', [['futbol.control', 2], ['futbol.pase', 1.5]])];

  it('elige el que más sube lo que más te frena; en un empate, el de id menor; si ninguno sube nada de eso, ninguno', () => {
    expect(elegirEntrenamiento(catalogo, ['futbol.reflejos'])?.id).toBe('porteria');
    expect(elegirEntrenamiento(catalogo, ['gen.resistencia', 'futbol.control'])?.id).toBe('fisico');
    expect(elegirEntrenamiento([e('b', [['x', 1]]), e('a', [['x', 1]])], ['x'])?.id).toBe('a');
    expect(elegirEntrenamiento(catalogo, ['futbol.definicion'])).toBeUndefined();
    expect(elegirEntrenamiento(catalogo, [])).toBeUndefined();
  });

  it('un entrenamiento nuevo entra en la recomendación en cuanto está en el catálogo (con los de hoy y con los que lleguen)', () => {
    const nuevo = e('mano_a_mano', [['futbol.mano_a_mano', 3], ['futbol.dominio_area', 1.5]]);
    expect(elegirEntrenamiento(catalogo, ['futbol.mano_a_mano'])).toBeUndefined();
    expect(elegirEntrenamiento([...catalogo, nuevo], ['futbol.mano_a_mano'])?.id).toBe('mano_a_mano');
    expect(utilidadDeUnEntreno(nuevo, ['futbol.mano_a_mano', 'futbol.dominio_area'])).toBeCloseTo(3 + 0.75, 6);
  });

  it('con los entrenamientos de hoy del fútbol: portería sube lo del portero y la preparación física, lo físico', () => {
    const hoy = (futbol.actions ?? []).filter((a) => /^futbol\.(balon|tiro|fisico|porteria)$/.test(a.id)).map((a) => ({ id: a.id, nombre: String(a.name), entrena: a.train! }));
    expect(hoy).toHaveLength(4);
    expect(elegirEntrenamiento(hoy, ['futbol.reflejos', 'futbol.blocaje'])?.id).toBe('futbol.porteria');
    expect(elegirEntrenamiento(hoy, ['gen.resistencia', 'futbol.arrancada'])?.id).toBe('futbol.fisico');
    expect(elegirEntrenamiento(hoy, ['futbol.regate'])?.id).toBe('futbol.balon');
    expect(elegirEntrenamiento(hoy, ['futbol.definicion'])?.id).toBe('futbol.tiro');
  });
});

describe('con el juego entero', () => {
  const partida = () => {
    const g = nuevaPartida({ seed: 7, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    advanceToWeek(g, 'gen.descansar', 1, 2, 17);
    return g;
  };

  it('el consejo nombra puestos sin lado y se puede preguntar por cada puesto al profesor y al entrenador', () => {
    const g = partida();
    const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
    const consejo = dir.consejoDeportivo?.().find((c) => c.deporte === 'futbol');
    if (consejo) {
      expect(consejo.puestos).toHaveLength(3);
      for (const p of consejo.puestos) expect(familiasDePuestos(P).map((f) => f.id)).toContain(p.id);
      expect(consejo.pistas).toBeDefined();
    }
    const familias = dir.familiasDePuestos?.().find((d) => d.deporte === 'futbol')?.familias ?? [];
    expect(familias.map((f) => f.id)).toEqual(familiasDePuestos(P).map((f) => f.id));
    for (const f of familias) {
      expect(g.preview(`estudios.preguntar_puesto.futbol.${f.id}`), f.id).toBeDefined();
      expect(g.preview(`futbol.preguntar_puesto.${f.id}`), f.id).toBeDefined();
    }
    const lectura = dir.lecturaDePuesto?.('futbol', 'portero');
    expect(lectura?.familia.nombre).toBe('Portero');
    expect(dir.lecturaDePuesto?.('futbol', 'no_existe')).toBeUndefined();
    expect(dir.lecturaDePuesto?.('atletismo', 'portero')).toBeUndefined();
  });
});
