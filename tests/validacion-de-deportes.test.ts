import { describe, expect, it } from 'vitest';
import * as contracts from '@ds/contracts';
import { INTERFAZ_DE_DEPORTES, SERVICES, deportePrincipal, type ClubDirectory, type GameModule } from '@ds/contracts';
import * as kit from '@ds/kit-deporte';
import { advanceToWeek, checkInvariants, type Game } from '@ds/core';
import { MODULOS, añadirDeporteALaPartida, cargarPartida, catalogoDeDeportes, deportesDeLaPartida, nuevaPartida, quitarDeporteDeLaPartida } from '@ds/game';
import { Instalador, almacenEnMemoria, generarClaves } from '@ds/paquetes';
import type { NpcsState } from '@ds/mod-npcs';
import { empaquetarDeporte } from '../tools/empaquetar';

/**
 * Validación del sistema de deportes (fase 7 del plan de deportes modulares): tres deportes de prueba, empaquetados, firmados e instalados junto al atletismo.
 * Se cambia de uno a otro, se quita uno un año y se vuelve, un jugador que va cambiando de deporte curso a curso, y se mide qué cuesta tener cuatro.
 */

const RAIZ = new URL('..', import.meta.url).pathname;
const PRUEBAS = [
  { id: 'pelota', nombre: 'Pelota' },
  { id: 'natacion', nombre: 'Natación' },
  { id: 'tenis', nombre: 'Tenis' },
];
const claves = await generarClaves();
const paquetes = await Promise.all(PRUEBAS.map((p) => empaquetarDeporte(RAIZ, p.id, p.nombre, claves.privada, ['espana'], { archivo: `${RAIZ}tests/deportes-de-prueba/${p.id}.ts`, version: '1.0.0' })));

/** Instala los tres en un dispositivo nuevo y devuelve la lista de módulos del juego: los del juego más los instalados. */
async function conInstalados(): Promise<{ modulos: GameModule<any>[]; instalador: Instalador }> {
  const instalador = new Instalador(almacenEnMemoria(), { clavePublica: claves.publica, interfaz: INTERFAZ_DE_DEPORTES }, { '@ds/contracts': contracts, '@ds/kit-deporte': kit });
  for (const p of paquetes) await instalador.instalar(JSON.stringify(p));
  const { modulos, avisos } = await instalador.modulos();
  expect(avisos).toEqual([]);
  return { modulos: [...MODULOS, ...modulos], instalador };
}
const { modulos: CUATRO } = await conInstalados();
const gente = (g: Game, deporte: string) => g.moduleState<NpcsState>('npcs').npcs.filter((n) => n.deporte === deporte && n.genetica);
const principal = (g: Game) => deportePrincipal(g.service<ClubDirectory>(SERVICES.clubes), deportesDeLaPartida(g, CUATRO));
const hacer = (g: Game, id: string) => expect(g.perform(id).ok, id).toBe(true);

