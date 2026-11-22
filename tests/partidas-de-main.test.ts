import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';
import { PAIS_CIUDAD_DE_PRUEBA, SERVICES, claveDeDeporte, registrarPais, rostroDe, servicioDeComparacion, type ComparacionService, type DeporteService, type NpcDirectory } from '@ds/contracts';
import { SAVE_VERSION, advanceToWeek } from '@ds/core';
import { MODULOS, cargarPartida } from '@ds/game';
import { futbol, type FutbolState } from '@ds/mod-futbol';
import { completarPoblaciones, type NpcsState, type PoblacionGuardada } from '@ds/mod-npcs';
import { deJSON, serializarPartidaPorTrozos } from '../apps/web/src/almacen';
import { leerPresentacion, PREFERENCIAS_POR_DEFECTO } from '../apps/web/src/presentacion';
import { hacer, posible } from './ayudas';

vi.setConfig({ testTimeout: 480000, hookTimeout: 480000 });
registrarPais(PAIS_CIUDAD_DE_PRUEBA);
const mods = [...MODULOS, futbol];

/**
 * Las partidas de la versión publicada (`main`) tienen que seguir cargando con la rama de trabajo (`tests/partidas-guardadas/LEEME.md`): están en el texto JSON de la web, sin lo que se añadió después (dorsales,
 * `Npc.apuntado`, el rasgo `parpado` de la cara, `FutbolState.dorsal` y `companeros`, las familias y las pistas de puestos de las poblaciones guardadas…). Lo que falta se rellena al cargar (`GameModule.alCargar`), sin subir `SAVE_VERSION`.
 */
const leer = (nombre: string) => deJSON(gunzipSync(readFileSync(new URL(`./partidas-guardadas/${nombre}.json.gz`, import.meta.url))).toString('utf8'));
const cargar = (nombre: string) => cargarPartida(leer(nombre).state, mods, { copiar: false });

describe('las partidas guardadas por main cargan y avanzan', () => {
  it('siguen siendo de la versión de guardado actual (si se sube, hay que decidir qué pasa con ellas)', () => {
    expect(leer('main-prueba-nueva').state.version).toBe(SAVE_VERSION);
    expect(leer('main-prueba-semana8').state.version).toBe(SAVE_VERSION);
  });

  it('una partida recién creada: la gente tiene cara (el párpado, que no se guardaba, se lee como medio), y juega ocho semanas', () => {
    const g = cargar('main-prueba-nueva');
    const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
    const gente = dir.list().filter((p) => p.rasgos?.apariencia);
    expect(gente.length).toBeGreaterThan(50);
    for (const p of gente.slice(0, 200)) {
      const r = rostroDe(p.rasgos!.apariencia!);
      expect(r.parpado[0]).toBeCloseTo(0.5, 1);
      expect(Object.values(r).every(([a, b]) => a >= 0 && a <= 1 && b >= 0 && b <= 1)).toBe(true);
    }
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    if (posible(g, 'futbol.apuntarse_colegio')) hacer(g, 'futbol.apuntarse_colegio');
    advanceToWeek(g, 'gen.descansar', 8, 2, 15);
    expect((g.moduleState<FutbolState>('futbol') as FutbolState).personaje).toBeDefined();
  });

  describe('con el personaje en su equipo, ocho semanas después', () => {
    const g = cargar('main-prueba-semana8');
    const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
    const vista = () => g.service<DeporteService>(claveDeDeporte('futbol'))!.view();
    const equipo = () => dir.equipoDelPersonaje!('futbol')!;

    it('la plantilla no queda vacía (sin `apuntado`, todos están apuntados) y todos llevan dorsal, sin repetir', () => {
      const e = equipo();
      const plantilla = dir.plantillaDelEquipo!('futbol', e.club, e.categoria, e.letra);
      expect(plantilla.length).toBeGreaterThanOrEqual(10);
      expect(plantilla.every((j) => j.dorsal !== undefined)).toBe(true);
      expect(new Set(plantilla.map((j) => j.dorsal)).size).toBe(plantilla.length);
      for (const j of plantilla) {
        if (j.puesto === 'GK') expect([1, 13].includes(j.dorsal!) || j.dorsal! >= 16).toBe(true);
        else expect(j.dorsal! >= 2).toBe(true);
      }
    });

    it('«Mi equipo»: el equipo, los compañeros con aspecto y dorsal (también el personaje), sin nombres de desconocidos; la comparación sale «—» hasta verlos jugar', () => {
      const m = vista().miEquipo!;
      expect(m.titulo).toMatch(/^Equipo [A-D] · /);
      expect(m.companeros.length).toBeGreaterThanOrEqual(10);
      expect(m.companeros[0]).toMatchObject({ id: 'personaje', yo: true });
      expect(m.companeros.every((c) => c.dorsal !== undefined)).toBe(true);
      expect(new Set(m.companeros.map((c) => c.dorsal)).size).toBe(m.companeros.length);
      const otros = m.companeros.filter((c) => !c.yo);
      for (const c of otros) {
        expect(c.aspecto).toBeTruthy();
        const n = dir.get(c.id)!;
        if (n.known === false) expect(c.nombre).toBeUndefined();
      }
      const servicio = g.service<ComparacionService>(servicioDeComparacion('futbol'))!;
      for (const c of otros.slice(0, 4)) expect(() => servicio.sobre(c.id)).not.toThrow();
    });

    it('las poblaciones guardadas se completan al cargar con lo que pide ahora el fútbol, sin tocar lo guardado', () => {
      const pob = g.moduleState<NpcsState>('npcs')!.poblaciones!.find((p) => p.deporte === 'futbol')!;
      expect(pob.puestos!.dorsales).toBeDefined();
      expect(pob.puestos!.familias).toBeDefined();
      expect(pob.puestos!.pistas).toBeDefined();
      const original = leer('main-prueba-semana8').state.modules.npcs as NpcsState;
      expect(original.poblaciones!.find((p) => p.deporte === 'futbol')!.puestos!.dorsales).toBeUndefined();
      // Lo que ya había es lo mismo.
      expect(pob.equipos).toEqual(original.poblaciones!.find((p) => p.deporte === 'futbol')!.equipos);
    });

    it('juega semanas con deberes, sesiones del club y partidos, hasta el cambio de curso, sin errores y con equipo en el curso nuevo', () => {
      const deberes = g.listActions().find((o) => o.id.startsWith('estudios.deberes_') && (o.available || posible(g, o.id)));
      expect(deberes).toBeDefined();
      advanceToWeek(g, 'gen.descansar', 9, 1, 17);
      expect(hacer(g, deberes!.id).ok).toBe(true);
      advanceToWeek(g, 'gen.descansar', 11, 3, 15);
      expect(hacer(g, 'futbol.club_sesion').ok).toBe(true);
      advanceToWeek(g, 'gen.descansar', 18, 2, 15);
      // (La ciudad de prueba no monta liga para el benjamín del colegio, ni en una partida nueva: los partidos se comprueban con la ciudad grande, `npm run compat`.)
      expect(vista().miEquipo!.companeros.every((c) => c.dorsal !== undefined)).toBe(true);
      // Cambio de curso (la semana 52 + algo) y unas semanas más.
      advanceToWeek(g, 'gen.descansar', 52 + 6, 2, 15);
      const e = dir.equipoDelPersonaje!('futbol');
      if (e) {
        const plantilla = dir.plantillaDelEquipo!('futbol', e.club, e.categoria, e.letra);
        expect(plantilla.every((j) => j.dorsal !== undefined)).toBe(true);
        expect(new Set(plantilla.map((j) => j.dorsal)).size).toBe(plantilla.length);
      }
      expect(dir.list().length).toBeGreaterThan(100);
    });

    it('se guarda por trozos en un Blob (la web) y la partida vuelve a cargar con el mismo texto', async () => {
      const b = await serializarPartidaPorTrozos(g, []);
      expect(b).not.toBeNull();
      const texto = await b!.blob.text();
      expect(texto).toBe(g.serializarJSON({ formato: 'dinasty-sports', version: SAVE_VERSION, nombre: g.playerName, guardadoEn: JSON.parse(texto).guardadoEn, agenda: [] }));
      const g2 = cargarPartida(deJSON(texto).state, mods, { copiar: false });
      expect(g2.time.week).toBe(g.time.week);
    });
  });
});

