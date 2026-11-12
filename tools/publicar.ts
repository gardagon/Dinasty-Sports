/**
 * La publicación de los deportes como paquetes firmados, separada del programa de línea de comandos para poder probarla: dado un repositorio, una carpeta de salida y la clave
 * privada, escribe `deportes/catalogo.json` y `deportes/<id>/<versión>/paquete.json`. **Publica todos los deportes, vayan o no dentro del juego**: los que lleva el juego
 * (`MODULOS`) y los que no (como el fútbol), que se reconocen porque su `package.json` dice `"dsDeporte": true`. Un deporte que no va dentro solo se juega instalándolo desde
 * aquí (plan de deportes modulares, §3).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { APORTES, type DatosDeDeporte, type FichaDeDeporte, type GameModule } from '@ds/contracts';
import { MODULOS, catalogoDeDeportes } from '@ds/game';
import type { EntradaDeCatalogo } from '@ds/paquetes';
import { empaquetarDeporte, entradaDeCatalogo } from './empaquetar';

/** Un deporte por publicar: su id, su nombre y los países para los que trae datos propios. */
export interface DeporteParaPublicar {
  id: string;
  nombre: string;
  paises: string[];
  /** ¿Va dentro del juego (en `MODULOS`)? Si no, solo se juega instalándolo. */
  enElJuego: boolean;
}

/** Los países para los que un módulo de deporte trae datos propios (los que da en sus aportes de datos), `espana` si no dice. */
const paisesDe = (m: GameModule<any>): string[] => {
  const datos = (m.aportes?.[APORTES.datosDeDeporte] ?? []) as DatosDeDeporte[];
  const ids = datos.flatMap((d) => Object.keys(d.paises));
  return ids.length ? [...new Set(ids)] : ['espana'];
};

const fichaDe = (m: GameModule<any>): FichaDeDeporte | undefined => ((m.aportes?.[APORTES.fichaDeDeporte] ?? []) as FichaDeDeporte[])[0];

/** Los módulos de `modules/*` que son un deporte (su `package.json` lo dice) y no van dentro del juego, cargados de su código fuente. */
export async function deportesFueraDelJuego(raiz: string): Promise<GameModule<any>[]> {
  const dentro = new Set(MODULOS.map((m) => m.id));
  const fuera: GameModule<any>[] = [];
  const carpeta = join(raiz, 'modules');
  for (const dir of readdirSync(carpeta).sort()) {
    const paquete = join(carpeta, dir, 'package.json');
    if (!existsSync(paquete) || !(JSON.parse(readFileSync(paquete, 'utf8')) as { dsDeporte?: boolean }).dsDeporte) continue;
    const modulo = ((await import(pathToFileURL(join(carpeta, dir, 'src', 'index.ts')).href)) as { default: GameModule<any> }).default;
    if (modulo && !dentro.has(modulo.id)) fuera.push(modulo);
  }
  return fuera;
}

/** Todos los deportes que se publican: los del juego y los que van aparte. */
export async function deportesParaPublicar(raiz: string): Promise<DeporteParaPublicar[]> {
  const delJuego = MODULOS.filter((m) => fichaDe(m)).map((m) => ({ id: m.id, nombre: fichaDe(m)!.nombre, paises: paisesDe(m), enElJuego: true }));
  const aparte = (await deportesFueraDelJuego(raiz)).filter((m) => fichaDe(m)).map((m) => ({ id: m.id, nombre: fichaDe(m)!.nombre, paises: paisesDe(m), enElJuego: false }));
  return [...delJuego, ...aparte];
}

export interface Publicado {
  deporte: DeporteParaPublicar;
  entrada: EntradaDeCatalogo;
}

/** Empaqueta, firma y escribe todos los deportes y su catálogo en `<salida>/deportes`. Devuelve lo publicado. */
export async function publicarDeportes(raiz: string, salida: string, privada: string, avisar: (texto: string) => void = () => undefined): Promise<Publicado[]> {
  const carpeta = join(salida, 'deportes');
  const publicados: Publicado[] = [];
  const catalogo: EntradaDeCatalogo[] = [];
  for (const deporte of await deportesParaPublicar(raiz)) {
    const paquete = await empaquetarDeporte(raiz, deporte.id, deporte.nombre, privada, deporte.paises);
    const entrada = entradaDeCatalogo(paquete, '');
    const ruta = `${deporte.id}/${entrada.version}/paquete.json`;
    mkdirSync(dirname(join(carpeta, ruta)), { recursive: true });
    writeFileSync(join(carpeta, ruta), JSON.stringify(paquete));
    catalogo.push({ ...entrada, ruta });
    publicados.push({ deporte, entrada: { ...entrada, ruta } });
    avisar(`${deporte.nombre} ${entrada.version}${deporte.enElJuego ? '' : ' (aparte: no va dentro del juego)'}: ${(entrada.bytes / 1024).toFixed(0)} KB → ${ruta}`);
  }
  mkdirSync(carpeta, { recursive: true });
  writeFileSync(join(carpeta, 'catalogo.json'), JSON.stringify(catalogo));
  return publicados;
}
