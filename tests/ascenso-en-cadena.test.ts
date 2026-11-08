import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PAIS_CIUDAD_DE_PRUEBA, registrarPais } from '@ds/contracts';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol, rendimiento as rendimientoDeFutbol, rendimientoPorPuestos } from '@ds/mod-futbol';
import { DIAGNOSTICO, completarEquipos, cubrirGruposVacios, edadDeJuego, edadNpc, fichajesDeVerano, sinDeporte, valoracionDe, type MercadoDeFichajes, type Npc, type NpcsState, type PoblacionGuardada } from '@ds/mod-npcs';

vi.setConfig({ testTimeout: 240000, hookTimeout: 240000 });
registrarPais(PAIS_CIUDAD_DE_PRUEBA);

/**
 * Continuidad de los equipos (`CIUDAD_Y_LIGAS.md` §5, decisión del usuario, 08/11/2026): probar fuera no hace perder la plaza, y antes de cerrar un equipo se completa con la bolsa y con el ascenso en cadena del que
 * sería titular en la categoría de arriba (con los límites de no dejar el equipo de abajo por debajo de 14 ni entrar en un equipo completo).
 */
const REND = new Map([['futbol', Object.assign((p: Parameters<typeof rendimientoDeFutbol>[0]) => rendimientoDeFutbol(p), { puestos: rendimientoPorPuestos })]]);
const rngNulo = { next: () => 0.5, int: () => 0, range: () => 0, chance: () => false, pick: <T,>(x: readonly T[]) => x[0], normal: () => 0 };

describe('probar fuera no hace perder la plaza', () => {
  it('quien va a probar a otro club y no lo cogen sigue en su equipo (solo la pierde si otro mejor se la quita)', () => {
    const g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    const s = g.moduleState<NpcsState>('npcs') as NpcsState;
    const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
    const probados: { id: string; desde: string; entra: boolean }[] = [];
    const desplazados = new Set<string>();
    DIAGNOSTICO.alProbar = (d) => probados.push({ id: d.id, desde: d.desde, entra: d.entra });
    DIAGNOSTICO.alDesplazar = (d) => desplazados.add(d.id);
    try {
      for (let curso = 1; curso <= 4; curso++) {
        const m: MercadoDeFichajes = { lista: new Map(s.npcs.map((n) => [n.id, n])), pobs: [pob], dia: 0, val: valoracionDe(REND), reservas: new Map() };
        fichajesDeVerano(m, 7, curso);
        const entraron = new Set(probados.filter((x) => x.entra).map((x) => x.id));
        for (const p of probados.splice(0)) {
          if (entraron.has(p.id)) continue; // un mismo niño puede probar en dos clubes: lo que cuenta es si lo cogió alguno
          const n = m.lista.get(p.id)!;
          // Sigue en el club donde estaba, salvo que otro mejor le haya quitado la plaza.
          if (!desplazados.has(p.id)) expect(n.equipo, `${p.id} probó y no lo cogieron`).toBe(p.desde);
        }
      }
    } finally {
      DIAGNOSTICO.alProbar = DIAGNOSTICO.alDesplazar = undefined;
    }
  });

  it('cambian de club algunos de cada equipo, y menos en los colegios (pesan los amigos)', () => {
    const g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    const s = g.moduleState<NpcsState>('npcs') as NpcsState;
    const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
    const intentos = new Map<string, number>();
    DIAGNOSTICO.alProbar = (d) => { if (d.entra) intentos.set(d.desde, (intentos.get(d.desde) ?? 0) + 1); };
    try {
      for (let curso = 1; curso <= 6; curso++) fichajesDeVerano({ lista: new Map(s.npcs.map((n) => [n.id, n])), pobs: [pob], dia: 0, val: valoracionDe(REND), reservas: new Map() }, 3, curso);
    } finally {
      DIAGNOSTICO.alProbar = undefined;
    }
    const jugadores = (club: string) => s.npcs.filter((n) => n.deporte === 'futbol' && n.equipo === club).length;
    const tasa = (colegio: boolean) => {
      const clubes = pob.equipos.filter((e) => e.plantillaPorCategoria && (e.colegio !== undefined) === colegio);
      return clubes.reduce((t, e) => t + (intentos.get(e.club) ?? 0), 0) / Math.max(1, clubes.reduce((t, e) => t + jugadores(e.club), 0)) / 6;
    };
    expect(tasa(false)).toBeGreaterThan(0.01);
    expect(tasa(true)).toBeLessThan(tasa(false));
  });
});

