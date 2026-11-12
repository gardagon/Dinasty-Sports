import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import * as contracts from '@ds/contracts';
import { INTERFAZ_DE_DEPORTES, PAIS_CIUDAD_DE_PRUEBA, registrarPais } from '@ds/contracts';
import * as kit from '@ds/kit-deporte';
import { advanceToWeek } from '@ds/core';
import { MODULOS, catalogoDeDeportes, nuevaPartida } from '@ds/game';
import { Instalador, almacenEnMemoria, fuenteWeb, generarClaves, type Descargar } from '@ds/paquetes';
import type { FutbolState } from '@ds/mod-futbol';
import { deportesFueraDelJuego, deportesParaPublicar, publicarDeportes } from '../tools/publicar';

vi.setConfig({ testTimeout: 240000, hookTimeout: 240000 });
registrarPais(PAIS_CIUDAD_DE_PRUEBA);

/**
 * La publicación de los deportes como paquetes firmados, **también los que no van dentro del juego** (el fútbol): se publican todos, se instalan desde la carpeta publicada como lo hace la web (`fuenteWeb`)
 * y con el fútbol instalado se crea una partida y se juega.
 */
const RAIZ = new URL('..', import.meta.url).pathname;
const salida = mkdtempSync(join(tmpdir(), 'ds-publicar-'));
afterAll(() => rmSync(salida, { recursive: true, force: true }));
const claves = await generarClaves();
const avisos: string[] = [];
const publicados = await publicarDeportes(RAIZ, salida, claves.privada, (t) => avisos.push(t));

describe('qué deportes se publican', () => {
  it('los del juego y los que no van dentro: el fútbol no está en MODULOS y se publica igual (lo dice su package.json)', async () => {
    expect(MODULOS.some((m) => m.id === 'futbol')).toBe(false);
    expect((await deportesFueraDelJuego(RAIZ)).map((m) => m.id)).toEqual(['futbol']);
    const todos = await deportesParaPublicar(RAIZ);
    expect(todos.map((d) => [d.id, d.enElJuego])).toEqual([['atletismo', true], ['futbol', false]]);
    expect(publicados.map((p) => p.deporte.id)).toEqual(['atletismo', 'futbol']);
    expect(avisos.some((a) => /Fútbol .*aparte/.test(a))).toBe(true);
  });

  it('escribe el catálogo y un paquete por deporte y versión, con los países de sus datos', () => {
    const catalogo = JSON.parse(readFileSync(join(salida, 'deportes', 'catalogo.json'), 'utf8')) as { id: string; nombre: string; version: string; interfaz: number; paises: string[]; bytes: number; ruta: string }[];
    expect(catalogo.map((e) => e.id)).toEqual(['atletismo', 'futbol']);
    const futbol = catalogo.find((e) => e.id === 'futbol')!;
    expect(futbol.ruta).toBe(`futbol/${futbol.version}/paquete.json`);
    expect(futbol.nombre).toBe('Fútbol');
    expect(futbol.interfaz).toBe(INTERFAZ_DE_DEPORTES);
    expect(futbol.paises).toContain('espana');
    expect(readFileSync(join(salida, 'deportes', futbol.ruta), 'utf8').length).toBe(futbol.bytes);
  });
});

describe('instalar el fútbol desde lo publicado y jugar con él', () => {
  const descargar: Descargar = async (url) => {
    const ruta = join(salida, 'deportes', url.split('/deportes/')[1] ?? url.split('http://web.test/')[1]);
    return { ok: true, status: 200, text: async () => readFileSync(ruta, 'utf8') };
  };

  it('la web lo instala como cualquier deporte (firma comprobada), y con él se crea una partida en la que corre la liga', async () => {
    const instalador = new Instalador(almacenEnMemoria(), { clavePublica: claves.publica, interfaz: INTERFAZ_DE_DEPORTES }, { '@ds/contracts': contracts, '@ds/kit-deporte': kit });
    const fuente = fuenteWeb('http://web.test/deportes/', 'Web del juego', descargar);
    const entrada = (await fuente.catalogo()).find((e) => e.id === 'futbol')!;
    const manifiesto = await instalador.instalarDe(fuente, entrada);
    expect(manifiesto.nombre).toBe('Fútbol');
    expect((await instalador.instalados()).map((d) => d.manifiesto.id)).toContain('futbol');
    const { modulos, avisos: fallos } = await instalador.modulos();
    expect(fallos).toEqual([]);
    const todos = [...MODULOS, ...modulos];
    expect(catalogoDeDeportes(todos).map((d) => d.id)).toEqual(['atletismo', 'futbol']);
    const g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, todos);
    advanceToWeek(g, 'gen.descansar', 8, 2, 15);
    const liga = (g.moduleState<FutbolState>('futbol') as FutbolState).liga!;
    expect(Object.keys(liga.categorias).length).toBeGreaterThan(0);
    expect(Math.max(...Object.values(liga.categorias).map((c) => c.jornada))).toBeGreaterThanOrEqual(2);
    // Y la pestaña del deporte existe con el fútbol instalado.
    expect(g.service<{ view(): { nombre: string } }>(contracts.claveDeDeporte('futbol'))!.view().nombre).toBe('Fútbol');
  });

  it('con una clave que no es la que firmó, no se instala (la firma no vale)', async () => {
    const otras = await generarClaves();
    const instalador = new Instalador(almacenEnMemoria(), { clavePublica: otras.publica, interfaz: INTERFAZ_DE_DEPORTES }, { '@ds/contracts': contracts, '@ds/kit-deporte': kit });
    const fuente = fuenteWeb('http://web.test/deportes/', 'Web del juego', descargar);
    const entrada = (await fuente.catalogo()).find((e) => e.id === 'futbol')!;
    await expect(instalador.instalarDe(fuente, entrada)).rejects.toThrow(/firma/);
  });
});
