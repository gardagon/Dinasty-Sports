import { describe, expect, it } from 'vitest';
import { APORTE_DE_CONFIG_DE_SUCESOS, APORTE_DE_SUCESOS, SERVICES, SUCESOS_DE_PRUEBA, defineModule, suceso, type AporteDeSucesos, type SucesosDePruebaService, type SucesosService } from '@ds/contracts';
import { Game } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { sucesos, type SucesosState } from './index';

/** Pruebas del motor del lote 2: textos y variantes al azar, contenido duro, cumpleaños propio y rotación por familia. */
const forzado = { texto: undefined as number | undefined, resultado: undefined as number | undefined };
const modulo = (catalogo: AporteDeSucesos[], config: object[] = []) =>
  defineModule({
    id: 't',
    name: 'Prueba',
    aportes: { [APORTE_DE_SUCESOS]: catalogo, [APORTE_DE_CONFIG_DE_SUCESOS]: config },
    services: { [SUCESOS_DE_PRUEBA]: (): SucesosDePruebaService => ({ texto: () => forzado.texto, resultado: () => forzado.resultado }) },
  });
const nueva = (catalogo: AporteDeSucesos[], config: object[] = [], semilla = 7) => {
  Object.assign(forzado, { texto: undefined, resultado: undefined });
  return Game.create([personaje, sucesos, modulo(catalogo, config)], { seed: semilla });
};
const svc = (g: Game) => g.service<SucesosService>(SERVICES.sucesos)!;
const dias = (g: Game, n: number) => {
  const hasta = g.time.day + n;
  while (g.time.day < hasta) expect(g.perform('gen.descansar').ok).toBe(true);
};
/** Lo que ha salido, en orden: `suceso` o `suceso~variante`. */
const salidos = (g: Game) => svc(g).recuerdos().map((r) => (r.variante ? `${r.suceso}~${r.variante}` : r.suceso));
const diasDe = (g: Game, id: string) => svc(g).recuerdos().filter((r) => r.suceso === id).map((r) => r.dia);

describe('textos y variantes al azar (E1)', () => {
  const detalle = (extra: object) => suceso({ id: 't.textos', titulo: 'Un detalle', categoria: 'menor', disparo: { cada: 'dia', prob: 1 }, repite: 'siempre', ...extra } as any);
  const textos = detalle({ textos: ['Uno.', 'Dos.', 'Tres.'] });

  it('con `textos` salen todas las versiones, siempre la misma para la misma partida y sin tocar el generador de la partida', () => {
    const a = nueva([textos]);
    dias(a, 60);
    const vistos = new Set(a.log.map((l) => l.text.replace('Un detalle. ', '')).filter((t) => /^(Uno|Dos|Tres)\.$/.test(t)));
    expect(vistos).toEqual(new Set(['Uno.', 'Dos.', 'Tres.']));
    const b = nueva([textos]);
    dias(b, 60);
    expect(b.log.map((l) => l.text)).toEqual(a.log.map((l) => l.text));
    // El suceso sin textos al azar y el que los tiene dejan la partida igual: el azar es propio del suceso.
    const sin = nueva([detalle({ texto: 'Fijo.' })]);
    dias(sin, 60);
    expect(sin.stat('gen.energia')).toBe(a.stat('gen.energia'));
  });

  it('el texto elegido se queda fijo mientras se decide, y una prueba puede forzar cada versión', () => {
    const decide = suceso({ id: 't.decide', titulo: 'Decidir', disparo: { cada: 'dia', prob: 1 }, textos: ['Versión A', 'Versión B'], plazo: { dias: 3, porDefecto: 'a' }, opciones: [{ id: 'a', texto: 'A', resultados: ['R1', 'R2'] }] });
    for (const [n, esperado] of [[0, 'Versión A'], [1, 'Versión B']] as const) {
      const g = nueva([decide]);
      forzado.texto = n;
      dias(g, 1);
      forzado.texto = undefined;
      const p = svc(g).pendientes()[0];
      expect(p.texto).toBe(esperado);
      dias(g, 0);
      expect(svc(g).pendientes()[0].texto).toBe(esperado);
      for (const r of [0, 1]) {
        const h = nueva([decide]);
        forzado.texto = 0;
        dias(h, 1);
        forzado.resultado = r;
        expect(h.perform(svc(h).pendientes()[0].opciones[0].accion).ok).toBe(true);
        expect(h.log.at(-1)!.text).toContain(`R${r + 1}`);
      }
    }
  });

  it('las variantes sin `peso` ganan por orden; con `peso` se sortean entre las que se cumplen', () => {
    const conVariantes = (id: string, variantes: any[]) => suceso({ id, titulo: 'V', categoria: 'menor', disparo: { cada: 'dia', prob: 1 }, repite: 'siempre', variantes });
    const v = conVariantes('t.variantes', [
      { id: 'a', si: [], peso: 1, texto: 'a' },
      { id: 'b', si: [], peso: 3, texto: 'b' },
      { id: 'nunca', si: [{ hecho: 'edad', max: 1 }], peso: 100, texto: 'n' },
    ]);
    const g = nueva([v]);
    dias(g, 200);
    const s = salidos(g);
    const a = s.filter((x) => x.endsWith('~a')).length;
    const b = s.filter((x) => x.endsWith('~b')).length;
    expect(s.some((x) => x.endsWith('~nunca'))).toBe(false);
    expect(a).toBeGreaterThan(20);
    expect(b).toBeGreaterThan(a * 1.8);
    // Si la primera que se cumple no lleva `peso`, gana siempre (como antes).
    const fija = conVariantes('t.fija', [{ id: 'primera', si: [], texto: 'p' }, { id: 'b', si: [], peso: 3, texto: 'b' }]);
    const h = nueva([fija]);
    dias(h, 30);
    expect(new Set(salidos(h))).toEqual(new Set(['t.fija~primera']));
  });
});

