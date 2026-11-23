/**
 * Hogares (`CiudadDef.hogares`, `docs/relevo/hogares.md`): las familias se generan hacia delante y los niños salen de ellas. Con el dato desactivado el mundo es el de siempre.
 */
import { describe, expect, it } from 'vitest';
import {
  CIUDAD_DE_PRUEBA, ID_PAIS_CIUDAD_DE_PRUEBA, ID_PAIS_CIUDAD_DE_PRUEBA_CON_HOGARES, PAIS_CIUDAD_DE_PRUEBA, PAIS_CIUDAD_DE_PRUEBA_CON_HOGARES, RASGOS_DE_ROSTRO, SERVICES, idsDeColegiosDeFuera, registrarPais, rostroDe,
  type NpcDirectory,
} from '@ds/contracts';
import { MODULOS, cargarPartida, nuevaPartida } from '@ds/game';
import { edadNpc, esProgenitorDeHogar, type Npc, type NpcsState } from '@ds/mod-npcs';

registrarPais(PAIS_CIUDAD_DE_PRUEBA);
registrarPais(PAIS_CIUDAD_DE_PRUEBA_CON_HOGARES);

const crear = (pais: string, seed = 5) => nuevaPartida({ seed, pais, deportes: ['atletismo'] });
/** Avanza hasta que se renueva el curso (entran niños nuevos) o pasa un año y medio. */
function hastaElCursoSiguiente(g: ReturnType<typeof crear>, hecho: () => boolean): void {
  const limite = g.time.day + 550;
  while (g.time.day < limite && !hecho()) g.perform('gen.descansar');
}
const estado = (g: ReturnType<typeof crear>) => g.moduleState<NpcsState>('npcs');

