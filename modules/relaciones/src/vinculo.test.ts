import { describe, expect, it } from 'vitest';
import { conCambio, conContacto, estadoSegun, nuevoVinculo, pasarDia, SUELO_NEGATIVO, type Vinculo } from './vinculo';

const con = (extra: Partial<Vinculo>): Vinculo => ({ ...nuevoVinculo('x', 0), ...extra });

describe('vínculo', () => {
  it('empieza en 0, como conocido: nunca desconocido', () => {
    const v = nuevoVinculo('x', 0);
    expect(v.afinidad).toBe(0);
    expect(v.estado).toBe('conocido');
  });

  it('para ser amigo hace falta afinidad, confianza y contactos recientes', () => {
    expect(estadoSegun(con({ afinidad: 50, confianza: 0, contactos: [8, 9, 10] }), 10)).toBe('conocido');
    expect(estadoSegun(con({ afinidad: 50, confianza: 40, contactos: [10] }), 10)).toBe('conocido');
    expect(estadoSegun(con({ afinidad: 50, confianza: 40, contactos: [1, 2, 3] }), 40)).toBe('conocido');
    expect(estadoSegun(con({ afinidad: 50, confianza: 40, contactos: [8, 9, 10] }), 10)).toBe('amigo');
  });

  it('el mejor amigo exige más afinidad y confianza, y partir de ser amigo', () => {
    expect(estadoSegun(con({ estado: 'amigo', afinidad: 80, confianza: 50 }), 0)).toBe('amigo');
    expect(estadoSegun(con({ estado: 'amigo', afinidad: 80, confianza: 65 }), 0)).toBe('mejor_amigo');
    expect(estadoSegun(con({ estado: 'conocido', afinidad: 80, confianza: 65, contactos: [0, 0, 0] }), 0)).toBe('amigo');
  });

  it('histéresis: un amigo no deja de serlo por bajar un poco del umbral', () => {
    expect(estadoSegun(con({ estado: 'amigo', afinidad: 36, confianza: 10 }), 0)).toBe('amigo');
    expect(estadoSegun(con({ estado: 'amigo', afinidad: 30, confianza: 10 }), 0)).toBe('conocido');
    expect(estadoSegun(con({ estado: 'antipatia', afinidad: -10 }), 0)).toBe('antipatia');
    expect(estadoSegun(con({ estado: 'antipatia', afinidad: -5 }), 0)).toBe('conocido');
  });

  it('los niveles negativos: antipatía, enemigo y antagonista', () => {
    expect(estadoSegun(con({ afinidad: -14 }), 0)).toBe('conocido');
    expect(estadoSegun(con({ afinidad: -16 }), 0)).toBe('antipatia');
    expect(estadoSegun(con({ afinidad: -50 }), 0)).toBe('enemigo');
    expect(estadoSegun(con({ afinidad: -80 }), 0)).toBe('antagonista');
  });

  it('un contacto cambia las cifras, lo recuerda y recalcula el estado', () => {
    let v = nuevoVinculo('x', 0);
    for (let d = 1; d <= 10; d++) v = conContacto(v, d, 6, 4);
    expect(v.estado).toBe('amigo');
    expect(v.ultimoContacto).toBe(10);
    expect(v.contactos.length).toBeLessThanOrEqual(8);
    expect(conContacto(v, 11, -80).estado).not.toBe('amigo');
  });

  it('un cambio sin contacto (una carrera) no cuenta como haber estado juntos', () => {
    const v = conCambio(nuevoVinculo('x', 0), 5, 3);
    expect(v.afinidad).toBe(3);
    expect(v.ultimoContacto).toBe(-1);
  });

  it('lo positivo se enfría hacia conocido, sin pasar de 0', () => {
    let v = con({ estado: 'amigo', afinidad: 45, confianza: 40, ultimoContacto: 0, contactos: [] });
    for (let d = 1; d <= 400; d++) v = pasarDia(v, d);
    expect(v.afinidad).toBe(0);
    expect(v.estado).toBe('conocido');
  });

  it('una amistad fuerte aguanta más sin verse que un conocido', () => {
    const dias = (v: Vinculo) => {
      let x = v;
      let d = 0;
      while (x.afinidad === v.afinidad) x = pasarDia(x, ++d);
      return d;
    };
    const conocido = dias(con({ afinidad: 20, ultimoContacto: 0 }));
    const mejor = dias(con({ estado: 'mejor_amigo', afinidad: 90, confianza: 70, ultimoContacto: 0 }));
    expect(mejor).toBeGreaterThan(conocido);
  });

  it('lo negativo se suaviza solo hasta la primera antipatía y no vuelve a conocido', () => {
    let v = con({ estado: 'enemigo', afinidad: -60, ultimoContacto: 0 });
    for (let d = 1; d <= 2000; d++) v = pasarDia(v, d);
    expect(v.afinidad).toBe(SUELO_NEGATIVO);
    expect(v.estado).toBe('antipatia');
  });

  it('la confianza se pierde mucho más despacio que la afinidad', () => {
    let v = con({ confianza: 50, ultimoContacto: 0 });
    for (let d = 1; d <= 60; d++) v = pasarDia(v, d);
    expect(v.confianza).toBeGreaterThan(45);
    expect(v.confianza).toBeLessThan(50);
  });
});
