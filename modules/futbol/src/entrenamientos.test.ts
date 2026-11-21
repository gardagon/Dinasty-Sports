import { describe, expect, it } from 'vitest';
import { elegirEjercicios } from '@ds/kit-deporte';
import { EJERCICIOS_DE_FUTBOL } from './ejercicios';
import { ENTRENAMIENTOS_DE_FUTBOL, GRUPOS_DE_ENTRENAMIENTO, PUESTO_DE_PORTERO, ejercicioDelClub, entrenaPorLibre, entrenamientoPorId } from './entrenamientos';
import { QUEDADAS_DE_FUTBOL } from './quedadas';
import { PUESTOS_DE_FUTBOL } from './puestos';
import { STATS_DE_FUTBOL } from './habilidades';
import { EFICIENCIA_POR_TU_CUENTA } from '@ds/kit-deporte';

const suma = (xs: readonly { stat: string; amount: number }[]) => xs.filter((x) => x.stat.startsWith('futbol.') && x.stat !== 'futbol.conocimiento').reduce((t, x) => t + x.amount, 0);
const HABILIDADES = STATS_DE_FUTBOL.filter((s) => s.category === 'habilidad').map((s) => s.id);

describe('el catálogo de 22 entrenamientos', () => {
  it('son 22: portería 5, físico 5, mental 4 y técnico 8, con ids y claves únicos', () => {
    expect(ENTRENAMIENTOS_DE_FUTBOL).toHaveLength(22);
    const por = (g: string) => ENTRENAMIENTOS_DE_FUTBOL.filter((e) => e.grupo === g).length;
    expect([por('porteria'), por('fisico'), por('mental'), por('tecnico')]).toEqual([5, 5, 4, 8]);
    expect(new Set(ENTRENAMIENTOS_DE_FUTBOL.map((e) => e.id)).size).toBe(22);
    expect(new Set(ENTRENAMIENTOS_DE_FUTBOL.map((e) => e.clave)).size).toBe(22);
    expect(Object.values(GRUPOS_DE_ENTRENAMIENTO)).toEqual(['Portería', 'Físico', 'Mental', 'Técnico']);
  });

  it('cada uno dice dónde, con quién, cuánto dura y cuánto cansa; lo que sube existe', () => {
    const stats = new Set([...STATS_DE_FUTBOL.map((s) => s.id), 'gen.velocidad', 'gen.resistencia', 'gen.fuerza', 'gen.agilidad', 'gen.coordinacion', 'gen.concentracion', 'gen.comunicacion']);
    for (const e of ENTRENAMIENTOS_DE_FUTBOL) {
      expect(e.lugares.length, e.id).toBeGreaterThan(0);
      expect(e.quien.length, e.id).toBeGreaterThan(0);
      expect(e.minutos, e.id).toBeGreaterThanOrEqual(45);
      expect(e.energia, e.id).toBeGreaterThan(0);
      for (const [stat, amount] of e.entrena) {
        expect(stats.has(stat), `${e.id}: ${stat}`).toBe(true);
        expect(amount).toBeGreaterThan(0);
      }
    }
  });

  it('las 29 habilidades suben en algún entrenamiento o en alguna quedada (nada queda sin trabajo)', () => {
    const suben = new Set([...ENTRENAMIENTOS_DE_FUTBOL.flatMap((e) => e.entrena.map(([s]) => s)), ...QUEDADAS_DE_FUTBOL.flatMap((q) => q.entrena.map((x) => x.stat))]);
    expect(HABILIDADES).toHaveLength(29);
    expect(HABILIDADES.filter((h) => !suben.has(h))).toEqual([]);
  });

  it('«Tiro a puerta» es tiro, no balón parado: el balón parado tiene su entrenamiento', () => {
    const tiro = entrenamientoPorId('tiro_a_puerta')!;
    const balonParado = ['futbol.faltas', 'futbol.penaltis', 'futbol.corners', 'futbol.saque_banda'];
    expect(tiro.entrena.some(([s]) => balonParado.includes(s))).toBe(false);
    expect(entrenamientoPorId('balon_parado')!.entrena.map(([s]) => s)).toEqual(expect.arrayContaining(balonParado));
  });

  it('cada puesto tiene al menos tres entrenamientos que le suben lo que pesa', () => {
    for (const p of PUESTOS_DE_FUTBOL.puestos) {
      const pesa = Object.entries(p.pesos).sort((a, b) => b[1] - a[1]).slice(0, 4); // sus cuatro habilidades que más pesan
      const utiles = ENTRENAMIENTOS_DE_FUTBOL.filter((e) => (!e.soloPuesto || e.soloPuesto === p.id) && (!e.noPara || e.noPara !== p.id) && e.entrena.some(([s]) => pesa.some(([k]) => k === s)));
      expect(utiles.length, p.id).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('el club rinde al menos como entrenar por libre, por hora', () => {
  it('cada entrenamiento que se hace por libre y en el club rinde más en el club (sin el ×0,85 de entrenar solo)', () => {
    const ambos = ENTRENAMIENTOS_DE_FUTBOL.filter((e) => e.quien.includes('solo') && e.quien.includes('club'));
    expect(ambos.length).toBeGreaterThan(8);
    for (const e of ambos) {
      const porLibreAlaHora = (suma(entrenaPorLibre(e)) * 60 * EFICIENCIA_POR_TU_CUENTA) / e.minutos;
      const clubALaHora = suma(ejercicioDelClub(e).entrena);
      expect(clubALaHora, e.id).toBeGreaterThanOrEqual(porLibreAlaHora - 1e-9);
    }
  });
});

describe('el portero entrena lo suyo', () => {
  const nivel = () => 20;
  const semillas = Array.from({ length: 60 }, (_, i) => ['futbol', 'club', 'cat', i, 0]);

  it('en la sesión del club hace un ejercicio de portería y nunca los de campo; el de campo nunca hace los de portería', () => {
    for (const semilla of semillas) {
      const portero = elegirEjercicios(EJERCICIOS_DE_FUTBOL, { nivel, semilla, puesto: PUESTO_DE_PORTERO });
      expect(portero.some((e) => e.foco === 'porteros'), semilla.join()).toBe(true);
      expect(portero.some((e) => entrenamientoPorId(e.id)!.grupo === 'tecnico'), semilla.join()).toBe(false);
      const defensa = elegirEjercicios(EJERCICIOS_DE_FUTBOL, { nivel, semilla, puesto: 'CB' });
      expect(defensa.some((e) => e.foco === 'porteros'), semilla.join()).toBe(false);
    }
  });

  it('los ejercicios de portería suben lo que pesa en el portero (reflejos, blocaje, mano a mano, alcance, dominio del área)', () => {
    const peso = PUESTOS_DE_FUTBOL.puestos.find((p) => p.id === PUESTO_DE_PORTERO)!.pesos;
    for (const e of ENTRENAMIENTOS_DE_FUTBOL.filter((x) => x.grupo === 'porteria')) {
      const util = e.entrena.filter(([s]) => (peso[s] ?? 0) > 0).reduce((t, [, v]) => t + v, 0);
      expect(util / e.entrena.filter(([s]) => s !== 'futbol.conocimiento').reduce((t, [, v]) => t + v, 0), e.id).toBeGreaterThan(0.4); // «Pies de portero» sube también pase, control y visión, que hoy no pesan en el portero (recomendación D del informe)
    }
  });
});

describe('las quedadas de fútbol', () => {
  it('ids sin puntos y con el prefijo del deporte, en sitios donde se puede jugar, con lo que se juega', () => {
    expect(QUEDADAS_DE_FUTBOL.length).toBeGreaterThanOrEqual(4);
    for (const q of QUEDADAS_DE_FUTBOL) {
      expect(q.id).toMatch(/^futbol_[a-z_]+$/);
      expect(q.tags).toContain('futbol');
      expect(Object.keys(q.lugares).every((l) => ['parque', 'campo_colegio', 'campo_municipal'].includes(l))).toBe(true);
      expect(q.entrena.length).toBeGreaterThan(0);
    }
    // Lo que sube sale de lo que se juegue: cada forma de jugar sube algo distinto.
    expect(new Set(QUEDADAS_DE_FUTBOL.map((q) => q.entrena.map((x) => x.stat).sort().join())).size).toBe(QUEDADAS_DE_FUTBOL.length);
  });

  it('se mejora mucho menos que entrenando', () => {
    for (const q of QUEDADAS_DE_FUTBOL) expect(suma(q.entrena)).toBeLessThan(0.3 * suma(entrenaPorLibre(entrenamientoPorId('toques_y_pared')!)) * 2);
  });
});