describe('completar antes de cerrar: el ascenso en cadena', () => {
  let g: ReturnType<typeof nuevaPartida>;
  beforeAll(() => {
    g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  });
  const estado = () => g.moduleState<NpcsState>('npcs') as NpcsState;
  const pob = (): PoblacionGuardada => estado().poblaciones!.find((p) => p.deporte === 'futbol')!;
  const cat = (id: string) => pob().categorias!.find((c) => c.id === id)!;
  const del = (m: MercadoDeFichajes, club: string, id: string) => [...m.lista.values()].filter((n) => n.deporte === 'futbol' && n.equipo === club && (edadDeJuego(n, 0) ?? -1) >= cat(id).edadMin && (edadDeJuego(n, 0) ?? -1) <= cat(id).edadMax);
  const CLUB = 'club_mediano';

  /** Una estrella: vale 99 en todos los puestos (con el puesto que se le da). */
  const estrella = (n: Npc, puesto: string): Npc => ({ ...n, puesto: { futbol: puesto }, puestoFavorito: { futbol: puesto }, vp: { futbol: { valor: 99, puestos: Object.fromEntries(pob().puestos!.puestos.map((p) => [p.id, 99])) } } });

  /**
   * El club mediano con `infantiles` jugadores de infantil (el resto, a la bolsa, que no quiere jugar), un solo equipo, `alevines` de alevín (traídos de otros clubes si hace falta, de 14 a 18 sin estrellas)
   * y `estrellas` alevines de segundo año que valen 99 (en puestos distintos, para que sean titulares).
   */
  const escenario = (infantiles: number, alevines: number, estrellas: number) => {
    const p0 = pob();
    const p: PoblacionGuardada = { ...p0, equipos: p0.equipos.map((e) => (e.club === CLUB ? { ...e, equiposPorCategoria: undefined } : e)) };
    const lista = new Map(estado().npcs.map((n) => [n.id, n]));
    for (const n of [...lista.values()].filter((x) => x.deporte === 'futbol' && x.equipo === CLUB && (edadNpc(x, 0) ?? -1) >= cat('infantil').edadMin && (edadNpc(x, 0) ?? -1) <= cat('infantil').edadMax).slice(infantiles)) lista.set(n.id, sinDeporte(n, p0, false));
    const e0 = p.equipos.find((e) => e.club === CLUB)!;
    // Los alevines del club: exactamente `alevines` (los que sobran, fuera; los que faltan, de otros clubes de la ciudad).
    const alevinesDelClub = (): Npc[] => [...lista.values()].filter((n) => n.deporte === 'futbol' && n.equipo === CLUB && (edadNpc(n, 0) ?? -1) >= cat('alevin').edadMin && (edadNpc(n, 0) ?? -1) <= cat('alevin').edadMax);
    for (const n of alevinesDelClub().slice(alevines)) lista.set(n.id, sinDeporte(n, p0, false));
    for (const n of [...lista.values()].filter((x) => x.deporte === 'futbol' && x.equipo !== CLUB && x.equipo !== 'colegio' && !x.id.startsWith('personaje@') && (edadNpc(x, 0) ?? -1) >= cat('alevin').edadMin && (edadNpc(x, 0) ?? -1) <= cat('alevin').edadMax)) {
      if (alevinesDelClub().length >= alevines) break;
      lista.set(n.id, { ...n, equipo: CLUB, club: e0.nombre });
    }
    // Nadie de la bolsa quiere jugar: así solo cuenta el ascenso.
    for (const [id, n] of lista) if (n.genetica && n.deporte === undefined) lista.set(id, { ...n, rasgos: n.rasgos && { ...n.rasgos, intereses: {} }, dejado: undefined, apartado: undefined });
    expect(alevinesDelClub()).toHaveLength(alevines);
    const segundoAnio = alevinesDelClub().filter((n) => edadNpc(n, 0) === cat('alevin').edadMax);
    const puestos = ['GK', 'CB', 'CM', 'ST', 'LB'];
    const ids = segundoAnio.slice(0, estrellas).map((n, i) => {
      lista.set(n.id, estrella(n, puestos[i]));
      return n.id;
    });
    expect(ids).toHaveLength(estrellas);
    const m: MercadoDeFichajes = { lista, pobs: [p], dia: 0, val: valoracionDe(REND), reservas: new Map() };
    return { m, ids };
  };

  it('con el infantil en riesgo, suben los alevines de segundo año que serían titulares y el equipo se salva', () => {
    const { m, ids } = escenario(11, 22, 4);
    expect(del(m, CLUB, 'infantil')).toHaveLength(11);
    completarEquipos(m, rngNulo, { conPrueba: false });
    expect(del(m, CLUB, 'infantil').length).toBeGreaterThanOrEqual(14);
    // Suben los que hacen falta (los dos de la regla general y los que pide salvar el equipo): al menos tres de los cuatro; juegan con los de infantil, no con los de alevín, y siguen en su club.
    const suben = ids.filter((id) => m.lista.get(id)!.adelanto?.futbol === 1);
    expect(suben.length).toBeGreaterThanOrEqual(3);
    for (const id of suben) {
      expect(del(m, CLUB, 'alevin').some((n) => n.id === id)).toBe(false);
      expect(m.lista.get(id)!.equipo).toBe(CLUB);
    }
    // El equipo de abajo sigue con 14 o más.
    expect(del(m, CLUB, 'alevin').length).toBeGreaterThanOrEqual(14);
  });

  it('el equipo de abajo no se deja por debajo de 14 si no hay bolsa que lo reponga: no sube nadie y el infantil se cierra', () => {
    const { m, ids } = escenario(11, 14, 4);
    completarEquipos(m, rngNulo, { conPrueba: false });
    for (const id of ids) expect(m.lista.get(id)!.adelanto, id).toBeUndefined();
    expect(del(m, CLUB, 'alevin').length).toBeGreaterThanOrEqual(14);
    expect(del(m, CLUB, 'infantil')).toHaveLength(0); // ni así llega a 14: solo se cierra cuando no hay otra salida
  });

  it('si ni subiendo a los titulares se llega a 14, el equipo se cierra y los que habían subido vuelven a su equipo', () => {
    const { m, ids } = escenario(5, 22, 2);
    completarEquipos(m, rngNulo, { conPrueba: false });
    expect(del(m, CLUB, 'infantil')).toHaveLength(0);
    for (const id of ids) {
      expect(m.lista.get(id)!.adelanto, id).toBeUndefined();
      expect(m.lista.get(id)!.equipo).toBe(CLUB);
    }
  });

  it('quien sube juega un año por encima: su categoría y su año son los de arriba', () => {
    const { m, ids } = escenario(11, 22, 4);
    completarEquipos(m, rngNulo, { conPrueba: false });
    const n = m.lista.get(ids.find((id) => m.lista.get(id)!.adelanto)!)!;
    expect(edadDeJuego(n, 0)).toBe((edadNpc(n, 0) ?? 0) + 1);
    expect(edadDeJuego(n, 0)).toBe(cat('infantil').edadMin);
  });
});

