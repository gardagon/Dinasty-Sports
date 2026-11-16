/**
 * CAPA 2 DEL DIBUJO, el vello facial: cada estilo del catálogo (`VELLOS`, en contracts) es una zona de la cara, y el largo (mm) decide cómo se ve: sombra de pocos días,
 * barba tupida o barba que cuelga por debajo del mentón. Para añadir un estilo: `docs/ANEXO_RETRATOS.md`.
 */
import { rngEstable } from '@ds/contracts';
import type { Cara } from './cara';
import { curva, espejo, n, type Pt } from './geometria';
import type { Lienzo } from './lienzo';
import type { Parametros } from './parametros';

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export interface VelloDibujado {
  svg: string;
  /** Si tapa el mentón o el labio de arriba (para no dibujar ahí sombras ni arrugas). */
  tapaElMenton: boolean;
  tapaElBigote: boolean;
}

/** Qué zonas cubre cada estilo: toda la barba (con la línea de la mejilla natural o perfilada), solo el bigote o bigote y mentón. */
const ZONA: Record<string, 'barba' | 'perfilada' | 'bigote' | 'perilla' | 'candado'> = { afeitado: 'barba', barba_corta: 'barba', barba_larga: 'barba', barba_perfilada: 'perfilada', bigote: 'bigote', perilla: 'perilla', candado: 'candado' };

/** Largo (mm) desde el que el vello es una mancha tupida con su línea; por debajo es una sombra. */
const TUPIDO = 3;

