import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { cargarPartida, nuevaPartida } from '@ds/game';
import { AlmacenEnMemoria, AlmacenIndexedDB, crearAlmacen, deJSON, serializarPartida, type Almacen } from './almacen';

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
