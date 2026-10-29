import { describe, expect, it } from 'vitest';
import { apodosDe, reservaDeNombres, type Cultura } from './culturas';
import {
  PAIS_ESPANA,
  PROBABILIDAD_DE_APODO,
  PROBABILIDAD_DE_NOMBRE_LOCAL,
  apodoAlAzar,
  apodoDeId,
  idDePonerApodo,
  nombreCortoDe,
  formaDeApellido,
  identidadAlAzar,
  identidadDeHijo,
  nombreCompleto,
  nombrePermitido,
  origenDePadre,
  padresDeSemilla,
  registrarNombre,
  type RegistroDeNombres,
} from './nombres';
import { ORIGENES, origen, origenAlAzar } from './rasgos';
import { rngEstable } from './rng';

/** Todas las culturas de una reserva con sus nombres y apellidos (para comprobar que lo sorteado sale de ellas). */
const culturasDe = (origenId: string): readonly Cultura[] => reservaDeNombres(origen(origenId)!.reserva);
const pilasDe = (c: Cultura) => new Set([...c.nombres.f.jovenes, ...c.nombres.f.adultos, ...c.nombres.m.jovenes, ...c.nombres.m.adultos, ...(c.compuestos?.f ?? []), ...(c.compuestos?.m ?? [])]);

describe('datos de nombres por cultura', () => {
  it('cada origen tiene su reserva y todas las culturas traen nombres de ambos sexos, apellidos y sin repetir dentro de una lista', () => {
    for (const o of ORIGENES) {
      const culturas = culturasDe(o.id);
      expect(culturas.length, o.id).toBeGreaterThan(0);
      for (const c of culturas) {
        for (const lista of [c.nombres.f.jovenes, c.nombres.f.adultos, c.nombres.m.jovenes, c.nombres.m.adultos, c.apellidos]) {
          expect(lista.length, `${c.id}`).toBeGreaterThan(15);
          expect(new Set(lista).size, `${c.id} tiene repetidos`).toBe(lista.length);
        }
      }
    }
  });

  it('España tiene listas largas y compuestos con segundo nombre habitual (José Manuel, María José)', () => {
    const [espana] = culturasDe('espana_centro');
    expect(espana.nombres.f.adultos.length + espana.nombres.f.jovenes.length).toBeGreaterThan(180);
    expect(espana.apellidos.length).toBeGreaterThan(200);
    expect(espana.compuestos!.m).toContain('José Manuel');
    expect(espana.compuestos!.f).toContain('María José');
  });
});

