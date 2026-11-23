import { describe, expect, it } from 'vitest';
import type { Game } from '@ds/core';
import { DISENOS, ENTRADAS_DEL_DIARIO_RECIENTE, OFRECER_PROTOTIPOS, PIEZAS_IZQUIERDA, disenoActual, disenoParaAncho, elegirDiseno, elegirPrototipo, guardarScroll, prototipoActual, restaurarScroll, viewEscritorio, type Vistas } from './escritorio';

/** Una partida de mentira: la composición solo le pide el dinero, el nombre y los servicios (que no hay). */
const juego = { playerName: 'Ana', stat: () => 12.5, service: () => undefined, registry: { services: new Map() } } as unknown as Game;

function vistasDePrueba(llamadas: string[]): Vistas {
  const pieza = (nombre: string) => (): string => {
    llamadas.push(nombre);
    return `<section data-pieza="${nombre}"></section>`;
  };
  return {
    dia: pieza('dia'), lugar: pieza('lugar'), resultado: () => (llamadas.push('resultado'), '<div data-pieza="resultado"></div>'), pendientes: pieza('pendientes'), acciones: pieza('acciones'), viaje: pieza('viaje'), planes: pieza('planes'),
    identidad: pieza('identidad'), personaje: pieza('personaje'), estudios: pieza('estudios'), deporte: pieza('deporte'), gente: pieza('gente'), relaciones: pieza('relaciones'),
    recuerdos: pieza('recuerdos'), diario: pieza('diario'), diarioReciente: (_g, max) => (llamadas.push(`diarioReciente:${max}`), '<section data-pieza="diarioReciente"></section>'), pruebas: pieza('pruebas'),
  };
}
const tabs = [['hacer', 'Qué hacer'], ['personaje', 'Personaje'], ['gente', 'Gente (3)'], ['diario', 'Diario']] as const;

describe('escritorio: el diseño a pantalla ancha', () => {
  it('por defecto es «Automático»: escritorio desde 1280 px y, por debajo, como siempre', () => {
    expect(disenoActual()).toBe('automatico');
    expect(disenoParaAncho('automatico', 1280)).toBe(true);
    expect(disenoParaAncho('automatico', 1279)).toBe(false);
    expect(disenoParaAncho('automatico', 390)).toBe(false);
  });
  it('«Móvil» no usa nunca el escritorio y «Escritorio» lo usa si cabe (desde 1000 px)', () => {
    expect(disenoParaAncho('movil', 2560)).toBe(false);
    expect(disenoParaAncho('escritorio', 1000)).toBe(true);
    expect(disenoParaAncho('escritorio', 999)).toBe(false);
  });
  it('Opciones ofrece automático, escritorio y móvil, y solo se aceptan esos valores', () => {
    expect(DISENOS.map((d) => d.id)).toEqual(['automatico', 'escritorio', 'movil']);
    expect(elegirDiseno('raro')).toBe(false);
    expect(elegirDiseno('movil')).toBe(true);
    expect(disenoActual()).toBe('movil');
    expect(elegirDiseno('automatico')).toBe(true);
  });
  it('los prototipos B y C no se ofrecen: siempre es el A', () => {
    expect(OFRECER_PROTOTIPOS).toBe(false);
    expect(elegirPrototipo('b')).toBe(false);
    expect(prototipoActual()).toBe('a');
  });

  it('dibuja cada pieza una sola vez (el resultado de lo último, que se gasta al dibujarlo, también) y el diario reciente con su tope', () => {
    const llamadas: string[] = [];
    const html = viewEscritorio(juego, { tab: 'hacer', tabs, vistas: vistasDePrueba(llamadas) });
    expect(llamadas.filter((l) => l === 'resultado')).toHaveLength(1);
    expect(llamadas.filter((l) => l === 'dia')).toHaveLength(1);
    expect(llamadas).toContain(`diarioReciente:${ENTRADAS_DEL_DIARIO_RECIENTE}`);
    expect(llamadas).not.toContain('diario'); // el diario entero solo en su pestaña
    expect(html).toContain('esc-a');
  });
  it('el HTML va en el orden del foco (barra, centro, columna izquierda, diario) y las zonas con scroll se pueden recorrer con el teclado', () => {
    const html = viewEscritorio(juego, { tab: 'hacer', tabs, vistas: vistasDePrueba([]) });
    const orden = ['data-pieza="dia"', 'esc-centro', 'esc-izq', 'esc-der'].map((x) => html.indexOf(x));
    expect(orden.every((i) => i >= 0)).toBe(true);
    expect([...orden].sort((a, b) => a - b)).toEqual(orden);
    for (const clave of ['centro-hacer', 'izq', 'der']) expect(html).toMatch(new RegExp(`data-esc-scroll="${clave}" tabindex="0" role="region" aria-label="[^"]+"`));
    expect(html).toContain('aria-selected="true" data-tab="hacer"');
  });
  it('la columna izquierda lleva el personaje, el dinero, lo pendiente, los planes y el deporte, en una lista de piezas a la que se puede añadir', () => {
    const llamadas: string[] = [];
    const html = viewEscritorio(juego, { tab: 'gente', tabs, vistas: vistasDePrueba(llamadas) });
    expect(PIEZAS_IZQUIERDA).toHaveLength(5);
    const izq = html.slice(html.indexOf('esc-izq'), html.indexOf('esc-der'));
    expect(izq).toContain('esc-dinero');
    expect(izq).toContain('12,5 €');
    expect(izq).toContain('data-pieza="pendientes"');
    expect(izq).toContain('data-pieza="planes"');
    expect(izq).not.toContain('data-pieza="gente"');
  });
  it('la pestaña elegida es la que sale en el centro', () => {
    const llamadas: string[] = [];
    viewEscritorio(juego, { tab: 'gente', tabs, vistas: vistasDePrueba(llamadas) });
    expect(llamadas).toContain('gente');
    expect(llamadas).not.toContain('acciones');
  });
});

describe('escritorio: la posición de las zonas al redibujar', () => {
  const zonas = (valores: Record<string, number>) => {
    const lista = Object.entries(valores).map(([k, y]) => ({ dataset: { escScroll: k }, scrollTop: y }));
    return { querySelectorAll: () => ({ forEach: (f: (z: (typeof lista)[number]) => void) => lista.forEach(f) }), lista } as unknown as ParentNode & { lista: typeof lista };
  };
  it('se guarda la de cada zona y se devuelve a la zona con la misma clave (una pestaña distinta empieza arriba)', () => {
    const antes = zonas({ 'centro-hacer': 340, izq: 20 });
    const guardado = guardarScroll(antes);
    expect(guardado).toEqual({ 'centro-hacer': 340, izq: 20 });
    const despues = zonas({ 'centro-diario': 0, izq: 0 });
    restaurarScroll(despues, guardado);
    expect(despues.lista.map((z) => z.scrollTop)).toEqual([0, 20]);
  });
});
