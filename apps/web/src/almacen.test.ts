import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { cargarPartida, nuevaPartida } from '@ds/game';
import {
  AlmacenEnMemoria,
  AlmacenIndexedDB,
  FRECUENCIA_POR_DEFECTO,
  PARTIDA_ACTUAL,
  borrarRecuperacion,
  crearAlmacen,
  deJSON,
  escribirFrecuencia,
  guardarRecuperacion,
  leerFrecuencia,
  leerRecuperacion,
  recomendarFrecuencia,
  serializarPartida,
  textoDeRecomendacion,
  tocaGuardar,
  type Almacen,
} from './almacen';

const agenda = [{ start: 420, duration: 60, name: 'Descansar', rest: true }];
const partida = (nombre = 'Alex', semilla = 1) => serializarPartida(nuevaPartida({ seed: semilla, playerName: nombre }), agenda);

const contrato = (nombre: string, crear: () => Almacen) =>
  describe(nombre, () => {
    it('guarda y recupera una partida idéntica, y sigue siendo jugable', async () => {
      const a = crear();
      expect(await a.cargar()).toBeNull();
      const p = partida();
      await a.guardar(p);
      const texto = (await a.cargar())!;
      expect(texto).toBe(p.texto);
      const leida = deJSON(texto);
      expect(leida.agenda).toEqual(agenda);
      const g = cargarPartida(leida.state, undefined, { copiar: false });
      expect(g.perform('gen.descansar').ok).toBe(true);
    });

    it('cada guardado sustituye al anterior y se puede borrar', async () => {
      const a = crear();
      await a.guardar(partida('Uno'));
      await a.guardar(partida('Dos'));
      expect(deJSON((await a.cargar())!).state.playerName).toBe('Dos');
      expect(await a.listar()).toHaveLength(1);
      await a.borrar();
      expect(await a.cargar()).toBeNull();
      expect(await a.listar()).toEqual([]);
    });

    it('guarda varias partidas por id y las lista sin leerlas, la más reciente primero', async () => {
      const a = crear();
      await a.guardar(partida('Ana', 1), 'a');
      await new Promise((r) => setTimeout(r, 5));
      await a.guardar(partida('Beto', 2), 'b');
      expect((await a.listar()).map((x) => x.nombre)).toEqual(['Beto', 'Ana']);
      expect(deJSON((await a.cargar('a'))!).state.playerName).toBe('Ana');
      await a.borrar('a');
      expect(await a.cargar('a')).toBeNull();
      expect(deJSON((await a.cargar('b'))!).state.playerName).toBe('Beto');
    });
  });

contrato('almacén en memoria', () => new AlmacenEnMemoria());
contrato('almacén IndexedDB', () => new AlmacenIndexedDB('prueba', new IDBFactory()));

describe('IndexedDB', () => {
  it('lo guardado sobrevive a cerrar y abrir de nuevo (otra conexión a la misma base)', async () => {
    const fabrica = new IDBFactory();
    await new AlmacenIndexedDB('juego', fabrica).guardar(partida('Persistente'));
    expect(deJSON((await new AlmacenIndexedDB('juego', fabrica).cargar())!).state.playerName).toBe('Persistente');
  });

  it('aguanta una partida de más de 5 MB con miles de personas', async () => {
    const g = nuevaPartida({ seed: 1 });
    const s = g.serialize();
    const npcs = (s.modules.npcs as { npcs: { id: string; name: string }[] }).npcs;
    const base = [...npcs];
    for (let i = 0; i < 6000; i++) npcs.push({ ...structuredClone(base[i % base.length]), id: `x${i}`, name: `${base[i % base.length].name} ${i}` });
    const grande = cargarPartida(s, undefined, { copiar: false });
    const p = serializarPartida(grande, []);
    expect(p.texto.length).toBeGreaterThan(5 * 1024 * 1024);
    const a = new AlmacenIndexedDB('grande', new IDBFactory());
    await a.guardar(p);
    expect((deJSON((await a.cargar())!).state.modules.npcs as { npcs: unknown[] }).npcs).toHaveLength(npcs.length);
  });

  it('sin IndexedDB en el navegador se usa el almacén en memoria', async () => {
    expect((await crearAlmacen()).tipo).toBe('memoria');
  });
});

describe('la partida en texto (también es la copia de seguridad)', () => {
  it('lleva el formato, la versión, el nombre y el estado, y es una copia: no cambia aunque la partida siga', () => {
    const g = nuevaPartida({ seed: 3, playerName: 'Copia' });
    const p = serializarPartida(g, agenda);
    const antes = p.texto;
    g.perform('gen.descansar');
    expect(p.texto).toBe(antes);
    const o = JSON.parse(p.texto);
    expect(o).toMatchObject({ formato: 'dinasty-sports', nombre: 'Copia' });
    expect(o.version).toBe(p.version);
    expect(deJSON(p.texto).state.minute).toBeLessThan(g.time.minute);
  });

  it('rechaza lo que no es una copia de seguridad, con un motivo', () => {
    expect(() => deJSON('esto no es json')).toThrow(/no es JSON/);
    expect(() => deJSON('{"hola":1}')).toThrow(/no es una copia de seguridad/);
    expect(() => deJSON('{"formato":"otro","state":{}}')).toThrow(/no es una copia/);
  });

  it('una copia de otra versión del juego se lee y el juego la rechaza con su propio aviso', () => {
    const o = JSON.parse(partida().texto);
    o.state.version = 1;
    expect(() => cargarPartida(deJSON(JSON.stringify(o)).state)).toThrow(/Versión de guardado/);
  });

  it('cargar sin copiar da el mismo juego que cargar copiando', () => {
    const s = deJSON(partida().texto).state;
    const a = cargarPartida(structuredClone(s), undefined, { copiar: false });
    const b = cargarPartida(s);
    for (const id of ['gen.fuerza', 'estudios.matematicas', 'atletismo.tecnica']) expect(a.stat(id)).toBe(b.stat(id));
  });
});