describe('identidad según el origen', () => {
  const sorteos = (id: string, genero: 'f' | 'm', edad: number, n = 300) =>
    Array.from({ length: n }, (_, i) => identidadAlAzar(rngEstable('prueba', id, genero, edad, i), genero, [{ id, peso: 1 }], { edad }));

  it('con un solo origen, el nombre y los apellidos son de ese origen (y de la misma cultura)', () => {
    for (const o of ORIGENES) {
      const culturas = culturasDe(o.id);
      for (const genero of ['f', 'm'] as const) {
        for (const i of sorteos(o.id, genero, 40)) {
          for (const a of i.apellidos) expect(culturas.find((c) => c.id === a.cultura)!.apellidos).toContain(a.base);
          // Mismo origen, misma cultura para el nombre y los apellidos (nada de «Hiroshi Zhang»): el nombre está en la cultura de sus apellidos.
          const cultura = culturas.find((c) => c.id === i.apellidos[0].cultura)!;
          expect(pilasDe(cultura).has(i.pila), `${o.id}: «${i.pila}» no es de ${cultura.id}`).toBe(true);
          expect(new Set(i.apellidos.map((a) => a.cultura)).size).toBe(1);
        }
      }
    }
  });

  it('los de origen hispano llevan dos apellidos y los de origen extranjero uno, también los niños; una mezcla con un origen hispano, dos', () => {
    for (const edad of [10, 40]) {
      for (const i of sorteos('europa_este', 'm', edad)) expect(i.apellidos).toHaveLength(1);
      for (const i of sorteos('magreb', 'f', edad)) expect(i.apellidos).toHaveLength(1);
      for (const i of sorteos('asia_oriental', 'm', edad)) expect(i.apellidos).toHaveLength(1);
      for (const origenId of ['espana_sur', 'latinoamerica']) {
        for (const i of sorteos(origenId, 'f', edad)) {
          expect(i.apellidos).toHaveLength(2);
          expect(i.apellidos[0].base).not.toBe(i.apellidos[1].base);
        }
      }
    }
    for (let k = 0; k < 100; k++) {
      expect(identidadAlAzar(rngEstable('mix2', k), 'm', [{ id: 'espana_sur', peso: 0.5 }, { id: 'magreb', peso: 0.5 }], { edad: 10 }).apellidos).toHaveLength(2);
      expect(identidadAlAzar(rngEstable('mix1', k), 'm', [{ id: 'asia_oriental', peso: 0.5 }, { id: 'magreb', peso: 0.5 }], { edad: 10 }).apellidos).toHaveLength(1); // dos orígenes extranjeros: uno
    }
  });

  it('las mujeres eslavas llevan el apellido en femenino (Kowalski → Kowalska) y los hombres, el de base', () => {
    const polaca = { base: 'Kowalski', cultura: 'eslavos' };
    expect(formaDeApellido(polaca, 'f')).toBe('Kowalska');
    expect(formaDeApellido(polaca, 'm')).toBe('Kowalski');
    expect(formaDeApellido({ base: 'Ivanov', cultura: 'eslavos' }, 'f')).toBe('Ivanova');
    expect(formaDeApellido({ base: 'Georgiev', cultura: 'balcanes' }, 'f')).toBe('Georgieva');
    expect(formaDeApellido({ base: 'Popescu', cultura: 'rumania' }, 'f')).toBe('Popescu');
    expect(formaDeApellido({ base: 'García', cultura: 'espana' }, 'f')).toBe('García');
  });

  it('hay nombres compuestos entre los adultos españoles (y muy pocos entre los jóvenes)', () => {
    const compuestos = (edad: number) => sorteos('espana_centro', 'm', edad, 1000).filter((i) => i.pila.includes(' ')).length;
    expect(compuestos(45)).toBeGreaterThan(100);
    expect(compuestos(45)).toBeLessThan(250);
    expect(compuestos(9)).toBeLessThan(60);
  });

  it('los niños usan los nombres de todos (jóvenes y adultos, sin repetir) y los adultos, sobre todo los suyos', () => {
    const [espana] = culturasDe('espana_centro');
    const solo = (xs: readonly string[]) => new Set(xs);
    const exclusivosAdultos = espana.nombres.f.adultos.filter((n) => !solo(espana.nombres.f.jovenes).has(n));
    const exclusivosJovenes = espana.nombres.f.jovenes.filter((n) => !solo(espana.nombres.f.adultos).has(n));
    const ninas = sorteos('espana_centro', 'f', 9, 3000).filter((i) => !i.pila.includes(' '));
    const madres = sorteos('espana_centro', 'f', 45, 3000).filter((i) => !i.pila.includes(' '));
    const cuantos = (xs: typeof ninas, lista: string[]) => xs.filter((i) => lista.includes(i.pila)).length;
    // Una niña puede llamarse como una madre (Patricia, Montserrat) y una madre como una niña; los de cada generación salen más en la suya.
    expect(cuantos(ninas, exclusivosAdultos)).toBeGreaterThan(0);
    expect(cuantos(madres, exclusivosJovenes)).toBeGreaterThan(0);
    expect(cuantos(madres, exclusivosAdultos) / madres.length).toBeGreaterThan(cuantos(ninas, exclusivosAdultos) / ninas.length);
    expect(cuantos(ninas, exclusivosJovenes) / ninas.length).toBeGreaterThan(cuantos(madres, exclusivosJovenes) / madres.length);
  });

  it('los nombres compuestos se quedan enteros y tienen apodo habitual (José Manuel → Chema); sale al azar y siempre el mismo para la misma persona', () => {
    expect(apodosDe('José Manuel')).toContain('Chema');
    expect(apodosDe('Mohamed')).toContain('Momo');
    expect(apodosDe('Nombre Inexistente')).toEqual([]);
    expect(apodoAlAzar('x', 'Nombre Inexistente')).toBeUndefined();
    let con = 0;
    for (let k = 0; k < 1000; k++) {
      const a = apodoAlAzar(`José Manuel Gil ${k}`, 'José Manuel');
      expect(apodoAlAzar(`José Manuel Gil ${k}`, 'José Manuel')).toBe(a);
      if (a) {
        con++;
        expect(apodosDe('José Manuel')).toContain(a);
      }
    }
    expect(con / 1000).toBeGreaterThan(PROBABILIDAD_DE_APODO - 0.07);
    expect(con / 1000).toBeLessThan(PROBABILIDAD_DE_APODO + 0.07);
  });

  it('cómo se le llama en los textos: el apodo y, si no, el nombre de pila entero (no solo la primera palabra)', () => {
    expect(nombreCortoDe({ name: 'José Manuel García López', nombrePila: 'José Manuel' })).toBe('José Manuel');
    expect(nombreCortoDe({ name: 'José Manuel García López', nombrePila: 'José Manuel', apodo: 'Chema' })).toBe('Chema');
    expect(nombreCortoDe({ name: 'Marta Gil Sanz' })).toBe('Marta'); // partidas guardadas sin nombre de pila
  });

  it('el apodo viaja en el id de la acción: se codifica, solo vale con letras (hasta 20) y vacío es quitarlo', () => {
    expect(idDePonerApodo('alumno_3', 'Chema')).toBe('npcs.apodo.alumno_3.Chema');
    expect(apodoDeId(idDePonerApodo('x', ' Pepe Luis ').split('.')[3])).toBe('Pepe Luis');
    expect(apodoDeId(idDePonerApodo('x', 'J.R.').split('.')[3])).toBeUndefined(); // los puntos no valen
    expect(apodoDeId('')).toBe('');
    expect(apodoDeId(encodeURIComponent('Ñoño-ñ'))).toBe('Ñoño-ñ');
    expect(apodoDeId(encodeURIComponent('a'.repeat(21)))).toBeUndefined();
    expect(apodoDeId(encodeURIComponent('<b>'))).toBeUndefined();
    expect(apodoDeId('%E0%A4%A')).toBeUndefined();
  });

  it('en una mezcla el nombre es de uno de los orígenes y los apellidos, uno de cada', () => {
    const mezcla = [{ id: 'espana_sur', peso: 0.5 }, { id: 'europa_este', peso: 0.5 }];
    let deEste = 0;
    let deAqui = 0;
    for (let k = 0; k < 400; k++) {
      const i = identidadAlAzar(rngEstable('mezcla', k), 'f', mezcla, { edad: 40 });
      const esEste = culturasDe('europa_este').some((c) => pilasDe(c).has(i.pila));
      const esAqui = pilasDe(culturasDe('espana_sur')[0]).has(i.pila);
      expect(esEste || esAqui, i.pila).toBe(true);
      if (esEste) deEste++;
      else deAqui++;
      // Un apellido de cada origen.
      expect(new Set(i.apellidos.map((a) => (a.cultura === 'espana' ? 'aqui' : 'este'))).size).toBe(i.apellidos.length > 1 ? 2 : 1);
    }
    expect(deEste).toBeGreaterThan(120);
    expect(deAqui).toBeGreaterThan(120);
  });

  it('una mezcla sin el origen del país de juego da de vez en cuando (≈12 %) un nombre del país de juego, con apellidos de la mezcla', () => {
    const mezcla = [{ id: 'magreb', peso: 0.5 }, { id: 'europa_este', peso: 0.5 }];
    let locales = 0;
    const n = 4000;
    // Solo se cuentan los nombres que ninguna de las dos culturas de la mezcla tiene (algunos, como Daniel o Sara, son de varias).
    const delaMezcla = new Set(mezcla.flatMap((m) => culturasDe(m.id).flatMap((c) => [...pilasDe(c)])));
    for (let k = 0; k < n; k++) {
      const i = identidadAlAzar(rngEstable('local', k), 'm', mezcla, { edad: 12 });
      if (!delaMezcla.has(i.pila) && pilasDe(culturasDe('espana_centro')[0]).has(i.pila)) {
        locales++;
        expect(i.apellidos.every((a) => a.cultura !== 'espana')).toBe(true);
      }
    }
    expect(locales / n).toBeGreaterThan(PROBABILIDAD_DE_NOMBRE_LOCAL - 0.06);
    expect(locales / n).toBeLessThan(PROBABILIDAD_DE_NOMBRE_LOCAL + 0.03);
  });

  it('un origen único extranjero nunca cambia de origen: el nombre es siempre de su cultura (ni un 12 % de nombres locales)', () => {
    const magreb = pilasDe(culturasDe('magreb')[0]);
    for (const i of sorteos('magreb', 'f', 10, 600)) expect(magreb.has(i.pila), i.pila).toBe(true);
  });

  it('los hijos llevan el primer apellido del padre y el de la madre (con su forma) y el nombre del origen de los dos', () => {
    const rng = rngEstable('hijos');
    const padre = identidadAlAzar(rng, 'm', [{ id: 'espana_centro', peso: 1 }], { edad: 45 });
    const madre = { pila: 'Katarzyna', apellidos: [{ base: 'Kowalski', cultura: 'eslavos' }] };
    const origenHijo = [{ id: 'espana_centro', peso: 0.5 }, { id: 'europa_este', peso: 0.5 }];
    const chico = identidadDeHijo(rng, 'm', padre, madre, origenHijo, { edad: 9 });
    const chica = identidadDeHijo(rng, 'f', padre, madre, origenHijo, { edad: 9 });
    expect(nombreCompleto(chico, 'm').endsWith(`${padre.apellidos[0].base} Kowalski`)).toBe(true);
    expect(nombreCompleto(chica, 'f').endsWith(`${padre.apellidos[0].base} Kowalska`)).toBe(true);
  });
});

