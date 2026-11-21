import { describe, expect, it } from 'vitest';
import { MOVERSE_CON_EL_GRUPO, type Ubicacion } from '@ds/contracts';
import { grupoQueSeVa, seVanSolos } from './grupo';

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
    // Los que desaparecen del mapa no impiden que haya grupo entre los que se pueden seguir (al acabar el recreo, los conocidos al aula y cientos a sus aulas de fuera)...
    expect(grupoQueSeVa(cerca, 'patio', (n) => (Number(n.id.slice(1)) < 4 ? u('aula') : u(null)))).toMatchObject({ hacia: 'aula', cuantos: 4, total: 10 });
    // ...pero si los que van al patio son menos que los que se quedan contigo (más de la mitad de los seguibles), no.
    expect(grupoQueSeVa(cerca, 'aula', (n) => { const i = Number(n.id.slice(1)); return i < 3 ? u('patio') : i < 7 ? u('aula') : u(null); })).toBeUndefined();
  });

  it('quien está ocupado a la vista en otro sitio (el equipo en la pista) cuenta como que va allí', () => {
    const g = grupoQueSeVa(gente(6), 'colegio', () => u(null, { ocupado: true, atendiendo: { sitio: 'pista_colegio', motivo: 'entrenando' } }));
    expect(g).toMatchObject({ hacia: 'pista_colegio', cuantos: 6, total: 6 });
  });

  it('pocas personas no son un grupo', () => {
    expect(grupoQueSeVa(gente(MOVERSE_CON_EL_GRUPO.minimo - 1), 'aula', () => u('patio'))).toBeUndefined();
  });
});

describe('solo dentro del mismo lugar', () => {
  it('quien se va a otro lugar (fuera del colegio, por ejemplo) cuenta como que sale del mapa: no se le acompaña', () => {
    const cerca = gente(10);
    const mismoLugar = (sitio: string) => sitio !== 'parque';
    expect(grupoQueSeVa(cerca, 'patio', () => u('aula'), mismoLugar)).toMatchObject({ hacia: 'aula', cuantos: 10 });
    expect(grupoQueSeVa(cerca, 'patio', () => u('parque'), mismoLugar)).toBeUndefined();
  });
});

describe('seVanSolos («Me voy»)', () => {
  const cercanos = [{ id: 'a', known: true }, { id: 'b', known: false }, { id: 'c' }, { id: 'd', known: true }, { id: 'e', known: true }];
  it('solo los que conoces, a dónde si se sabe, como mucho 2', () => {
    const r = seVanSolos(cercanos, 'aula', (n) => (n.id === 'a' ? u('patio') : u(null)), undefined);
    expect(r.map((x) => [x.persona.id, x.hacia])).toEqual([['a', 'patio'], ['c', null]]);
  });
  it('quien se queda no dice nada, ni quien va con el grupo', () => {
    expect(seVanSolos(cercanos, 'aula', () => u('aula'), undefined)).toEqual([]);
    expect(seVanSolos(cercanos, 'aula', () => u('patio'), 'patio')).toEqual([]);
  });
});
