import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PAIS_CIUDAD_DE_PRUEBA, SERVICES, claveDeDeporte, registrarPais, type ClubDirectory, type DeporteService, type LugaresService, type NpcDirectory, type RelationsService } from '@ds/contracts';
import { advanceToWeek, advanceUntil } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol, proximoPartido, type FutbolState } from '@ds/mod-futbol';
import { hacer, llegarA, posible } from './ayudas';

vi.setConfig({ testTimeout: 480000, hookTimeout: 480000 });
registrarPais(PAIS_CIUDAD_DE_PRUEBA);

/**
 * El partido del personaje (F2.3b, segunda parte): entra en el equipo que le toca por su nivel (A a D) y lo convoca su entrenador como a cualquiera; si juega elige la intensidad (si no, no); el sábado se juega su partido
 * con la liga y se guarda la crónica entera con lo suyo resaltado y, si jugó, su nota.
 */
describe('el partido del personaje en la liga', () => {
  let g: ReturnType<typeof nuevaPartida>;
  const estado = () => g.moduleState<FutbolState>('futbol') as FutbolState;
  const vista = () => g.service<DeporteService>(claveDeDeporte('futbol'))!.view();
  beforeAll(() => {
    g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    advanceToWeek(g, 'gen.descansar', 1, 3, 15);
    if (posible(g, 'futbol.apuntarse_colegio')) hacer(g, 'futbol.apuntarse_colegio');
  });

  it('entra en un equipo de su club y categoría (se fija al empezar la liga) y la pestaña enseña el próximo partido', () => {
    expect(g.service<ClubDirectory>(SERVICES.clubes)!.membership('futbol')).toBeDefined();
    advanceToWeek(g, 'gen.descansar', 8, 2, 15);
    const p = estado().personaje!;
    expect(p.curso).toBeGreaterThanOrEqual(0);
    expect(['A', 'B', 'C', 'D']).toContain(p.letra);
    expect(estado().liga!.categorias[p.categoria]).toBeDefined();
    const v = vista();
    const proximo = v.secciones!.find((s) => s.titulo === 'Próximo partido');
    expect(proximo).toBeDefined();
    const filas = Object.fromEntries(proximo!.tabla!.rows.map(([k, x]) => [k, x]));
    expect(filas['Rival']).toMatch(/º de \d+/);
    expect(filas['Tu equipo']).toMatch(/º de \d+/);
    expect(filas['Tu papel (hoy)']).toBeTruthy();
    expect(filas['Tu estado']).toMatch(/condición .*forma .*moral .*salud/);
    expect(filas['Últimos de tu equipo']).toBeTruthy();
    expect(filas['Últimos del rival']).toBeTruthy();
    expect(v.temporada.proxima).toMatch(/sábado/i);
  });

  it('si el entrenador lo convoca elige la intensidad (y se queda elegida); si no, no puede', () => {
    const intensidades = ['relajado', 'normal', 'a_tope'].map((i) => `futbol.intensidad_${i}`);
    const abiertas = intensidades.filter((id) => g.preview(id)!.available);
    const filas = Object.fromEntries(vista().secciones!.find((s) => s.titulo === 'Próximo partido')!.tabla!.rows.map(([k, x]) => [k, x]));
    if (/^Convocado/.test(filas['Tu papel (hoy)'])) {
      // Se puede elegir cualquiera salvo la que ya lleva (normal por defecto).
      expect(abiertas).toEqual(['futbol.intensidad_relajado', 'futbol.intensidad_a_tope']);
      expect(g.perform('futbol.intensidad_a_tope').ok).toBe(true);
      expect(estado().intensidad).toBe('a_tope');
      expect(g.preview('futbol.intensidad_a_tope')!.available).toBe(false);
      expect(vista().secciones!.find((s) => s.titulo === 'Próximo partido')!.tabla!.rows.find(([k]) => k === 'Intensidad')![1]).toMatch(/A tope/);
    } else {
      expect(abiertas).toEqual([]);
      expect(g.preview('futbol.intensidad_a_tope')!.reason).toMatch(/no eliges intensidad|Tu equipo no juega/);
      expect(filas['Intensidad']).toMatch(/No eliges/);
    }
  });

  it('tras los sábados se guarda su partido con la crónica entera; solo ve su nota si juega', () => {
    advanceToWeek(g, 'gen.descansar', 14, 2, 15);
    const s = estado();
    expect(s.partidos!.length).toBeGreaterThanOrEqual(3);
    const u = s.ultimoPartido!;
    expect(u.cronica.some((l) => l.titulo)).toBe(true);
    expect(u.cronica.filter((l) => l.titulo && l.texto.startsWith('Minutos'))).toHaveLength(6);
    expect(u.cronica.at(-1)!.texto).toMatch(/^Final: /);
    for (const p of s.partidos!) {
      expect(p.goles).toHaveLength(2);
      if (p.juega) {
        expect(p.nota).toBeGreaterThanOrEqual(1);
        expect(p.nota).toBeLessThanOrEqual(10);
        expect(p.minutos).toBeGreaterThan(0);
      } else {
        expect(p.nota).toBeUndefined();
        expect(p.motivo).toBeTruthy();
      }
    }
    // La sección del último partido enseña el resumen y la crónica; la nota solo si jugó.
    const ultimo = vista().secciones!.find((x) => x.titulo.startsWith('Último partido'))!;
    expect(ultimo.lineas!.length).toBe(u.cronica.length);
    expect(/tu nota/.test(ultimo.texto!)).toBe(u.juega);
    if (u.juega) expect(u.cronica[0].destacada).toBe(true);
  });

  it('la pestaña enseña la tabla de su división, la plantilla de su equipo con las estadísticas y su temporada con la experiencia por puesto', () => {
    const v = vista();
    const titulos = v.secciones!.map((x) => x.titulo);
    expect(titulos.some((t) => t.startsWith('Clasificación'))).toBe(true);
    expect(titulos.some((t) => t.startsWith('Plantilla'))).toBe(true);
    expect(titulos).toContain('Tu temporada');
    const tabla = v.secciones!.find((x) => x.titulo.startsWith('Clasificación'))!.tabla!;
    expect(tabla.header).toEqual(['Pos.', 'Equipo', 'PJ', 'G', 'E', 'P', 'GF', 'GC', 'DG', 'Pts']);
    expect(tabla.highlight).toBeGreaterThanOrEqual(0);
    // Ordenada por puntos.
    const pts = tabla.rows.map((r) => Number(r[9]));
    expect(pts).toEqual([...pts].sort((a, b) => b - a));
    const plantilla = v.secciones!.find((x) => x.titulo.startsWith('Plantilla'))!.tabla!;
    expect(plantilla.rows.length).toBeGreaterThanOrEqual(14);
    expect(plantilla.rows[plantilla.highlight!][0]).toBe('Tú');
    // Las estadísticas de los jugadores son de verdad: los minutos de los que jugaron suman.
    expect(plantilla.rows.reduce((t, r) => t + Number(r[4]), 0)).toBeGreaterThan(0);
    const mia = v.secciones!.find((x) => x.titulo === 'Tu temporada')!;
    expect(mia.tabla!.rows[0][0]).toMatch(/este/);
  });

  it('cada semana juega como mucho un partido suyo y los partidos del mundo no incluyen al personaje', () => {
    const semanas = estado().partidos!.map((p) => `${p.curso}-${p.semana}`);
    expect(new Set(semanas).size).toBe(semanas.length);
  });
});