describe('cuatro deportes juntos', () => {
  it('los paquetes de prueba son pequeños y el catálogo del juego lista los cuatro deportes', () => {
    for (const p of paquetes) expect(JSON.stringify(p).length).toBeLessThan(150_000);
    expect(catalogoDeDeportes(CUATRO).map((d) => d.id)).toEqual(['atletismo', 'pelota', 'natacion', 'tenis']);
  });

  it('cada deporte tiene su gente, sus equipos llenos y sus entrenadores; nadie juega a dos deportes', () => {
    const g = nuevaPartida({ seed: 31 }, CUATRO);
    expect(deportesDeLaPartida(g, CUATRO)).toEqual(['atletismo', 'pelota', 'natacion', 'tenis']);
    for (const id of ['pelota', 'natacion', 'tenis']) {
      expect(gente(g, id), id).toHaveLength(14);
      expect(g.moduleState<NpcsState>('npcs').npcs.filter((n) => n.role === 'entrenador' && n.deporte === id).length, id).toBe(2);
    }
    expect(gente(g, 'atletismo').length).toBeGreaterThan(50);
    const ids = ['atletismo', 'pelota', 'natacion', 'tenis'].flatMap((d) => gente(g, d).map((n) => n.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(checkInvariants(g)).toEqual([]);
  }, 60000);
});

describe('cambiar de un deporte a otro', () => {
  it('el principal es el del último club; lo que se deja de practicar cae y lo que se practica sube', () => {
    const g = nuevaPartida({ seed: 31 }, CUATRO);
    expect(principal(g) ?? null).toBeNull();
    hacer(g, 'pelota.unirse');
    expect(principal(g)).toBe('pelota');
    for (let i = 0; i < 6; i++) hacer(g, 'pelota.entrenar');
    const alto = g.stat('pelota.tecnica');
    expect(alto).toBeGreaterThan(10);
    hacer(g, 'pelota.salir');
    hacer(g, 'natacion.unirse');
    expect(principal(g)).toBe('natacion');
    for (let i = 0; i < 6; i++) hacer(g, 'natacion.entrenar');
    advanceToWeek(g, 'gen.descansar', g.time.week + 6, 1, 10);
    expect(g.stat('pelota.tecnica')).toBeLessThan(alto); // sin practicarlo, cae
    expect(g.stat('pelota.tecnica')).toBeGreaterThanOrEqual(alto * 0.6); // pero no por debajo de su suelo
    expect(g.stat('natacion.tecnica')).toBeGreaterThan(10);
    expect(checkInvariants(g)).toEqual([]);
  }, 60000);
});

describe('quitar un deporte instalado un año y volver', () => {
  it('lo que valdría si lo hubiera dejado, también después de guardar y cargar con los deportes instalados', () => {
    const g = nuevaPartida({ seed: 31 }, CUATRO);
    for (let i = 0; i < 8; i++) hacer(g, 'tenis.entrenar');
    const alto = g.stat('tenis.tecnica');
    let h = quitarDeporteDeLaPartida(g, 'tenis', CUATRO);
    advanceToWeek(h, 'gen.descansar', 30, 1, 10);
    // Se guarda y se carga con la partida a medias.
    h = cargarPartida(JSON.parse(JSON.stringify(h.serialize())), CUATRO);
    expect(deportesDeLaPartida(h, CUATRO)).toEqual(['atletismo', 'pelota', 'natacion']);
    advanceToWeek(h, 'gen.descansar', 53, 1, 10);
    const caida = h.stat('tenis.tecnica');
    expect(caida).toBeLessThan(alto);
    const vuelve = añadirDeporteALaPartida(h, 'tenis', CUATRO);
    expect(vuelve.stat('tenis.tecnica')).toBe(caida);
    expect(gente(vuelve, 'tenis')).toHaveLength(14);
    expect(new Set(vuelve.moduleState<NpcsState>('npcs').npcs.map((n) => n.id)).size).toBe(vuelve.moduleState<NpcsState>('npcs').npcs.length);
    expect(checkInvariants(vuelve)).toEqual([]);
  }, 120000);
});

describe('un jugador que cambia de deporte cada trimestre', () => {
  it('añade y quita deportes, entra y sale de clubes durante tres cursos y la partida sigue coherente', () => {
    // Empieza solo con el atletismo y va incorporando los demás, dejando el anterior.
    let g = nuevaPartida({ seed: 7, deportes: ['atletismo'] }, CUATRO);
    const turnos = ['pelota', 'natacion', 'tenis', 'atletismo', 'pelota', 'natacion', 'tenis', 'pelota', 'natacion'];
    let anterior: string | undefined;
    for (const id of turnos) {
      if (!deportesDeLaPartida(g, CUATRO).includes(id)) g = añadirDeporteALaPartida(g, id, CUATRO);
      if (anterior && anterior !== id) {
        if (anterior !== 'atletismo') hacer(g, `${anterior}.salir`);
        else g.perform('atletismo.salir');
      }
      if (id !== 'atletismo') {
        hacer(g, `${id}.unirse`);
        for (let i = 0; i < 4; i++) hacer(g, `${id}.entrenar`);
        expect(principal(g)).toBe(id);
      }
      if (anterior && anterior !== id && deportesDeLaPartida(g, CUATRO).length > 1 && anterior !== 'atletismo') g = quitarDeporteDeLaPartida(g, anterior, CUATRO);
      advanceToWeek(g, 'gen.descansar', g.time.week + 12, 1, 10);
      expect(checkInvariants(g), id).toEqual([]);
      anterior = id;
    }
    expect(g.time.week).toBeGreaterThan(100);
    // Todo lo que cae o sube sigue en rango y la gente de cada deporte presente tiene su plantilla.
    for (const id of deportesDeLaPartida(g, CUATRO)) if (id !== 'atletismo') expect(gente(g, id).length, id).toBeGreaterThan(8);
    const ids = g.moduleState<NpcsState>('npcs').npcs.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  }, 300000);
});

describe('lo que cuesta tener cuatro deportes', () => {
  /** Mide una partida: crearla, su tamaño, y lo que cuesta pasar tiempo y hacer acciones. */
  const medir = (modulos: readonly GameModule<any>[]) => {
    const t0 = performance.now();
    const g = nuevaPartida({ seed: 31 }, modulos);
    const creacion = performance.now() - t0;
    const kb = JSON.stringify(g.serialize()).length / 1024;
    const t1 = performance.now();
    advanceToWeek(g, 'gen.descansar', 6, 1, 10);
    const porDia = (performance.now() - t1) / (6 * 7);
    const t2 = performance.now();
    let acciones = 0;
    for (let i = 0; i < 200; i++) {
      g.perform(i % 2 ? 'gen.esperar' : 'gen.descansar');
      acciones++;
    }
    return { creacion, kb, porDia, porAccion: (performance.now() - t2) / acciones };
  };

  it('el tamaño y el coste crecen con los deportes pero de forma razonable (se escribe lo medido en el informe)', () => {
    const uno = medir(MODULOS);
    const cuatro = medir(CUATRO);
    console.info(`1 deporte: crear ${uno.creacion.toFixed(0)} ms · ${uno.kb.toFixed(0)} KB · ${uno.porDia.toFixed(1)} ms/día · ${uno.porAccion.toFixed(2)} ms/acción`);
    console.info(`4 deportes: crear ${cuatro.creacion.toFixed(0)} ms · ${cuatro.kb.toFixed(0)} KB · ${cuatro.porDia.toFixed(1)} ms/día · ${cuatro.porAccion.toFixed(2)} ms/acción`);
    expect(cuatro.kb).toBeLessThan(uno.kb * 1.6); // cada deporte añade unas 14 personas más sus entrenadores
    expect(cuatro.creacion).toBeLessThan(uno.creacion * 3);
    expect(cuatro.porDia).toBeLessThan(uno.porDia * 3);
    expect(cuatro.porAccion).toBeLessThan(Math.max(uno.porAccion * 3, 5));
  }, 120000);
});