describe('un grupo de puestos vacío lo cubre el que mejor se adapte de los no titulares', () => {
  it('un equipo sin portero: uno de los suplentes pasa a la portería (y el equipo sigue con sus jugadores)', () => {
    const g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    const s = g.moduleState<NpcsState>('npcs') as NpcsState;
    const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
    const cat = pob.categorias!.find((c) => c.id === 'infantil')!;
    const edades = [12, 13];
    const lista = new Map(s.npcs.map((n) => [n.id, n]));
    const del = () => [...lista.values()].filter((n) => n.deporte === 'futbol' && n.equipo === 'club_mediano' && (edadDeJuego(n, 0) ?? -1) >= cat.edadMin && (edadDeJuego(n, 0) ?? -1) <= cat.edadMax);
    // Nadie del club juega de portero: los porteros pasan a central.
    for (const n of del().filter((x) => x.puesto?.futbol === 'GK')) lista.set(n.id, { ...n, puesto: { futbol: 'CB' } });
    const m: MercadoDeFichajes = { lista, pobs: [pob], dia: 0, val: valoracionDe(REND), reservas: new Map() };
    const antes = del().length;
    expect(del().some((n) => n.puesto?.futbol === 'GK')).toBe(false);
    const cambios = cubrirGruposVacios(m, pob, 'infantil', edades);
    expect(cambios).toBeGreaterThan(0);
    expect(del().some((n) => n.puesto?.futbol === 'GK')).toBe(true);
    expect(del()).toHaveLength(antes);
  });
});
