import { describe, expect, it, vi } from 'vitest';
import { APORTE_DE_SUCESOS, PERKS, SERVICES, SHARED_EVENTS, defineModule, hilo, suceso, validarCatalogo, type AporteDeSucesos, type FamilyService, type PerksService, type ProfileService, type RelationsService, type SucesosService } from '@ds/contracts';
import type { Game } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';

vi.setConfig({ testTimeout: 240000, hookTimeout: 240000 });

/**
 * Los sucesos con la partida de verdad: el director pide los cambios con señales compartidas y los aplican los módulos dueños
 * (`relaciones`, `familia`, el módulo base), sin que ninguno conozca a otro. El contenido es de prueba y lo aporta un módulo de prueba.
 */
const latentes = PERKS.filter((p) => p.latente).map((p) => p.id);

const catalogo = (perk: string): AporteDeSucesos[] => [
  hilo({
    id: 'hist.faltas',
    nombre: 'Las faltas llegan a casa',
    requiere: ['familia'],
    reparto: { tutor: { tipo: 'progenitor', prefiere: 'mas_expectativas' } },
    sucesos: [
      {
        id: 'hist.faltas.charla',
        titulo: 'Han llamado del colegio',
        disparo: { al: 'clase.faltas_excesivas' },
        cuando: [{ lugar: 'casa' }],
        texto: '{tutor.Nombre} te espera, muy seri{tutor:o|a}. «Llevas {señal.faltas} faltas».',
        plazo: { dias: 1, porDefecto: 'discutir' },
        opciones: [
          {
            id: 'discutir',
            texto: 'Contestar que es tu vida',
            caracter: { disciplina: -2 },
            minutos: 10,
            efectos: [
              { relacion: 'tutor', afinidad: -8, confianza: -4 },
              { familia: 'tutor', apoyo: -2, expectativas: 3 },
              { entrena: 'gen.autoridad', cantidad: 1 },
              { estado: 'gen.estres', mas: 8 },
              { restriccion: { tags: ['ocio'], dias: 7, motivo: 'Estás castigad{yo:o|a} sin salir' } },
              { revelaPerk: perk },
              { fin: true },
            ],
            resultado: 'La discusión acaba a gritos con {tutor.nombre}.',
          },
        ],
      },
    ],
  }),
  suceso({ id: 'hist.sin_modulo', titulo: 'No existe', requiere: ['no_cargado'], disparo: { al: 'clase.faltas_excesivas' }, texto: 'Nunca sale.' }),
];

const historias = (perk: string) =>
  defineModule({
    id: 'hist',
    name: 'Historias de prueba',
    aportes: { [APORTE_DE_SUCESOS]: catalogo(perk) },
    actions: [{ id: 'hist.aviso', name: 'Aviso del colegio', tags: ['prueba'], duration: 1, run: (ctx) => ctx.emit({ type: SHARED_EVENTS.FALTAS_EXCESIVAS, data: { faltas: 12, curso: 0, trimestre: 1 } }) }],
  });

/** Una partida cuyo personaje tiene un perk latente (se busca la semilla). */
function partidaConPerkLatente(): { g: Game; perk: string } {
  for (let seed = 1; seed < 60; seed++) {
    const perk = nuevaPartida({ seed }).service<PerksService>(SERVICES.perks)!.view().activos.find((p) => latentes.includes(p.id))?.id;
    if (perk) return { g: nuevaPartida({ seed }, [...MODULOS, historias(perk)]), perk };
  }
  throw new Error('Ninguna semilla con un perk latente');
}

describe('sucesos con la partida entera', () => {
  it('el catálogo de prueba es válido con los módulos de verdad', () => {
    const g = nuevaPartida({ seed: 11 }, [...MODULOS, historias('pulmones_grandes')]);
    const stats = new Map([...g.registry.stats].map(([id, s]) => [id, { category: s.def.category }]));
    const r = validarCatalogo([{ modulo: 'hist', aportes: catalogo('pulmones_grandes') }], { stats, modulos: g.registry.moduleIds });
    expect(r.errores).toEqual([]);
    expect(r.avisos).toEqual([expect.stringMatching(/requiere el módulo «no_cargado»/)]);
  });

  it('una decisión cambia la relación, la familia, el carácter, revela un perk y castiga, cada cosa en su módulo', () => {
    const { g, perk } = partidaConPerkLatente();
    const sucesos = g.service<SucesosService>(SERVICES.sucesos)!;
    const familia = () => g.service<FamilyService>(SERVICES.familia)!.parents();
    const tutor = familia().reduce((a, b) => (b.expectativas > a.expectativas ? b : a));
    const antes = { ...tutor, disciplina: g.service<ProfileService>(SERVICES.perfil)!.view().caracter.disciplina, autoridad: g.stat('gen.autoridad'), relacion: g.service<RelationsService>(SERVICES.relaciones)!.get(tutor.id) };
    expect(g.service<PerksService>(SERVICES.perks)!.view().activos.find((p) => p.id === perk)?.revelado).toBeUndefined();

    expect(g.perform('hist.aviso').ok).toBe(true);
    const [p] = sucesos.pendientes();
    expect(p).toMatchObject({ suceso: 'hist.faltas.charla', reparto: { tutor: tutor.id } });
    expect(p.texto).toBe(`${tutor.gender === 'f' ? 'Tu madre te espera, muy seria' : 'Tu padre te espera, muy serio'}. «Llevas 12 faltas».`);
    expect(p.opciones[0]).toMatchObject({ elegible: true, pista: expect.stringMatching(/sentar mal.*castigo/) });
    expect(g.perform(p.opciones[0].accion)).toMatchObject({ ok: true, duration: 10 });

    const despues = familia().find((x) => x.id === tutor.id)!;
    expect(despues.apoyo).toBe(antes.apoyo - 2);
    expect(despues.expectativas).toBe(Math.min(100, antes.expectativas + 3));
    const relacion = g.service<RelationsService>(SERVICES.relaciones)!.get(tutor.id)!;
    expect(relacion.afinidad).toBeLessThan(antes.relacion?.afinidad ?? 0);
    expect(g.service<ProfileService>(SERVICES.perfil)!.view().caracter.disciplina).toBe(Math.max(-50, antes.disciplina - 2));
    expect(g.stat('gen.autoridad')).toBeGreaterThan(antes.autoridad);
    expect(g.service<PerksService>(SERVICES.perks)!.view().activos.find((x) => x.id === perk)?.revelado).toBe(true);
    expect(g.preview('gen.ocio')).toMatchObject({ available: false, reason: 'Estás castigado sin salir' });
    expect(sucesos.recuerdos(tutor.id)).toEqual([expect.objectContaining({ suceso: 'hist.faltas.charla', opcion: 'discutir' })]);
    expect(g.log.at(-1)?.text).toMatch(/La discusión acaba a gritos con tu (madre|padre)\./);
    expect(() => JSON.stringify(g.serialize())).not.toThrow();
  });
});
