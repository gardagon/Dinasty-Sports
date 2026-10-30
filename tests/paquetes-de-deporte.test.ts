import { describe, expect, it } from 'vitest';
import * as contracts from '@ds/contracts';
import { INTERFAZ_DE_DEPORTES, type GameModule } from '@ds/contracts';
import * as kit from '@ds/kit-deporte';
import { advanceToWeek } from '@ds/core';
import { MODULOS, catalogoDeDeportes, nuevaPartida } from '@ds/game';
import {
  ErrorDePaquete, Instalador, almacenEnMemoria, crearPaquete, firmar, fuenteWeb, generarClaves, leerPaquete, manifiestoDe, verificarPaquete,
  type EntradaDeCatalogo, type PaqueteDeDeporte,
} from '@ds/paquetes';
import { empaquetarDeporte, entradaDeCatalogo } from '../tools/empaquetar';

/**
 * Paquetes de deporte (fase 6 del plan de deportes modulares): el deporte compilado aparte, firmado, instalado desde una fuente y cargado en el juego.
 */

const RAIZ = new URL('..', import.meta.url).pathname;
const ANFITRION = { '@ds/contracts': contracts, '@ds/kit-deporte': kit };
const sinAtletismo = MODULOS.filter((m) => m.id !== 'atletismo');

const claves = await generarClaves();
const otrasClaves = await generarClaves();
const paquete = await empaquetarDeporte(RAIZ, 'atletismo', 'Atletismo', claves.privada);
const texto = JSON.stringify(paquete);
const verificacion = { clavePublica: claves.publica, interfaz: INTERFAZ_DE_DEPORTES };
const instalador = (almacen = almacenEnMemoria(), v = verificacion) => new Instalador(almacen, v, ANFITRION);
const conPaquete = (cambia: (p: PaqueteDeDeporte) => void): string => {
  const copia = structuredClone(paquete);
  cambia(copia);
  return JSON.stringify(copia);
};

