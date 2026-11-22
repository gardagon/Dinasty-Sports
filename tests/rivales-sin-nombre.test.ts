import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PAIS_CIUDAD_DE_PRUEBA, SERVICES, claveDeDeporte, registrarPais, servicioDeComparacion, type ComparacionService, type DeporteService, type NpcDirectory } from '@ds/contracts';
import { advanceToWeek, advanceUntil } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol, proximoPartido, type FutbolState } from '@ds/mod-futbol';
import { conFutbolFuerte, hacer, llegarA, posible } from './ayudas';

vi.setConfig({ testTimeout: 480000, hookTimeout: 480000 });
registrarPais(PAIS_CIUDAD_DE_PRUEBA);

/**
 * Jugar contra alguien no te da su nombre (decidido el 22/11/2026): de todos los del partido, los tuyos y los rivales, se ve su dorsal y cómo son; los rivales quedan apuntados (equipo y dorsal) para reconocerlos si luego te los cruzas;
 * el nombre se sabe como el de cualquiera (presentarse, hablar…). Reglas: `ANEXO_DEPORTE.md` («Los rivales no se conocen al jugar»).
 */
describe('los rivales siguen sin nombre tras jugar contra ellos', () => {
  let g: ReturnType<typeof nuevaPartida>;
  const estado = () => g.moduleState<FutbolState>('futbol') as FutbolState;
  const dir = () => g.service<NpcDirectory>(SERVICES.npcs)!;
  const vista = () => g.service<DeporteService>(claveDeDeporte('futbol'))!.view();
  beforeAll(() => {
    g = conFutbolFuerte(nuevaPartida({ seed: 40, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]), [...MODULOS, futbol]);
    advanceToWeek(g, 'gen.descansar', 1, 3, 15);
    if (posible(g, 'futbol.apuntarse_colegio')) hacer(g, 'futbol.apuntarse_colegio');
    // Va a jugar los partidos a los que lo convocan (llega puntual, se une a los compañeros, pasa al vestuario y juega): así los ve a los dos equipos.
    let jugados = 0;
    for (let w = 6; w <= 24 && jugados < 2; w++) {
      advanceToWeek(g, 'gen.descansar', w, 0, 9);
      const p = estado().personaje;
      const l = p ? estado().liga?.categorias[p.categoria] : undefined;
      const sig = l ? proximoPartido(l, `${p!.club}|${p!.letra}`) : undefined;
      const h = sig ? estado().calendario?.partidos[`${estado().liga!.curso}|${p!.categoria}|${sig.ref}`] : undefined;
      if (!h) continue;
      const saque = (g.time.day - g.time.weekday + h[0]) * 1440 + h[1] * 60;
      advanceUntil(g, 'gen.descansar', (t) => t.minute >= saque - 150);
      const llegada = saque - 60 + 2;
      llegarA(g, 'campo_municipal', Math.floor((llegada % 1440) / 60), llegada % 60);
      if (!posible(g, 'futbol.unirse_companeros')) continue;
      hacer(g, 'futbol.unirse_companeros');
      advanceUntil(g, 'gen.descansar', (t) => t.minute >= saque - 30);
      hacer(g, 'futbol.ir_vestuario');
      advanceUntil(g, 'gen.descansar', (t) => t.minute >= saque);
      if (hacer(g, 'futbol.jugar_partido').ok) jugados++;
    }
    expect(jugados).toBeGreaterThanOrEqual(1);
    advanceToWeek(g, 'gen.descansar', 28, 2, 15);
  });

  it('tras varios partidos, nadie con quien se ha jugado ha pasado a «conocido» solo por jugar', () => {
    const s = estado();
    expect(s.partidos!.length).toBeGreaterThanOrEqual(3);
    const rivales = Object.keys(s.rivales ?? {});
    expect(rivales.length).toBeGreaterThanOrEqual(8);
    // Quien conoce al empezar (el reparto inicial: su entrenador y compañeros presentados por sucesos) no cuenta: se mira a los rivales de otros equipos.
    const desconocidos = rivales.filter((id) => dir().get(id)?.known === false);
    expect(desconocidos.length).toBeGreaterThanOrEqual(Math.floor(rivales.length * 0.8));
  });

  it('de cada rival apunta su equipo, su dorsal (un número que lleva de verdad) y la semana; son pocos datos', () => {
    const s = estado();
    for (const [id, [equipo, dorsal, semana]] of Object.entries(s.rivales!)) {
      expect(typeof equipo).toBe('string');
      expect(Number.isInteger(dorsal) && dorsal >= 1).toBe(true);
      expect(semana).toBeGreaterThanOrEqual(1);
      expect(dir().get(id)).toBeDefined();
    }
    expect(JSON.stringify(s.rivales).length).toBeLessThan(120 * 60);
  });

  it('la crónica no trae nombres de desconocidos: trae su dorsal y cómo son; y sale en todas las líneas del último partido', () => {
    const u = estado().ultimoPartido!;
    const texto = u.cronica.map((l) => l.texto).join('\n');
    const desconocidos = dir().list().filter((n) => n.known === false && n.name.length > 3);
    // Un nombre completo de desconocido (nombre y apellidos) no aparece en el texto.
    for (const n of desconocidos) expect(texto).not.toContain(n.name);
    expect(texto).toMatch(/\b(el|la|vuestro|vuestra) \d+/);
    expect(texto).toMatch(/\((un|una) (niño|niña|chico|chica)[^)]*pelo[^)]*\)/);
    // Cada descripción aparece una sola vez (la primera mención).
    const descripciones = [...texto.matchAll(/\(((?:un|una) [^)]+)\)/g)].map((m) => m[1]);
    expect(new Set(descripciones).size).toBeGreaterThan(0);
  });

  it('en la ficha de Gente, de un rival con quien se ha jugado se sabe qué número llevaba y de qué equipo era (no su nombre)', () => {
    const servicio = g.service<ComparacionService>(servicioDeComparacion('futbol'))!;
    const [id, [equipo, dorsal]] = Object.entries(estado().rivales!).find(([x]) => dir().get(x)?.known === false)!;
    const c = servicio.sobre(id)!;
    expect(c.texto).toMatch(/^Jugaste contra (él|ella): (el|la) \d+ de/);
    expect(c.texto).toContain(String(dorsal));
    expect(c.texto).toContain(equipo.replace(/ [A-D]$/, ''));
    expect(c.texto).not.toContain(dir().get(id)!.name);
    // Y quien no se ha visto en ningún partido ni entrenamiento sigue sin nada.
    const ajeno = dir().list().find((n) => !estado().rivales?.[n.id] && !estado().companeros?.[n.id] && n.known === false)!;
    expect(servicio.sobre(ajeno.id)).toBeUndefined();
  });

  it('la plantilla de la pestaña lleva el dorsal delante de cada jugador y nunca el nombre de un desconocido', () => {
    const tabla = vista().secciones!.find((x) => x.titulo.startsWith('Plantilla'))!.tabla!;
    expect(tabla.rows.every((r) => /^\d+ · /.test(r[0]))).toBe(true);
    for (const n of dir().list().filter((x) => x.known === false)) expect(JSON.stringify(tabla.rows)).not.toContain(n.name);
  });
});
