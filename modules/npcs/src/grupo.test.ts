import { describe, expect, it } from 'vitest';
import { MOVERSE_CON_EL_GRUPO, type Ubicacion } from '@ds/contracts';
import { grupoQueSeVa } from './grupo';

const u = (sitio: string | null, extra: Partial<Ubicacion> = {}): Ubicacion => ({ sitio, nivel: 2, tipo: 'alumno', ...extra });
const gente = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}` }));

describe('grupoQueSeVa (las cuentas, sin partida)', () => {
  it('la mayoría de la gente cercana que va al mismo sitio es un grupo, con unos pocos nombrados', () => {
    const cerca = gente(10);
    const g = grupoQueSeVa(cerca, 'aula', (n) => (Number(n.id.slice(1)) < 7 ? u('patio') : u('aula')));
    expect(g).toMatchObject({ hacia: 'patio', cuantos: 7, total: 10 });
    expect(g!.muestra).toEqual(['p0', 'p1', 'p2'].slice(0, MOVERSE_CON_EL_GRUPO.muestra));
  });

  it('si se va una minoría, o se reparten entre varios sitios, no hay grupo', () => {
    const cerca = gente(10);
    expect(grupoQueSeVa(cerca, 'aula', (n) => (Number(n.id.slice(1)) < 4 ? u('patio') : u('aula')))).toBeUndefined();
    expect(grupoQueSeVa(cerca, 'aula', (n) => u(['patio', 'colegio', 'parque'][Number(n.id.slice(1)) % 3]))).toBeUndefined();
  });

  it('quien sigue contigo aunque esté ocupado a la vista (en clase) no se ha ido; quien sale del mapa no es un destino', () => {
    const cerca = gente(10);
    expect(grupoQueSeVa(cerca, 'aula', () => u(null, { ocupado: true, atendiendo: { sitio: 'aula', motivo: 'atendiendo en clase' } }))).toBeUndefined();
    expect(grupoQueSeVa(cerca, 'aula', () => u(null))).toBeUndefined();
    // Mitad a casa, mitad al patio: no hay mayoría para el patio.
    expect(grupoQueSeVa(cerca, 'aula', (n) => (Number(n.id.slice(1)) < 4 ? u('patio') : u(null)))).toBeUndefined();
  });

  it('quien está ocupado a la vista en otro sitio (el equipo en la pista) cuenta como que va allí', () => {
    const g = grupoQueSeVa(gente(6), 'colegio', () => u(null, { ocupado: true, atendiendo: { sitio: 'pista_colegio', motivo: 'entrenando' } }));
    expect(g).toMatchObject({ hacia: 'pista_colegio', cuantos: 6, total: 6 });
  });

  it('pocas personas no son un grupo', () => {
    expect(grupoQueSeVa(gente(MOVERSE_CON_EL_GRUPO.minimo - 1), 'aula', () => u('patio'))).toBeUndefined();
  });
});