describe('hogares', () => {
  const g = crear(ID_PAIS_CIUDAD_DE_PRUEBA_CON_HOGARES);
  const s = estado(g);
  const porId = new Map(s.npcs.map((n) => [n.id, n]));
  const hijos = s.npcs.filter((n) => n.hogar && !esProgenitorDeHogar(n));
  const edad = (n: Npc) => edadNpc(n, 0) ?? 0;

  it('con el dato desactivado no hay hogares y la ciudad es la de siempre', () => {
    const sin = estado(crear(ID_PAIS_CIUDAD_DE_PRUEBA));
    expect(sin.hogares).toBeUndefined();
    expect(sin.npcs.some((n) => n.hogar || n.padres || n.herencia)).toBe(false);
    expect(CIUDAD_DE_PRUEBA.hogares).toBeUndefined();
  });

  it('los niños que piden los colegios salen de familias: la demanda queda cubierta por edad', () => {
    expect(s.hogares).toBeDefined();
    const c = PAIS_CIUDAD_DE_PRUEBA_CON_HOGARES.ciudad!;
    const colegios = idsDeColegiosDeFuera(c).length;
    // De 8 a 17 años van a un colegio: el del personaje (clases de `alumnosPorAula`; él es uno) y los de fuera; los de 18 y 19, sin colegio.
    const deEdad = (e: number) => hijos.filter((n) => edad(n) === e).length;
    for (let e = 9; e < 18; e++) expect(deEdad(e)).toBeGreaterThanOrEqual(c.aulasPorCurso * c.alumnosPorAula + colegios * c.alumnosPorCursoDeCadaColegio);
    expect(deEdad(18)).toBe(colegios * c.alumnosPorCursoDeCadaColegio);
    expect(deEdad(19)).toBe(colegios * c.alumnosPorCursoDeCadaColegio);
  });

  it('cada hijo tiene a sus progenitores en casa (uno si el hogar es monoparental, con el motivo guardado del que falta)', () => {
    for (const h of hijos) {
      expect(h.padres!.length).toBeGreaterThanOrEqual(1);
      expect(h.padres!.length).toBeLessThanOrEqual(2);
      for (const id of h.padres!) { expect(porId.get(id)?.hogar).toBe(h.hogar); expect(esProgenitorDeHogar(porId.get(id)!)).toBe(true); }
      const hogar = s.hogares![h.hogar!];
      if (h.padres!.length === 1) expect(hogar.ausente?.motivo).toMatch(/separado|fallecido|desconocido/);
      else expect(hogar.ausente).toBeUndefined();
    }
  });

  it('los hermanos comparten apellidos (salvo la forma femenina) y su cara viene de sus padres', () => {
    const porHogar = new Map<string, Npc[]>();
    for (const h of hijos.filter((n) => n.rasgos)) porHogar.set(h.hogar!, [...(porHogar.get(h.hogar!) ?? []), h]);
    let conHermanos = 0;
    let rasgos = 0;
    for (const [id, hs] of porHogar) {
      const padres = (hs[0].padres ?? []).map((p) => porId.get(p)!);
      if (hs.length > 1) conHermanos++;
      for (const h of hs) {
        if (padres.length < 2) continue; // el progenitor que falta no es una persona: su cara no está para comparar
        const r = rostroDe(h.rasgos!.apariencia);
        const pa = rostroDe(padres[0].rasgos!.apariencia);
        const ma = rostroDe(padres[1].rasgos!.apariencia);
        for (const k of RASGOS_DE_ROSTRO) { expect([...pa[k], ...ma[k]].some((v) => Math.abs(v - r[k][0]) < 1e-9), `${id} ${k}`).toBe(true); rasgos++; }
      }
    }
    expect(conHermanos).toBeGreaterThan(10);
    expect(rasgos).toBeGreaterThan(1000);
  });

  it('los hermanos pequeños son personas con hogar, genética y sin colegio hasta cumplir 8 años', () => {
    const pequenos = hijos.filter((n) => edad(n) < 8);
    expect(pequenos.length).toBeGreaterThan(10);
    for (const n of pequenos) { expect(n.genetica).toBeDefined(); expect(n.colegio).toBeUndefined(); expect(n.tipos?.some((t) => t.tipo === 'vecino' && t.escolar)).toBeFalsy(); }
  });

  it('el servicio de personas da la familia de una persona', () => {
    const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
    const hijo = hijos.find((n) => edad(n) >= 8 && n.padres && n.padres.length === 2)!;
    const fam = dir.familiaDe!(hijo.id)!;
    expect(fam.progenitores).toEqual(hijo.padres);
    const padre = dir.familiaDe!(hijo.padres![0])!;
    expect(padre.hijos).toContain(hijo.id);
    expect(dir.familiaDe!('tutor')).toBeUndefined();
  });

  it('los compañeros del reparto inicial tienen familia y conservan su papel', () => {
    for (const id of ['companero_estudio', 'companero_social']) {
      const n = porId.get(id)!;
      expect(n.hogar).toBeDefined();
      expect(n.tipos).toEqual([expect.objectContaining({ tipo: 'alumno', tuClase: true })]);
    }
  });

  it('guardar y cargar conserva los hogares, y un curso entero renueva la gente sin dejar hijos sin progenitor', () => {
    const copia = cargarPartida(structuredClone(g.serialize()), MODULOS);
    expect(estado(copia).hogares).toEqual(s.hogares);
    hastaElCursoSiguiente(copia, () => Object.keys(estado(copia).familiasPorCurso ?? {}).length >= 1);
    const despues = estado(copia);
    const lista = new Map(despues.npcs.map((n) => [n.id, n]));
    expect(Object.keys(despues.familiasPorCurso ?? {}).length).toBeGreaterThanOrEqual(1);
    for (const n of despues.npcs.filter((x) => x.hogar && !esProgenitorDeHogar(x))) {
      expect(n.padres!.some((id) => lista.has(id)), n.id).toBe(true);
      expect(despues.hogares![n.hogar!]).toBeDefined();
    }
    const alumnos = despues.npcs.filter((n) => n.hogar && !esProgenitorDeHogar(n) && edadNpc(n, copia.time.day) === 8 && n.colegio !== undefined || (n.role === 'companero' && n.hogar && edadNpc(n, copia.time.day) === 8)).length;
    expect(alumnos).toBeGreaterThan(0);
  });

  it('una partida anterior, sin hogares, carga y pasa un curso como antes', () => {
    const vieja = crear(ID_PAIS_CIUDAD_DE_PRUEBA);
    const copia = cargarPartida(structuredClone(vieja.serialize()), MODULOS);
    const dia0 = copia.time.day;
    hastaElCursoSiguiente(copia, () => copia.time.day > dia0 + 400);
    expect(estado(copia).hogares).toBeUndefined();
    expect(estado(copia).npcs.some((n) => n.hogar)).toBe(false);
  });
});
