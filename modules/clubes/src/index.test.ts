import { describe, expect, it } from 'vitest';
import { SERVICES, SHARED_EVENTS, TAGS, defineModule, type ClubDirectory } from '@ds/contracts';
import { Game } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { clubes, CLUBES_ESPANA } from './index';

/** Un deporte mínimo de prueba: solo pide entrar en un club y tiene una sesión de club. */
const deporteDePrueba = defineModule({
  id: 'prueba',
  name: 'Prueba',
  dependsOn: ['gen'],
  actions: [
    {
      id: 'prueba.unirse',
      name: 'Unirse',
      tags: [],
      duration: 10,
      run: (ctx) => ctx.emit({ type: SHARED_EVENTS.CLUB_JOIN, data: { sport: 'atletismo', clubId: 'club_ciudad' } }),
    },
    {
      id: 'prueba.salir',
      name: 'Salir',
      tags: [],
      duration: 10,
      run: (ctx) => ctx.emit({ type: SHARED_EVENTS.CLUB_LEAVE, data: { sport: 'atletismo' } }),
    },
    { id: 'prueba.sesion', name: 'Sesión', tags: [TAGS.club, 'atletismo'], duration: 60 },
  ],
});

const nueva = () => Game.create([personaje, clubes, deporteDePrueba], { seed: 2 });
const dir = (g: Game) => g.service<ClubDirectory>(SERVICES.clubes)!;

describe('módulo clubes', () => {
  it('funciona solo con el módulo base y empieza sin club', () => {
    const g = Game.create([personaje, clubes], { seed: 1 });
    expect(dir(g).membership('atletismo')).toBeUndefined();
    expect(dir(g).list('atletismo').map((c) => c.id)).toEqual(['colegio', 'club_ciudad', 'club_alto_rendimiento']);
    expect(dir(g).list('futbol')).toHaveLength(0);
  });

  it('el club del colegio es el de menor nivel y los de fuera exigen nivel y edad', () => {
    const colegio = CLUBES_ESPANA.find((c) => c.esColegio)!;
    expect(colegio.calidad).toBe(1);
    expect(colegio.acceso).toBeUndefined();
    for (const c of CLUBES_ESPANA.filter((x) => !x.esColegio)) {
      expect(c.calidad).toBeGreaterThan(colegio.calidad);
      expect(c.acceso!.atletismo.nivel).toBeGreaterThan(0);
    }
  });

  it('un deporte puede pedir entrar y salir de un club', () => {
    const g = nueva();
    expect(g.perform('prueba.unirse').ok).toBe(true);
    expect(dir(g).membership('atletismo')?.id).toBe('club_ciudad');
    expect(g.log.some((l) => /Ya eres del Club Atletismo Ciudad/.test(l.text))).toBe(true);
    expect(g.perform('prueba.salir').ok).toBe(true);
    expect(dir(g).membership('atletismo')).toBeUndefined();
  });

  it('las sesiones de un club de fuera rinden más que las del colegio', () => {
    const g = nueva();
    const sin = g.preview('prueba.sesion')!.efficiency;
    g.perform('prueba.unirse');
    const conClub = g.preview('prueba.sesion')!;
    expect(conClub.efficiency).toBeGreaterThan(sin);
    expect(conClub.modifiers.some((m) => m.id === 'clubes.calidad')).toBe(true);
  });
});