describe('el paquete', () => {
  it('lleva el módulo compilado aparte, sin copia de contracts ni del kit, y su manifiesto lo describe', () => {
    const m = manifiestoDe(paquete);
    expect(m).toMatchObject({ id: 'atletismo', nombre: 'Atletismo', interfaz: INTERFAZ_DE_DEPORTES, paises: ['espana'], codigo: 'codigo.js' });
    expect(m.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(m.archivos.map((a) => a.ruta)).toEqual(['codigo.js']);
    const codigo = paquete.archivos['codigo.js'];
    expect(codigo.length).toBeGreaterThan(5_000);
    expect(codigo).toContain('__ds'); // lo común lo presta el juego
    // Nada de lo que define `contracts` ni el kit se ha copiado dentro (p. ej. el catálogo de sesgos de la herencia o los países de serie).
    expect(codigo).not.toContain('Dominante');
    expect(codigo).not.toContain('Cervantes');
    // Pesa mucho menos que contracts + kit + atletismo juntos.
    expect(texto.length).toBeLessThan(400_000);
  });

  it('verifica: firma, compatibilidad y huellas', async () => {
    await expect(verificarPaquete(leerPaquete(texto), verificacion)).resolves.toMatchObject({ manifiesto: { id: 'atletismo' } });
    // Clave que no es la de quien firmó.
    await expect(verificarPaquete(leerPaquete(texto), { ...verificacion, clavePublica: otrasClaves.publica })).rejects.toThrow(/firma/);
    // Sin clave configurada en el juego.
    await expect(verificarPaquete(leerPaquete(texto), { ...verificacion, clavePublica: null })).rejects.toThrow(/clave/);
    // Código modificado (la huella ya no coincide) o manifiesto modificado (la firma ya no vale).
    await expect(verificarPaquete(leerPaquete(conPaquete((p) => (p.archivos['codigo.js'] += ' ')), ), verificacion)).rejects.toThrow(/no es el que se firmó/);
    await expect(verificarPaquete(leerPaquete(conPaquete((p) => (p.manifiesto = p.manifiesto.replace('Atletismo', 'Otro')))), verificacion)).rejects.toThrow(/firma/);
    // Otra versión de la interfaz.
    const otra = await crearPaquete({ id: 'x', nombre: 'X', version: '1.0.0', interfaz: INTERFAZ_DE_DEPORTES + 1, paises: ['espana'], archivos: { 'codigo.js': 'return 1;' }, codigo: 'codigo.js' }, claves.privada);
    await expect(verificarPaquete(otra, verificacion)).rejects.toThrow(/actualiza el juego/);
    await expect(verificarPaquete(otra, { ...verificacion, interfaz: INTERFAZ_DE_DEPORTES + 2 })).rejects.toThrow(/actualiza el deporte/);
    // Un archivo que no es un paquete.
    expect(() => leerPaquete('hola')).toThrow(ErrorDePaquete);
    expect(() => leerPaquete('{"a":1}')).toThrow(/no es un paquete/);
  });

  it('firmar a mano con otra clave no sirve', async () => {
    const falso = structuredClone(paquete);
    falso.firma = await firmar(falso.manifiesto, otrasClaves.privada);
    await expect(verificarPaquete(falso, verificacion)).rejects.toThrow(/firma/);
  });
});

describe('el instalador', () => {
  it('instala, lista, actualiza y desinstala; no deja bajar de versión', async () => {
    const almacen = almacenEnMemoria();
    const i = instalador(almacen);
    expect(await i.instalados()).toEqual([]);
    const m = await i.instalar(texto);
    expect(m.id).toBe('atletismo');
    expect((await i.instalados()).map((d) => d.manifiesto.id)).toEqual(['atletismo']);
    expect(await almacen.leer('atletismo')).toBe(texto); // queda guardado para jugar sin conexión
    await i.instalar(texto); // misma versión: vale
    const vieja = await crearPaquete({ ...{ id: 'atletismo', nombre: 'Atletismo', interfaz: INTERFAZ_DE_DEPORTES, paises: ['espana'], archivos: { 'codigo.js': 'return 1;' }, codigo: 'codigo.js' }, version: '0.0.1' }, claves.privada);
    await expect(i.instalar(JSON.stringify(vieja))).rejects.toThrow(/más nueva/);
    await i.desinstalar('atletismo');
    expect(await i.instalados()).toEqual([]);
  });

  it('no instala nada firmado por otro', async () => {
    const i = instalador(almacenEnMemoria(), { ...verificacion, clavePublica: otrasClaves.publica });
    await expect(i.instalar(texto)).rejects.toThrow(/firma/);
    expect(await i.instalados()).toEqual([]);
  });

  it('un paquete que ya no se puede verificar no se carga y se avisa', async () => {
    const almacen = almacenEnMemoria();
    await instalador(almacen).instalar(texto);
    const { modulos, avisos } = await instalador(almacen, { ...verificacion, interfaz: INTERFAZ_DE_DEPORTES + 1 }).modulos();
    expect(modulos).toEqual([]);
    expect(avisos[0]).toMatch(/actualiza el deporte/);
  });
});

describe('las fuentes', () => {
  /** Una carpeta de la web del juego simulada: el catálogo y el paquete. */
  const web = (entrada: EntradaDeCatalogo, contenido: string) => {
    const pedidos: string[] = [];
    const descargar = async (url: string) => {
      pedidos.push(url);
      const cuerpo = url.endsWith('/catalogo.json') ? JSON.stringify([entrada]) : url.endsWith(entrada.ruta) ? contenido : null;
      return { ok: cuerpo !== null, status: cuerpo === null ? 404 : 200, text: async () => cuerpo ?? '' };
    };
    return { fuente: fuenteWeb('https://ejemplo.github.io/juego/deportes/', 'Web del juego', descargar), pedidos };
  };

  it('instala desde una carpeta de la web del juego', async () => {
    const entrada = entradaDeCatalogo(paquete, 'atletismo/0.1.0/paquete.json');
    const { fuente, pedidos } = web(entrada, texto);
    const catalogo = await fuente.catalogo();
    expect(catalogo).toEqual([entrada]);
    expect(catalogo[0].bytes).toBe(texto.length);
    const i = instalador();
    await i.instalarDe(fuente, catalogo[0]);
    expect((await i.instalados()).map((d) => d.manifiesto.id)).toEqual(['atletismo']);
    expect(pedidos).toEqual(['https://ejemplo.github.io/juego/deportes/catalogo.json', 'https://ejemplo.github.io/juego/deportes/atletismo/0.1.0/paquete.json']);
  });

  it('avisa cuando no hay conexión o la fuente falla', async () => {
    const sinRed = fuenteWeb('https://x/', 'x', async () => { throw new Error('offline'); });
    await expect(sinRed.catalogo()).rejects.toThrow(/conexión/);
    const rota = fuenteWeb('https://x/', 'x', async () => ({ ok: false, status: 503, text: async () => '' }));
    await expect(rota.catalogo()).rejects.toThrow(/503/);
    const mal = fuenteWeb('https://x/', 'x', async () => ({ ok: true, status: 200, text: async () => '{"no":"lista"}' }));
    await expect(mal.catalogo()).rejects.toThrow(/mal formado/);
  });
});

describe('el deporte instalado funciona en el juego', () => {
  it('con el atletismo cargado desde su paquete (no del código del juego), la partida sale idéntica a la normal', async () => {
    const i = instalador();
    await i.instalar(texto);
    const { modulos, avisos } = await i.modulos();
    expect(avisos).toEqual([]);
    const cargado = modulos as GameModule<any>[];
    expect(cargado.map((m) => m.id)).toEqual(['atletismo']);
    expect(cargado[0]).not.toBe(MODULOS.find((m) => m.id === 'atletismo'));
    expect(catalogoDeDeportes(cargado).map((d) => d.id)).toEqual(['atletismo']);

    // En el mismo sitio de la lista (el orden de los módulos cuenta para el azar de la creación).
    const dePaquete = nuevaPartida({ seed: 31 }, MODULOS.map((m) => (m.id === 'atletismo' ? cargado[0] : m)));
    const integrado = nuevaPartida({ seed: 31 });
    expect(JSON.stringify(dePaquete.serialize())).toBe(JSON.stringify(integrado.serialize()));
    // Y siguen igual semanas después, jugando.
    for (const g of [dePaquete, integrado]) advanceToWeek(g, 'gen.descansar', 4, 1, 10);
    expect(JSON.stringify(dePaquete.serialize())).toBe(JSON.stringify(integrado.serialize()));
  }, 60000);

  it('un deporte instalado detrás de los módulos del juego (donde irán los demás) también crea una partida y se juega', async () => {
    const i = instalador();
    await i.instalar(texto);
    const g = nuevaPartida({ seed: 31 }, [...sinAtletismo, ...(await i.modulos()).modulos]);
    advanceToWeek(g, 'gen.descansar', 4, 1, 10);
    expect(g.moduleState<{ npcs: { deporte?: string }[] }>('npcs').npcs.filter((n) => n.deporte === 'atletismo').length).toBeGreaterThan(50);
  }, 60000);
});
