import { describe, expect, it } from 'vitest';
import { SERVICES, abiertoEn, construirAgenda, timeView, ubicacionEn, type ClubDirectory, type DatosDeAgenda, type LugaresService, type TipoAsignado } from '@ds/contracts';
import { nuevaPartida } from '@ds/game';

/** Las agendas con el mapa y los clubes reales de la partida (los sitios del atletismo salen del atletismo, por eso este test no es de contracts). */

const en = (dia: number, hora: number, min = 0) => timeView(dia * 1440 + hora * 60 + min);

describe('las agendas respetan los horarios', () => {
  const g = nuevaPartida({ seed: 1 });
  const lugares = g.service<LugaresService>(SERVICES.lugares)!;
  const lugar = (id: string) => lugares.lugar(id)!;
  const clubes = g.service<ClubDirectory>(SERVICES.clubes)!.list('atletismo');
  const jornada = { dias: [5], desde: 9, hasta: 13, lugar: 'estadio', texto: 'Carreras: los sábados.' };
  const datos: DatosDeAgenda = {
    sesionDeClub: (c) => {
      const k = clubes.find((x) => x.id === c);
      return k && { weekdays: k.sesiones.weekdays, desde: k.sesiones.desde, hasta: k.sesiones.hasta, sede: k.sede };
    },
    jornada: () => jornada,
  };
  const tipos: TipoAsignado[][] = [
    [{ tipo: 'alumno' }],
    [{ tipo: 'alumno', tuClase: true }],
    [{ tipo: 'profesor' }],
    [{ tipo: 'entrenador', club: 'colegio' }],
    [{ tipo: 'entrenador', club: 'club_ciudad' }],
    [{ tipo: 'club', club: 'colegio' }],
    [{ tipo: 'rival', club: 'colegio' }],
    [{ tipo: 'rival', club: 'club_ciudad' }],
    [{ tipo: 'amigo' }],
    [{ tipo: 'hermano', escolar: true, deporte: true }],
    [{ tipo: 'progenitor' }],
    [{ tipo: 'vecino' }],
    [{ tipo: 'bibliotecario', turno: 'manana' }],
    [{ tipo: 'bibliotecario', turno: 'tarde' }],
  ];

  it('nadie está en un sitio (ni en una zona de un sitio) mientras está cerrado', () => {
    const fallos = new Set<string>();
    for (const t of tipos) {
      const agenda = construirAgenda(t, datos);
      // Un curso entero (días de clase, fines de semana y vacaciones), cada media hora y con 24 personas distintas: cada una tiene su destino del día.
      for (let dia = 0; dia < 7 * 52; dia++) {
        for (let m = 0; m < 1440; m += 30) {
          const instante = en(dia, 0, m);
          for (let p = 0; p < 24; p++) {
            const u = ubicacionEn(agenda, instante, `persona_${p}`);
            for (const sitio of [u.sitio, u.atendiendo?.sitio]) {
              if (!sitio) continue;
              const l = lugar(sitio);
              const padre = l.dentroDe ? lugar(l.dentroDe) : undefined;
              if (!abiertoEn(l, instante) || (padre && !abiertoEn(padre, instante))) fallos.add(`${t[0].tipo}/${t[0].club ?? t[0].turno ?? ''} en ${sitio}, ${['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'][instante.weekday]} ${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`);
            }
          }
        }
      }
    }
    expect([...fallos]).toEqual([]);
  });
});