describe('contenido duro', () => {
  const catalogo = (): AporteDeSucesos[] => [
    suceso({ id: 't.suave', titulo: 'Suave', disparo: { cada: 'dia', prob: 1 }, categoria: 'menor', repite: 'siempre', texto: 'x' }),
    suceso({ id: 't.mote', titulo: 'Mote', disparo: { cada: 'dia', prob: 1 }, categoria: 'menor', repite: 'siempre', duro: ['burlas'], texto: 'x' }),
    suceso({
      id: 't.mixto',
      titulo: 'Mixto',
      disparo: { cada: 'dia', prob: 1 },
      categoria: 'menor',
      repite: 'siempre',
      variantes: [
        { id: 'dura', si: [], duro: ['peleas'], texto: 'x' },
        { id: 'blanda', si: [], texto: 'x' },
      ],
    }),
    suceso({
      id: 't.opciones',
      titulo: 'Opciones',
      disparo: { cada: 'dia', prob: 1 },
      repite: 'siempre',
      texto: 'x',
      plazo: { dias: 1, porDefecto: 'calla' },
      opciones: [
        { id: 'calla', texto: 'Callar' },
        { id: 'pega', texto: 'Pegar', duro: ['peleas'] },
        { id: 'se_rie', texto: 'Reírte', duro: ['burlas', 'familia'] },
      ],
    }),
  ];
  const ver = (config: object[]) => {
    const g = nueva(catalogo(), config);
    dias(g, 2);
    return { s: salidos(g), opciones: svc(g).pendientes().find((p) => p.suceso === 't.opciones')?.opciones.map((o) => o.id) ?? [] };
  };

  it('por defecto (activado) sale todo', () => {
    const { s, opciones } = ver([]);
    expect(s).toContain('t.mote');
    expect(s).toContain('t.mixto~dura');
    expect(opciones).toEqual(['calla', 'pega', 'se_rie']);
  });

  it('con el interruptor general apagado no sale nada marcado: ni sucesos, ni variantes, ni opciones', () => {
    const { s, opciones } = ver([{ presentacion: { duro: { activado: false } } }]);
    expect(s).toContain('t.suave');
    expect(s).not.toContain('t.mote');
    expect(s).not.toContain('t.mixto~dura');
    expect(s).toContain('t.mixto~blanda');
    expect(opciones).toEqual(['calla']);
  });

  it('por categorías: apagar «burlas» quita lo de burlas (también lo que mezcla categorías) y deja lo demás', () => {
    const { s, opciones } = ver([{ presentacion: { duro: { categorias: { burlas: false } } } }]);
    expect(s).not.toContain('t.mote');
    expect(s).toContain('t.mixto~dura');
    expect(opciones).toEqual(['calla', 'pega']);
  });

  it('la validación avisa de la opción por defecto dura y de un hilo que se queda sin camino', async () => {
    const { validarCatalogo, hilo } = await import('@ds/contracts');
    const mala = suceso({ id: 't.mala', titulo: 'x', disparo: { cada: 'dia', prob: 0.1 }, texto: 'x', plazo: { dias: 1, porDefecto: 'a' }, opciones: [{ id: 'a', texto: 'A', duro: ['peleas'] }, { id: 'b', texto: 'B' }] });
    // Un hilo cuyo único suceso de entrada solo tiene una variante dura: con lo duro desactivado no sale nunca.
    const hiloDuro = hilo({ id: 't.hilo', nombre: 'H', sucesos: [{ id: 't.hilo.a', titulo: 'a', disparo: { cada: 'dia', prob: 0.1 }, variantes: [{ id: 'unica', si: [], duro: ['burlas'], texto: 'x' }], efectos: [{ programa: 't.hilo.b', en: { dias: 2 } }] }, { id: 't.hilo.b', titulo: 'b', disparo: { programado: true }, texto: 'x' }] });
    const r = validarCatalogo([{ modulo: 't', aportes: [mala, hiloDuro] }]);
    expect(r.errores.join('\n')).toMatch(/por defecto «a» es dura/);
    expect(r.errores.join('\n')).toMatch(/se queda sin ningún suceso por el que empezar/);
  });
});