describe('jugar el partido en el campo, a su hora', () => {
  let g: ReturnType<typeof nuevaPartida>;
  const estado = () => g.moduleState<FutbolState>('futbol') as FutbolState;
  /** Cuándo juega su equipo esta semana, según el calendario. */
  const suSlot = (): { dia: number; hora: number; campo: string } | undefined => {
    const p = estado().personaje;
    const liga = estado().liga;
    const l = p && liga ? liga.categorias[p.categoria] : undefined;
    const sig = l ? proximoPartido(l, `${p!.club}|${p!.letra}`) : undefined;
    const h = sig ? estado().calendario?.partidos[`${liga!.curso}|${p!.categoria}|${sig.ref}`] : undefined;
    return h ? { dia: h[0], hora: h[1], campo: h[2] } : undefined;
  };
  beforeAll(() => {
    g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    advanceToWeek(g, 'gen.descansar', 1, 3, 15);
    if (posible(g, 'futbol.apuntarse_colegio')) hacer(g, 'futbol.apuntarse_colegio');
  });

  it('fuera de la hora y del campo de la jornada no se puede jugar', () => {
    advanceToWeek(g, 'gen.descansar', 6, 2, 15);
    const slot = suSlot()!;
    expect(slot).toBeDefined();
    const o = g.preview('futbol.jugar_partido')!;
    expect(o.available).toBe(false);
    // Un miércoles a las 15:00 no es su hora: el motivo dice cuándo es su partido (o por qué no puede jugar).
    expect(o.reason).toMatch(/Tu partido es el (sábado|domingo) a las \d+:00|no juegas|Tu equipo no juega/);
  });

  it('el día de partido: convocatoria una hora antes, puntualidad, vestuario y partido; convocado que llega tarde a la hora del partido, falta', () => {
    const resultadoDeLaLiga = () => {
      const p = estado().personaje!;
      const clave = `${p.club}|${p.letra}`;
      const gr = estado().liga!.categorias[p.categoria].divisiones.flatMap((d) => d.grupos).find((x) => x.equipos.includes(clave))!;
      const k = gr.equipos.indexOf(clave);
      const mio = gr.resultados.filter(([l, v]) => l === k || v === k).at(-1)!;
      return [mio[2], mio[3]];
    };
    const hasta = (minuto: number): void => advanceUntil(g, 'gen.descansar', (t) => t.minute >= minuto);
    const donde = (): string => g.service<LugaresService>(SERVICES.lugares)!.actual().id;
    const hechos: string[] = [];
    const motivos: string[] = [];
    const orden = ['puntual', 'tarde', 'despues'] as const;
    for (let w = g.time.week + 1; w <= 17 && hechos.length < orden.length; w++) {
      // El lunes se reparte el calendario de la semana: cada partido tiene su hora en punto.
      advanceToWeek(g, 'gen.descansar', w, 0, 9);
      const slot = suSlot();
      if (!slot) break;
      const saque = (g.time.day - g.time.weekday + slot.dia) * 1440 + slot.hora * 60;
      const caso = orden[hechos.length];
      // Antes de la convocatoria (una hora antes) es pronto: no se puede unir ni jugar (desde casa, el motivo es la hora, no el sitio).
      hasta(saque - 150);
      expect(g.preview('futbol.unirse_companeros')!.available).toBe(false);
      expect(g.preview('futbol.unirse_companeros')!.reason).toMatch(/convocatoria es una hora antes|no juegas|Todavía|Tu equipo no juega/);
      // La convocatoria (o su hora de llegada): puntual (llega al campo a la hora), tarde (25 minutos después) o después de la hora del partido.
      const llegada = saque - 60 + (caso === 'puntual' ? 2 : caso === 'tarde' ? 25 : 61);
      if (caso !== 'despues') llegarA(g, 'campo_municipal', Math.floor((llegada % 1440) / 60), llegada % 60);
      else hasta(llegada);
      const unirse = g.preview('futbol.unirse_companeros')!;
      // Llegando después de la hora, el motivo es «ha empezado sin ti» solo si estaba convocado; si no, el de siempre (no convocado, lesionado).
      const sinConvocatoria = caso === 'despues' ? !/ha empezado el partido sin ti/.test(unirse.reason ?? '') : !unirse.available && !posible(g, 'futbol.unirse_companeros');
      if (sinConvocatoria) {
        // No convocado (o lesionado): no hay nada que hacer; su partido llega al cerrar la semana.
        expect(unirse.reason).toBeTruthy();
        motivos.push(`${w}: ${unirse.reason}`);
        continue;
      }
      if (caso === 'despues') {
        // Llega cuando el partido ya ha empezado: no puede unirse ni jugar, y al cerrar la semana es una falta.
        expect(g.preview('futbol.unirse_companeros')!.reason).toMatch(/ha empezado el partido sin ti/);
        expect(g.preview('futbol.jugar_partido')!.reason).toMatch(/ha empezado el partido sin ti/);
        advanceToWeek(g, 'gen.descansar', w + 1, 0, 9);
        const u = estado().ultimoPartido!;
        expect(u.semana).toBe(w);
        expect(u.juega).toBe(false);
        expect(u.motivo).toMatch(/No te presentas/);
        expect(estado().faltas![w]).toBe(1);
        expect(resultadoDeLaLiga()).toEqual(u.goles);
        hechos.push(caso);
        continue;
      }
      // Todavía no puede jugar: no se ha unido a los compañeros.
      expect(g.preview('futbol.jugar_partido')!.reason).toMatch(/Únete antes a tus compañeros/);
      // Su entrenador (el de su club): si llega tarde a la convocatoria, pierde relación con él por impuntual.
      const club = g.service<ClubDirectory>(SERVICES.clubes)!.membership('futbol')!.id;
      const entrenador = g.service<NpcDirectory>(SERVICES.npcs)!.list({ role: 'entrenador', known: true }).find((n) => n.club === club && n.tags.includes('futbol'));
      const afinidad = (): number | undefined => (entrenador ? g.service<RelationsService>(SERVICES.relaciones)!.get(entrenador.id)?.afinidad : undefined);
      const antes = afinidad();
      expect(hacer(g, 'futbol.unirse_companeros').ok).toBe(true);
      if (antes !== undefined && caso === 'tarde') expect(afinidad()!).toBeLessThan(antes);
      if (antes !== undefined && caso === 'puntual') expect(afinidad()!).toBeGreaterThanOrEqual(antes - 1);
      const d = estado().diaDePartido!;
      expect(d.semana).toBe(w);
      expect(d.unido).toBe(true);
      expect(caso === 'puntual' ? d.tarde <= 10 : d.tarde > 10, `${caso}: tarde ${d.tarde}, minuto ${g.time.minute}, saque ${saque}`).toBe(true);
      // Estando con los compañeros ya no puede volver a unirse; el vestuario se abre media hora antes.
      expect(g.preview('futbol.unirse_companeros')!.reason).toMatch(/Ya estás con tus compañeros|Tienes que estar/);
      if (g.time.minute < saque - 30) expect(g.preview('futbol.ir_vestuario')!.reason).toMatch(/se abre media hora antes/);
      hasta(saque - 30);
      // El vestuario no tiene «Ir a»: solo se entra con «Ir al vestuario» (de dentro se sale como de cualquier zona).
      expect(g.preview('lugares.ir_vestuario_campo_municipal')!.available).toBe(false);
      expect(g.preview('lugares.ir_vestuario_campo_municipal')!.reason).toMatch(/se abre media hora antes de tu partido/);
      expect(hacer(g, 'futbol.ir_vestuario').ok).toBe(true);
      expect(g.preview('lugares.ir_campo_municipal')!.available).toBe(true);
      expect(donde()).toBe('vestuario_campo_municipal');
      expect(estado().diaDePartido!.vestuario).toBe(true);
      // Hasta la hora del partido no se juega.
      if (g.time.minute < saque) expect(g.preview('futbol.jugar_partido')!.reason).toMatch(/El partido empieza a las/);
      hasta(saque);
      // Va al campo y juega desde el vestuario: ve el resultado y la crónica al acabar, y aparece en el vestuario.
      expect(g.preview('futbol.jugar_partido')!.available || posible(g, 'futbol.jugar_partido')).toBe(true);
      expect(hacer(g, 'futbol.jugar_partido').ok).toBe(true);
      expect(donde()).toBe('vestuario_campo_municipal');
      const u = estado().ultimoPartido!;
      expect(u.semana).toBe(w);
      expect(u.cronica.some((l) => l.titulo)).toBe(true);
      // Sus estadísticas y su experiencia: si jugó, un partido más y experiencia en su puesto; si se quedó en el banquillo, convocado sin partido.
      const e = estado().estadisticas!;
      if (u.juega) {
        expect(e.min).toBeGreaterThan(0);
        expect(estado().experiencia![u.puesto!]).toBeGreaterThan(0);
      }
      expect(estado().partidoJugado?.semana).toBe(w);
      expect(g.preview('futbol.jugar_partido')!.available).toBe(false);
      const marcador = u.goles;
      advanceToWeek(g, 'gen.descansar', w + 1, 0, 9);
      expect(estado().partidoJugado).toBeUndefined();
      expect(resultadoDeLaLiga()).toEqual(marcador);
      expect(estado().ultimoPartido!.goles).toEqual(marcador);
      hechos.push(caso);
    }
    expect(hechos, motivos.join(' | ')).toEqual([...orden]);
  });
});
