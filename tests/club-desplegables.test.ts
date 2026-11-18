import { describe, expect, it } from 'vitest';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';

/** Las pruebas de acceso y las plazas de cada club van en un desplegable «Club» (los ids de las acciones no cambian); el resto del club, suelto. */
describe('acciones del club en desplegables', () => {
  for (const deporte of ['atletismo', 'futbol'] as const) {
    it(`${deporte}: «Prueba de acceso…» y «Aceptar plaza…» agrupan un club por opción`, () => {
      const g = nuevaPartida({ seed: 31, deportes: [deporte] }, [...MODULOS, futbol]);
      const club = g.listActions({}).filter((o) => o.group === 'Club' && o.id.startsWith(`${deporte}.`));
      const prueba = club.filter((o) => o.desplegable?.id === `${deporte}.prueba`);
      const plaza = club.filter((o) => o.desplegable?.id === `${deporte}.aceptar_plaza`);
      expect(prueba.length).toBeGreaterThan(0);
      expect(plaza.length).toBeGreaterThan(0);
      expect(prueba.every((o) => o.desplegable!.nombre === 'Prueba de acceso…' && o.desplegable!.etiqueta === 'Club')).toBe(true);
      expect(plaza.every((o) => o.id.startsWith(`${deporte}.aceptar_plaza.`) && o.desplegable!.nombre === 'Aceptar plaza…')).toBe(true);
      expect(prueba.every((o) => o.id.startsWith(`${deporte}.prueba.`) || o.id.startsWith(`${deporte}.pedir_prueba.`))).toBe(true);
      for (const suelta of [`${deporte}.club_sesion`, `${deporte}.dejar_club`, `${deporte}.apuntarse_colegio`]) expect(club.find((o) => o.id === suelta)?.desplegable).toBeUndefined();
    });
  }
});