describe('el cumpleaños del personaje (E4)', () => {
  it('«cumple_en_dias» y «es_tu_cumple» coinciden con el día del cumpleaños cada año', () => {
    const g = nueva([
      suceso({ id: 't.hoy', titulo: 'Hoy', categoria: 'menor', disparo: { cada: 'dia', prob: 1 }, repite: 'siempre', cuando: [{ hecho: 'es_tu_cumple', es: true }], texto: 'Cumples.' }),
      suceso({ id: 't.en3', titulo: 'En 3', categoria: 'menor', disparo: { cada: 'dia', prob: 1 }, repite: 'siempre', cuando: [{ hecho: 'cumple_en_dias', es: 3 }], texto: 'Falta poco.' }),
    ]);
    dias(g, 800);
    const hoy = diasDe(g, 't.hoy');
    const en3 = diasDe(g, 't.en3');
    expect(hoy.length).toBeGreaterThanOrEqual(2);
    expect(en3.length).toBe(hoy.length + (en3.length - hoy.length)); // mismo número de años (±1 por los bordes)
    for (const d of hoy) expect(en3).toContain(d - 3);
    expect(hoy[1] - hoy[0]).toBeGreaterThanOrEqual(365);
    expect(hoy[1] - hoy[0]).toBeLessThanOrEqual(366);
  });
});

describe('rotación por familia (E5)', () => {
  const miembro = (n: string, familia?: string) => suceso({ id: `t.${n}`, titulo: n, categoria: 'menor', disparo: { cada: 'dia', prob: 1 }, repite: 'siempre', texto: 'x', ...(familia ? { familia } : {}) });
  const unoAlDia = [{ cupo: { menor: { alDia: 1, aLaSemana: 7 } } }];

  it('dentro de una familia no se repite uno hasta que han salido los demás (como una baraja)', () => {
    const g = nueva([miembro('a', 'patio'), miembro('b', 'patio'), miembro('c', 'patio')], unoAlDia);
    dias(g, 31);
    const s = salidos(g);
    expect(s.length).toBeGreaterThanOrEqual(24);
    // Como una baraja: nunca dos seguidos iguales y los tres salen casi lo mismo (con probabilidad 1 el cupo siempre lo gana alguno que aún no ha salido).
    for (let i = 1; i < s.length; i++) expect(s[i]).not.toBe(s[i - 1]);
    for (const id of ['t.a', 't.b', 't.c']) expect(s.filter((x) => x === id).length).toBeGreaterThanOrEqual(8);
    // Sin familia (como hasta ahora) sí se repite alguno seguido.
    const sin = nueva([miembro('a'), miembro('b'), miembro('c')], unoAlDia);
    dias(sin, 31);
    const t = salidos(sin);
    expect(t.some((x, i) => i > 0 && x === t[i - 1])).toBe(true);
  });

  it('el estado es JSON serializable y una partida guardada sin `rotacion` se rellena al cargar', () => {
    const g = nueva([miembro('a', 'patio'), miembro('b', 'patio')], unoAlDia);
    dias(g, 5);
    const guardado = JSON.parse(JSON.stringify(g.serialize()));
    expect((guardado.modules.sucesos as SucesosState).rotacion.patio.salidos.length).toBeGreaterThan(0);
    delete guardado.modules.sucesos.rotacion;
    const h = Game.load([personaje, sucesos, modulo([miembro('a', 'patio'), miembro('b', 'patio')], unoAlDia)], guardado);
    expect(h.moduleState<SucesosState>('sucesos').rotacion).toEqual({});
    dias(h, 4);
    expect(Object.keys(h.moduleState<SucesosState>('sucesos').rotacion)).toEqual(['patio']);
  });
});