describe('guardado automático elegible', () => {
  it('por defecto es cada día', () => {
    expect(FRECUENCIA_POR_DEFECTO).toBe('dia');
    expect(leerFrecuencia(PARTIDA_ACTUAL, { getItem: () => null })).toBe('dia');
  });

  it('tras cada acción guarda siempre y a mano nunca', () => {
    expect(tocaGuardar('accion', 5, 5)).toBe(true);
    expect(tocaGuardar('manual', 5, 400)).toBe(false);
    expect(tocaGuardar('manual', undefined, 400)).toBe(false);
  });

  it('cada día solo al cambiar de día', () => {
    expect(tocaGuardar('dia', 10, 10)).toBe(false);
    expect(tocaGuardar('dia', 10, 11)).toBe(true);
    expect(tocaGuardar('dia', undefined, 10)).toBe(true);
  });

  it('cada semana al empezar el lunes (el día 0 es lunes)', () => {
    expect(tocaGuardar('semana', 0, 6)).toBe(false);
    expect(tocaGuardar('semana', 0, 7)).toBe(true);
    expect(tocaGuardar('semana', 7, 13)).toBe(false);
    expect(tocaGuardar('semana', 7, 14)).toBe(true);
  });

  it('cada mes al cambiar de mes del calendario (el día 0 es el 10 de septiembre)', () => {
    expect(tocaGuardar('mes', 0, 20)).toBe(false); // 30 de septiembre
    expect(tocaGuardar('mes', 0, 21)).toBe(true); // 1 de octubre
    expect(tocaGuardar('mes', 21, 51)).toBe(false); // 31 de octubre
    expect(tocaGuardar('mes', 21, 52)).toBe(true); // 1 de noviembre
  });

  it('recomienda más espaciado cuanto más tarda en guardar', () => {
    expect(recomendarFrecuencia(10)).toBe('accion');
    expect(recomendarFrecuencia(150)).toBe('dia');
    expect(recomendarFrecuencia(400)).toBe('semana');
    expect(recomendarFrecuencia(3000)).toBe('mes');
    expect(textoDeRecomendacion(400)).toBe('Tu partida tarda 400 ms en guardarse: te recomendamos «cada semana de juego».');
  });

  it('recuerda la frecuencia elegida y ignora valores raros o un almacenamiento que falla', () => {
    const mem = new Map<string, string>();
    const local = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    escribirFrecuencia('semana', PARTIDA_ACTUAL, local);
    expect(leerFrecuencia(PARTIDA_ACTUAL, local)).toBe('semana');
    mem.set([...mem.keys()][0], 'cada hora');
    expect(leerFrecuencia(PARTIDA_ACTUAL, local)).toBe('dia');
    const roto = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
    expect(leerFrecuencia(PARTIDA_ACTUAL, roto)).toBe('dia');
    expect(() => escribirFrecuencia('mes', PARTIDA_ACTUAL, roto)).not.toThrow();
  });
});

describe('copia de recuperación', () => {
  /** Una partida a la que se le han hecho acciones: más reciente que la recién creada. */
  const avanzada = () => {
    const g = nuevaPartida({ seed: 1, playerName: 'Alex' });
    g.perform('gen.descansar');
    return serializarPartida(g, agenda);
  };

  for (const [nombre, crear] of [
    ['memoria', () => new AlmacenEnMemoria()],
    ['IndexedDB', () => new AlmacenIndexedDB('recuperacion', new IDBFactory())],
  ] as const) {
    it(`no toca la partida guardada y se ofrece si es más reciente (${nombre})`, async () => {
      const a = crear();
      const guardada = partida();
      await a.guardar(guardada);
      const nueva = avanzada();
      await guardarRecuperacion(a, nueva);
      expect(await a.cargar()).toBe(guardada.texto);
      const r = await leerRecuperacion(a, guardada.texto);
      expect(r?.texto).toBe(nueva.texto);
      expect(r?.nombre).toBe('Alex');
      expect(r!.minuto).toBeGreaterThan(deJSON(guardada.texto).state.minute);
      expect(r!.dia).toBe(Math.floor(r!.minuto / 1440));
    });

    it(`se ofrece aunque no haya partida guardada (${nombre})`, async () => {
      const a = crear();
      await guardarRecuperacion(a, avanzada());
      expect(await leerRecuperacion(a, null)).not.toBeNull();
    });

    it(`si no es más reciente se descarta (${nombre})`, async () => {
      const a = crear();
      const antigua = partida();
      await guardarRecuperacion(a, antigua);
      expect(await leerRecuperacion(a, avanzada().texto)).toBeNull();
      expect(await a.cargar('recuperacion')).toBeNull();
    });

    it(`sin copia no hay nada que ofrecer, y se puede borrar (${nombre})`, async () => {
      const a = crear();
      expect(await leerRecuperacion(a, null)).toBeNull();
      await guardarRecuperacion(a, avanzada());
      await borrarRecuperacion(a);
      expect(await leerRecuperacion(a, null)).toBeNull();
    });

    it(`una copia ilegible se borra sin romper nada (${nombre})`, async () => {
      const a = crear();
      await a.guardar({ texto: 'no es json', nombre: 'x', version: 1 }, 'recuperacion');
      expect(await leerRecuperacion(a, null)).toBeNull();
      expect(await a.cargar('recuperacion')).toBeNull();
    });
  }
});
