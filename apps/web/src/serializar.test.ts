import { describe, expect, it } from 'vitest';
import { PAIS_CIUDAD_GRANDE, registrarPais } from '@ds/contracts';
import { MODULOS, nuevaPartida } from '@ds/game';
import { AlmacenEnMemoria, serializarPartida, serializarPartidaPorTrozos } from './almacen';
import { ABORTOS_SEGUIDOS, SerializacionPorTrozos, alCambiarElEstado, serializarPorTrozos, terminarSerializacionEnCurso } from './serializar';

const grande = (): unknown => ({
  a: 1,
  b: undefined,
  c: [1, undefined, () => 1, null, 'x"y'],
  gente: Array.from({ length: 200 }, (_, i) => ({ id: i, nombre: `p${i}`, nota: i % 3 ? undefined : { x: [i, i + 1] }, f: () => 0 })),
  mapa: Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`k${i}`, { v: i, w: i % 2 ? undefined : 'z' }])),
  vacio: {},
  lista: [],
});

describe('serializar por trozos', () => {
  it('da exactamente el mismo texto que JSON.stringify', async () => {
    const v = grande();
    expect((await serializarPorTrozos({ ...(v as object), state: v }))!.datos).toBe(JSON.stringify({ ...(v as object), state: v }));
    expect((await serializarPorTrozos(v, { ms: 0 }))!.datos).toBe(JSON.stringify(v));
    const blob = (await serializarPorTrozos(v, { ms: 0, comoBlob: true }))!.datos as Blob;
    expect(await blob.text()).toBe(JSON.stringify(v));
  });

  it('con trozos de 0 ms hace falta ceder muchas veces, y terminar() acaba de golpe con el mismo texto', () => {
    const v = grande();
    const s = new SerializacionPorTrozos(v);
    expect(s.avanzar(0)).toBe(false);
    expect(s.terminada).toBe(false);
    expect(s.terminar()).toBe(JSON.stringify(v));
    expect(s.terminada).toBe(true);
  });

  it('si el estado va a cambiar a medias, el guardado se descarta (y tras varios descartes seguidos se acaba de golpe)', async () => {
    const v = grande() as { gente: { nombre: string }[] };
    const antes = JSON.stringify(v);
    for (let i = 0; i < ABORTOS_SEGUIDOS; i++) {
      const trabajo = serializarPorTrozos(v, { ms: 0 });
      alCambiarElEstado();
      v.gente[150].nombre = `cambiado${i}`;
      expect(await trabajo).toBeNull();
    }
    // El siguiente se acaba de golpe antes del cambio: el texto es el del momento en que empezó.
    const texto = JSON.stringify(v);
    const ultimo = serializarPorTrozos(v, { ms: 0 });
    alCambiarElEstado();
    v.gente[150].nombre = 'otro';
    expect((await ultimo)!.datos).toBe(texto);
    expect(texto).not.toBe(antes);
    // Con uno que acaba bien, la cuenta vuelve a cero.
    const trabajo = serializarPorTrozos(v, { ms: 0 });
    alCambiarElEstado();
    expect(await trabajo).toBeNull();
  });

  it('terminarSerializacionEnCurso (cerrar la pestaña) acaba de golpe lo que está a medias', async () => {
    const v = grande() as { gente: { nombre: string }[] };
    const antes = JSON.stringify(v);
    const trabajo = serializarPorTrozos(v, { ms: 0 });
    terminarSerializacionEnCurso();
    v.gente[150].nombre = 'cambiado';
    expect((await trabajo)!.datos).toBe(antes);
  });

  it('una partida de verdad sale igual por trozos que de golpe (y se puede leer)', async () => {
    registrarPais(PAIS_CIUDAD_GRANDE);
    const g = nuevaPartida({ seed: 7 }, MODULOS);
    const agenda = [{ start: 0, duration: 5, name: 'x', rest: false }];
    const de_golpe = serializarPartida(g, agenda);
    const por_trozos = (await serializarPartidaPorTrozos(g, agenda))!;
    // Cambia solo la hora de `guardadoEn`.
    const sinHora = (t: string): string => t.replace(/"guardadoEn":"[^"]*"/, '');
    const texto = await por_trozos.blob.text();
    expect(sinHora(texto)).toBe(sinHora(de_golpe.texto));
    const a = new AlmacenEnMemoria();
    await a.guardar(por_trozos);
    expect(await a.cargar()).toBe(texto);
    expect(por_trozos.bytes).toBe(new TextEncoder().encode(texto).length);
  });

  it('varias acciones seguidas en una misma tarea no hacen fallar: lo descartado no se vuelve a acabar de golpe', async () => {
    const v = grande() as { gente: { nombre: string }[] };
    const trabajo = serializarPorTrozos(v, { ms: 0 });
    for (let i = 0; i < ABORTOS_SEGUIDOS + 3; i++) expect(() => alCambiarElEstado()).not.toThrow();
    expect(await trabajo).toBeNull();
  });
});