describe('los padres salen de la semilla y de su origen', () => {
  it('son siempre los mismos para una semilla, con origen y nombre coherentes', () => {
    for (let semilla = 1; semilla <= 300; semilla++) {
      const { padre, madre } = padresDeSemilla(semilla);
      expect(padresDeSemilla(semilla)).toEqual({ padre, madre });
      for (const [p, lado] of [[padre, 'padre'], [madre, 'madre']] as const) {
        expect(p.origen).toEqual(origenDePadre(semilla, lado));
        const culturas = p.origen.flatMap((o) => culturasDe(o.id));
        const cultura = culturas.find((c) => pilasDe(c).has(p.identidad.pila));
        // El nombre es de una cultura de su origen (o, en una mezcla sin el país de juego, del país de juego).
        const local = culturasDe('espana_centro')[0];
        expect(cultura !== undefined || (p.origen.length > 1 && pilasDe(local).has(p.identidad.pila)), `${semilla} ${lado} ${p.identidad.pila} ${JSON.stringify(p.origen)}`).toBe(true);
      }
      expect(padre.identidad.apellidos[0].base).not.toBe(madre.identidad.apellidos[0].base);
    }
  });

  it('una madre de Europa del este no se llama como una española: su nombre y su apellido son de su origen', () => {
    const semilla = Array.from({ length: 3000 }, (_, i) => i + 1).find((s) => {
      const o = origenDePadre(s, 'madre');
      return o.length === 1 && o[0].id === 'europa_este';
    })!;
    expect(semilla).toBeDefined();
    const { madre } = padresDeSemilla(semilla);
    expect(culturasDe('europa_este').some((c) => pilasDe(c).has(madre.identidad.pila))).toBe(true);
    expect(madre.identidad.apellidos.every((a) => culturasDe('europa_este').some((c) => c.id === a.cultura))).toBe(true);
  });

  it('el origen de los padres sigue la demografía del país: casi todos españoles, algunos de fuera', () => {
    let extranjeros = 0;
    for (let s = 1; s <= 1000; s++) if (!PAIS_ESPANA.origenesLocales.includes(origenDePadre(s, 'madre')[0].id)) extranjeros++;
    expect(extranjeros).toBeGreaterThan(80);
    expect(extranjeros).toBeLessThan(350);
    expect(origenAlAzar(rngEstable('x')).length).toBeGreaterThan(0);
  });
});

describe('nombres repetidos', () => {
  const dia = (años: number) => años * 365;
  it('se permiten dos homónimos, no tres, y solo con 15 años o más de diferencia (el hijo y su padre, sí; dos niños, no)', () => {
    const r: RegistroDeNombres = new Map();
    expect(nombrePermitido(r, 'Nicolás Sánchez', dia(10))).toBe(true);
    registrarNombre(r, 'Nicolás Sánchez', dia(10));
    expect(nombrePermitido(r, 'Nicolás Sánchez', dia(12))).toBe(false); // otro niño del colegio
    expect(nombrePermitido(r, 'Nicolás Sánchez', dia(-30))).toBe(true); // su padre
    registrarNombre(r, 'Nicolás Sánchez', dia(-30));
    expect(nombrePermitido(r, 'Nicolás Sánchez', dia(-60))).toBe(false); // ya hay dos
    expect(nombrePermitido(r, 'Nicolás Sánchez Ruiz', dia(12))).toBe(true); // otro nombre completo
  });
});