export function dibujarVello(P: Parametros, L: Lienzo, C: Cara, recorteCara: string): VelloDibujado {
  const v = P.vello;
  const nada: VelloDibujado = { svg: '', tapaElMenton: false, tapaElBigote: false };
  if (v.densidad <= 0.02) return nada;
  const { yn, ym, mw, na } = C;
  const zona = ZONA[v.estilo] ?? 'barba';
  // La línea de la mejilla (de la patilla al bigote), natural o perfilada (más baja y recta).
  const mejilla: Pt[] = zona === 'perfilada'
    ? [[C.borde(0.2) + 0.05, 0.2], [C.wz * 0.8, 0.5], [mw + 0.1, ym - 0.05], [mw + 0.05, ym - 0.1], [na + 0.05, yn + 0.05], [0, yn + 0.078]]
    : [[C.borde(0.14) + 0.05, 0.14], [C.wz * 0.86, 0.36], [C.wz * 0.66, ym - 0.1], [mw + 0.07, ym - 0.1], [na + 0.06, yn + 0.045], [0, yn + 0.075]];
  const dBarba = curva([...mejilla, ...espejo(mejilla).slice(1), [-(C.wj + 0.12), C.yj + 0.05], [-(C.wm + 0.1), 1.2], [0, 1.3], [C.wm + 0.1, 1.2], [C.wj + 0.12, C.yj + 0.05]], true, 1);
  const lineaMejilla = curva([...mejilla, ...espejo(mejilla).slice(1)], false, 1);
  const o: string[] = [];

  // Afeitado (o casi): solo la sombra de la barba cerrada.
  if (v.largo < 0.3) {
    if (v.densidad > 0.3) o.push(`<g clip-path="url(#${recorteCara})"><path d="${dBarba}" fill="${v.color}" opacity="${n(v.densidad * 0.1)}"/></g>`);
    return { ...nada, svg: o.join('') };
  }
  const tupido = v.largo >= TUPIDO;
  const fuerza = tupido ? (v.densidad >= 0.5 ? 1 : 0.82) : v.densidad * (0.18 + (0.24 * v.largo) / TUPIDO);
  // Cuánto cuelga por debajo del mentón (unidades de cabeza): nada hasta 5 mm.
  const baja = clamp((v.largo - 5) / 120, 0, 0.5);
  const pelos = (cuantos: number, x0: number, x1: number, y0: number, y1: number, ...recortes: string[]): string => {
    if (!tupido) return '';
    const az = rngEstable('retrato', P.semilla, 'vello');
    const h: string[] = [];
    for (let k = 0; k < cuantos; k++) { const x = az.range(x0, x1), y = az.range(y0, y1); h.push(`M${n(x)},${n(y)}l${n(x * 0.03 + (az.next() - 0.5) * 0.02)},${n(0.05 + az.next() * 0.04)}`); }
    return recortes.reduce((dentro, r) => `<g clip-path="url(#${r})">${dentro}</g>`, L.trazo(h.join(''), 0.008, 0.5));
  };

  if (zona === 'barba' || zona === 'perfilada') {
    let recorte = recorteCara;
    if (tupido && baja > 0.015) {
      const m: Pt[] = [[0, 0.8], [C.wm, 0.74], [C.wj * 0.97, C.yj - 0.02], [C.wj * (0.92 + baja * 0.2), C.yj + 0.12 + baja * 0.3], [C.wm + 0.1 + baja * 0.15, 0.98 + baja * 0.6], [0, 1.03 + baja]];
      const cuelga = curva([...m, ...espejo(m).slice(1, -1)], true, 1);
      recorte = L.recorte(cuelga, curva(C.contorno, true, 1));
      o.push(L.relleno(cuelga, v.color), L.contorno(cuelga));
    }
    o.push(`<g clip-path="url(#${recorte})"><path d="${dBarba}" fill="${v.color}" opacity="${n(fuerza)}"/></g>`);
    if (tupido) o.push(`<g clip-path="url(#${recorteCara})">${L.contorno(lineaMejilla, 0.55)}</g>`);
    o.push(pelos(70, -C.wj, C.wj, 0.3, 1.05 + baja, L.recorte(dBarba), recorte));
    return { svg: o.join(''), tapaElMenton: tupido, tapaElBigote: tupido };
  }

  if (zona === 'candado') {
    // Bigote y mentón unidos alrededor de la boca, en una sola pieza.
    const m: Pt[] = [[0, yn + 0.06], [na * 0.9, yn + 0.05], [mw + 0.1, ym - 0.05], [mw + 0.13, ym + 0.1], [mw * 0.95, 0.88], [C.wm * 0.75 + baja * 0.1, 1.0 + baja * 0.5], [0, 1.03 + baja]];
    const d = curva([...m, ...espejo(m).slice(1, -1)], true, 1);
    o.push(tupido ? L.relleno(d, v.color) + L.contorno(d, 0.55) : `<path d="${d}" fill="${v.color}" opacity="${n(fuerza)}"/>`, pelos(26, -mw, mw, yn + 0.06, 1 + baja, L.recorte(d)));
    return { svg: o.join(''), tapaElMenton: tupido, tapaElBigote: tupido };
  }

  // Bigote: más grueso cuanto más largo.
  const grueso = clamp(v.largo / 10, 0.5, 1.6);
  const b: Pt[] = [[0, yn + 0.06], [na * 0.9, yn + 0.05], [mw + 0.04, ym - 0.045], [mw + 0.07 + 0.02 * grueso, ym + 0.005 * grueso], [mw * 0.6, ym - C.lu * (1.05 - 0.2 * grueso)], [0, ym - C.lu * (1 - 0.15 * grueso)]];
  const dBigote = curva([...b, ...espejo(b).slice(1, -1)], true, 1);
  const pieza = (d: string): string => (tupido ? L.relleno(d, v.color) + L.contorno(d, 0.55) : `<path d="${d}" fill="${v.color}" opacity="${n(fuerza)}"/>`);
  if (zona === 'perilla') {
    const m: Pt[] = [[0, ym + C.ll * 1.25], [mw * 0.55, ym + C.ll * 1.5], [mw * 0.75, 0.86], [C.wm * 0.7 + baja * 0.1, 1.0 + baja * 0.5], [0, 1.03 + baja]];
    const d = curva([...m, ...espejo(m).slice(1, -1)], true, 1);
    o.push(pieza(d), pelos(16, -mw * 0.7, mw * 0.7, ym + C.ll * 1.4, 1 + baja, L.recorte(d)));
  }
  o.push(pieza(dBigote), pelos(12, -mw, mw, yn + 0.06, ym - 0.03, L.recorte(dBigote)));
  return { svg: o.join(''), tapaElMenton: zona === 'perilla' && tupido, tapaElBigote: tupido };
}