describe('completarPoblaciones (la migración suave de las poblaciones guardadas)', () => {
  const fresca = (): PoblacionGuardada => {
    const g = cargar('main-prueba-semana8');
    return g.moduleState<NpcsState>('npcs')!.poblaciones!.find((p) => p.deporte === 'futbol')!;
  };
  it('rellena solo lo que falta, no toca lo guardado y es idempotente', () => {
    const buena = fresca();
    const vieja: PoblacionGuardada = JSON.parse(JSON.stringify(buena));
    delete vieja.puestos!.dorsales;
    delete vieja.puestos!.familias;
    delete vieja.puestos!.pistas;
    for (const c of vieja.categorias ?? []) delete c.apuntarseEnLosDias;
    vieja.nombre = 'fútbol (guardado)';
    const una = completarPoblaciones([vieja], [buena]);
    expect(una[0].puestos).toEqual(buena.puestos);
    expect(una[0].categorias).toEqual(buena.categorias);
    expect(una[0].nombre).toBe('fútbol (guardado)');
    expect(vieja.puestos!.dorsales).toBeUndefined();
    expect(completarPoblaciones(una, [buena])).toBe(una);
    // Un deporte que ya no está cargado se queda como estaba.
    expect(completarPoblaciones([vieja], [])[0]).toBe(vieja);
  });
});

describe('las preferencias de la web guardadas por la versión anterior', () => {
  it('sin las preferencias nuevas se completan con las de por defecto, y lo que no vale se ignora', () => {
    const con = (x: string) => leerPresentacion({ getItem: () => x });
    expect(con(JSON.stringify({ consecuencias: 'nada', fueraDeCaracter: 'normales' }))).toEqual({ ...PREFERENCIAS_POR_DEFECTO, consecuencias: 'nada' });
    expect(con(JSON.stringify({ consecuencias: 'inventada', cuandoSeVaElGrupo: 7 }))).toEqual(PREFERENCIAS_POR_DEFECTO);
    expect(con('no es json')).toEqual(PREFERENCIAS_POR_DEFECTO);
  });
});
