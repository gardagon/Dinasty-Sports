import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { cargarPartida, nuevaPartida } from '@ds/game';
import { AlmacenEnMemoria, AlmacenIndexedDB, aJSON, crearAlmacen, deJSON, type Almacen, type SaveFile } from './almacen';

const partida = (nombre = 'Alex', semilla = 1): SaveFile => ({ state: nuevaPartida({ seed: semilla, playerName: nombre }).serialize(), agenda: [{ start: 420, duration: 60, name: 'Descansar', rest: true }] });

const contrato = (nombre: string, crear: () => Almacen) =>
  describe(nombre, () => {
    it('guarda y recupera una partida idéntica, y sigue siendo jugable', async () => {
      const a = crear();
      expect(await a.cargar()).toBeNull();
      const p = partida();
      await a.guardar(p);
      const leida = (await a.cargar())!;
      expect(leida).toEqual(p);
      const g = cargarPartida(leida.state);
      expect(g.perform('gen.descansar').ok).toBe(true);
    });

    it('cada guardado sustituye al anterior y se puede borrar', async () => {
      const a = crear();
      await a.guardar(partida('Uno'));
      await a.guardar(partida('Dos'));
      expect((await a.cargar())!.state.playerName).toBe('Dos');
      expect(await a.listar()).toHaveLength(1);
      await a.borrar();
      expect(await a.cargar()).toBeNull();
      expect(await a.listar()).toEqual([]);
    });

    it('guarda varias partidas por id y las lista, la más reciente primero', async () => {
      const a = crear();
      await a.guardar(partida('Ana', 1), 'a');
      await new Promise((r) => setTimeout(r, 5));
      await a.guardar(partida('Beto', 2), 'b');
      expect((await a.listar()).map((x) => x.nombre)).toEqual(['Beto', 'Ana']);
      expect((await a.cargar('a'))!.state.playerName).toBe('Ana');
      await a.borrar('a');
      expect(await a.cargar('a')).toBeNull();
      expect((await a.cargar('b'))!.state.playerName).toBe('Beto');
    });
  });

contrato('almacén en memoria', () => new AlmacenEnMemoria());
contrato('almacén IndexedDB', () => new AlmacenIndexedDB('prueba', new IDBFactory()));

describe('IndexedDB', () => {
  it('lo guardado sobrevive a cerrar y abrir de nuevo (otra conexión a la misma base)', async () => {
    const fabrica = new IDBFactory();
    await new AlmacenIndexedDB('juego', fabrica).guardar(partida('Persistente'));
    expect((await new AlmacenIndexedDB('juego', fabrica).cargar())!.state.playerName).toBe('Persistente');
  });

  it('aguanta una partida de más de 5 MB (el límite de localStorage) con miles de personas', async () => {
    const p = partida();
    const npcs = (p.state.modules.npcs as { npcs: { id: string; name: string }[] }).npcs;
    const base = [...npcs];
    for (let i = 0; i < 6000; i++) npcs.push({ ...structuredClone(base[i % base.length]), id: `x${i}`, name: `${base[i % base.length].name} ${i}` });
    expect(JSON.stringify(p.state).length).toBeGreaterThan(5 * 1024 * 1024);
    const a = new AlmacenIndexedDB('grande', new IDBFactory());
    await a.guardar(p);
    const leida = (await a.cargar())!;
    expect((leida.state.modules.npcs as { npcs: unknown[] }).npcs).toHaveLength(npcs.length);
  });

  it('sin IndexedDB en el navegador se usa el almacén en memoria', async () => {
    expect((await crearAlmacen()).tipo).toBe('memoria');
  });
});

describe('copia de seguridad en JSON', () => {
  it('exportar e importar devuelve la misma partida', () => {
    const p = partida('Copia');
    // JSON no distingue -0 de 0 (el juego tiene algún -0 en los rasgos): se compara con lo que da pasar la partida por JSON.
    expect(deJSON(aJSON(p))).toEqual(JSON.parse(JSON.stringify(p)));
  });

  it('rechaza lo que no es una copia de seguridad, con un motivo', () => {
    expect(() => deJSON('esto no es json')).toThrow(/no es JSON/);
    expect(() => deJSON('{"hola":1}')).toThrow(/no es una copia de seguridad/);
    expect(() => deJSON('{"formato":"otro","state":{}}')).toThrow(/no es una copia/);
  });

  it('una copia de otra versión del juego se carga y el juego la rechaza con su propio aviso', () => {
    const p = partida();
    const vieja = deJSON(aJSON({ ...p, state: { ...p.state, version: 1 } }));
    expect(() => cargarPartida(vieja.state)).toThrow(/Versión de guardado/);
  });
});
