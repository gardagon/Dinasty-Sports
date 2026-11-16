/**
 * CAPA 2 DEL DIBUJO, el pelo: el estilo del catálogo (`PEINADOS`, en contracts) dice cómo va arreglado (rapado, corto, con flequillo, degradado, suelto o recogido) y el
 * largo (cm) decide la forma: cuánto abulta, si tapa las orejas y hasta dónde cuelga. Un corte que ha crecido se ve desordenado y luego largo. La calvicie sube la
 * línea del pelo y, cuando es alta, deja solo los lados. Para añadir un peinado: `docs/ANEXO_RETRATOS.md`.
 */
import { CALVICIE, rngEstable, type Rng } from '@ds/contracts';
import type { Cara } from './cara';
import { TINTA, TIPO_DE_PELO } from './catalogos';
import { curva, espejo, n, p, tramo, type Borde, type Pt } from './geometria';
import type { Lienzo } from './lienzo';
import type { Parametros } from './parametros';

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mezcla = (a: number, b: number, t: number) => a + (b - a) * t;

/** Largo que se ve (cm) desde el que el pelo tapa las orejas y cuelga a los lados. */
const LARGO_QUE_CUELGA = 9;
/** Largo (cm) por debajo del cual no se ve pelo (cabeza afeitada) y por debajo del cual solo se ve su sombra (rapado al cero). */
const LARGO_SIN_PELO = 0.05;
const LARGO_DE_SOMBRA = 0.4;
/** Los peinados que van recogidos: el pelo no cuelga suelto, sea cual sea su largo. */
const RECOGIDOS = ['coleta', 'mono', 'trenzas'];

export interface PeloDibujado { atras: string; delante: string }

/** `hombros`: a qué altura quedan los hombros, en unidades de cabeza (el pelo largo cae por delante de ellos). */
export function dibujarPelo(P: Parametros, L: Lienzo, C: Cara, hombros: number): PeloDibujado {
  const h = P.peinado;
  if (h.largo < LARGO_SIN_PELO) return { atras: '', delante: '' };
  const sombra = h.largo < LARGO_DE_SOMBRA;
  const hombre = P.sexo === 'm';
  const T = TIPO_DE_PELO[h.tipo] ?? TIPO_DE_PELO.liso;
  const az = rngEstable('retrato', P.semilla, 'pelo');
  const u = P.cabeza / 2;
  const lado = h.lado, calvo = h.calvicie, wc = C.wc, yh = C.yh;
  const visto = h.largo * T.cuelga;
  const recogido = RECOGIDOS.includes(h.estilo);
  const tupe = h.estilo === 'tupe' && h.crecido < 4;
  const degradado = h.estilo === 'degradado' && h.crecido < 3;
  // Volumen arriba y a los lados (unidades de cabeza): crece con el largo según el tipo de pelo; la calvicie lo aclara.
  let vt = (T.volumen[0] + T.volumen[1] * Math.min(h.largo, T.volumen[2])) * (1 - 0.5 * calvo);
  let vs = vt * T.lados;
  if (degradado) vs = 0.018;
  if (recogido) { vt = Math.max(0.035, vt * 0.45); vs = Math.max(0.02, vs * 0.4); }
  if (tupe) { vt *= 1.9; vs *= 0.55; }
  vt = Math.max(0.03, vt); vs = Math.max(0.015, vs);
  // La sombra del rapado al cero no abulta: va pegada al cráneo.
  if (sombra) { vt = 0.004; vs = 0.004; }
  // Desorden de un corte crecido: 0 recién hecho.
  const desorden = recogido ? 0 : clamp(h.crecido / (0.5 * (h.largo - h.crecido) + 2));
  // El pelo muy corto no hace ondas ni rizos en el borde.
  const tr = (pts: readonly Pt[], b: Borde = T.borde): string => tramo(pts, h.largo < 2 ? 'liso' : b, T.paso, 1);
  /** Aparta los puntos de en medio al azar: mechones fuera de su sitio. */
  const revuelto = (pts: Pt[], cuanto = 0.07): Pt[] => (desorden <= 0 ? pts : pts.map((q, i): Pt => { if (i === 0 || i === pts.length - 1) return q; const k = 1 + az.range(-0.25, 1) * cuanto * desorden; return [q[0] * k, -0.3 + (q[1] + 0.3) * k]; }));
  /** El contorno del pelo por arriba: el del cráneo más el volumen a los lados (`a`) y arriba (`b`). */
  const casco = (a: number, b: number): Pt[] => { const m: Pt[] = [[wc + a, -0.3], [0.9 * wc + a, -0.72 - 0.5 * b], [0.53 * wc + 0.6 * a, -0.965 - 0.9 * b], [0, -1.005 - b]]; return [...m.map(([x, y]): Pt => [-x, y]), ...m.slice(0, -1).reverse()]; };
  const atras: string[] = [];
  const formas: string[] = [];
  const extras: string[] = [];

  /** Los lados que quedan con la calvicie alta. */
  const lados = (ysb: number): void => {
    const q = clamp((calvo - CALVICIE.soloLados) / (1 - CALVICIE.soloLados));
    const yTop = mezcla(-0.66, -0.3, q);
    for (const s of [-1, 1]) {
      const banda: Pt[] = [[s * (C.borde(ysb) + 0.005), ysb], [s * (wc + vs * 0.7), -0.1], [s * (wc + vs * 0.75), yTop + 0.16], [s * wc * 0.95, yTop], [s * wc * 0.8, yTop + 0.1], [s * wc * 0.86, -0.14], [s * (C.borde(ysb) - 0.075), ysb]];
      formas.push(curva(s > 0 ? banda : [...banda].reverse(), true, 1));
    }
    if (q < 0.55) {
      // Aún queda algo de pelo fino por arriba.
      const mitad: Pt[] = [[wc * 0.8, -0.5], [wc * 0.55, -0.82], [0, -0.9]];
      const arriba = casco(0.01, vt * 0.4).slice(1, -1);
      extras.push(`<path d="M${p(arriba[0])}${tramo(arriba, 'liso', 0.2)}L${p(mitad[0])}${tramo([...mitad, ...espejo(mitad).slice(1)], 'liso', 0.2)}Z" fill="${P.pelo}" opacity="${n(0.4 * (1 - q / 0.55))}"/>`);
    }
  };

  if (recogido || visto < LARGO_QUE_CUELGA) {
    // Pelo que no cuelga: un casco con las orejas a la vista.
    const ysb = h.largo < 1 || degradado || recogido ? -0.02 : mezcla(0.02, 0.1, P.masc) + 0.1 * desorden;
    const fuera: Pt[] = [[-(C.borde(ysb) + 0.005), ysb], [-(wc + vs * 0.75), -0.1], ...revuelto(casco(vs, vt)), [wc + vs * 0.75, -0.1], [C.borde(ysb) + 0.005, ysb]];
    if (calvo < CALVICIE.soloLados) {
      // En los hombres la calvicie empieza por las entradas (la línea del pelo retrocede en las sienes) y luego sube también por el centro; en las mujeres sube toda a la vez.
      const q = calvo / CALVICIE.soloLados;
      const entradas = clamp(calvo / CALVICIE.entradas), arriba = clamp((calvo - CALVICIE.entradas) / (CALVICIE.soloLados - CALVICIE.entradas));
      const rec = hombre ? 0.27 * entradas + 0.06 * arriba : 0.1 * q, yc = yh - (hombre ? 0.24 * arriba : 0.2 * q);
      let dentro: Pt[];
      const flequillo = h.estilo === 'flequillo' && calvo < 0.2;
      if (flequillo) {
        // El flequillo baja al crecer, hasta las cejas.
        const base = -0.4 + Math.min(0.3, h.crecido * 0.035);
        const fy = (x: number) => base + 0.075 * lado * (x / wc) + (az.next() - 0.5) * (0.02 + 0.05 * desorden);
        dentro = [[C.borde(ysb) - 0.075, ysb], [wc * 0.93, -0.16], [wc * 0.9, -0.33], [wc * 0.62, fy(wc * 0.62)], [wc * 0.22, fy(wc * 0.22)], [-wc * 0.22, fy(-wc * 0.22)], [-wc * 0.62, fy(-wc * 0.62)], [-wc * 0.9, -0.33], [-wc * 0.93, -0.16], [-(C.borde(ysb) - 0.075), ysb]];
      } else {
        // La línea del pelo: sube y hace entradas con la calvicie; con el pelo crecido caen mechones sobre la frente.
        const cae = recogido ? 0 : 0.16 * desorden;
        const mitad: Pt[] = [[C.borde(ysb) - 0.075, ysb], [wc * 0.93, -0.17], [wc * 0.87, -0.4], [wc * 0.7, yh + 0.09 - rec * 0.5 + cae * az.next()], [wc * 0.46, yh - 0.005 - rec * 1.25 + cae * az.next()], [wc * 0.2, yc - 0.012 - (tupe ? 0.05 : 0) + cae * az.next()], [0, yc + 0.012 * lado - (tupe ? 0.06 : 0) + cae * az.next()]];
        const otra = espejo(mitad).slice(1).map(([x, y], i): Pt => [x, i > 0 && i < 4 ? y + cae * (az.next() - 0.5) : y]);
        dentro = [...mitad, ...otra];
      }
      formas.push(`M${p(fuera[0])}${tr(fuera)}L${p(dentro[0])}${flequillo ? tr(dentro) : tramo(dentro, 'liso', 0.2)}Z`);
    } else lados(ysb);
    if (recogido && calvo < CALVICIE.soloLados) {
      const rizo = h.tipo === 'muy_rizado';
      const bola = (cx: number, cy: number, r: number): string => {
        const pts = Array.from({ length: 17 }, (_, i): Pt => { const g = (i / 16) * Math.PI * 2 - Math.PI / 2; return [cx + r * Math.cos(g), cy + r * Math.sin(g)]; });
        return T.borde === 'rizo' ? `M${p(pts[0])}${tramo(pts, 'rizo', T.paso, 1)}Z` : curva(pts.slice(0, -1), true, 1);
      };
      if (h.estilo === 'mono' || (h.estilo === 'coleta' && rizo)) {
        // Un moño en lo alto (en el pelo muy rizado, también la coleta es un moño de rizos): mayor cuanto más largo es el pelo.
        const r = clamp(0.17 + 0.006 * h.largo * (rizo ? 2 : 1), 0.18, 0.42);
        atras.push(bola(0, -1.0 - vt - r * 0.72, r));
      } else if (h.estilo === 'trenzas') {
        // Dos trenzas que caen por delante de los hombros, más largas cuanto más largo es el pelo.
        const fin = clamp(0.3 + (visto - 14) / u, 0.7, hombros + 1.0);
        for (const s of [-1, 1]) {
          const x = (y: number) => s * (mezcla(C.borde(0.15) + 0.07, C.wj * 0.95, clamp((y - 0.1) / 0.9)));
          const g = 0.085, pasos = Math.max(3, Math.round((fin - 0.05) / 0.2));
          const baja = Array.from({ length: pasos + 1 }, (_, i): Pt => { const y = 0.05 + ((fin - 0.05) * i) / pasos; return [x(y) + s * g, y]; });
          const sube = Array.from({ length: pasos + 1 }, (_, i): Pt => { const y = fin - ((fin - 0.05) * i) / pasos; return [x(y) - s * g, y]; });
          const giro = s > 0 ? 1 : 0;
          const trenza = `M${p(baja[0])}${tramo(baja, 'rizo', 0.19, giro)}Q${n(x(fin))},${n(fin + 0.16)} ${p(sube[0])}${tramo(sube, 'rizo', 0.19, giro)}Z`;
          formas.push(trenza);
        }
      } else {
        // La coleta asoma por un lado y llega más abajo cuanto más largo es el pelo.
        const fin = clamp(-0.3 + (visto - 12) / u, 0.2, hombros + 0.9);
        const y = (t: number) => mezcla(-0.62, fin, t);
        const cola: Pt[] = [[0.2, -0.9], [wc + 0.2, -0.62], [wc + 0.42, y(0.4)], [wc + 0.34, y(0.8)], [wc + 0.14, fin], [wc + 0.1, y(0.65)], [wc + 0.02, y(0.35)], [wc - 0.15, -0.5]];
        atras.push(`M${p([lado * cola[0][0], cola[0][1]])}${tramo(cola.map(([x, yy]): Pt => [lado * x, yy]), T.borde, T.paso, lado > 0 ? 1 : 0)}Z`);
      }
    }
  } else {
    // Pelo que cuelga: una capa por detrás y otra por delante, con la raya, que tapa las orejas.
    const yL = Math.min(hombros + 0.95, 0.15 + ((visto - LARGO_QUE_CUELGA) / u) * 0.9);
    const porDelante = yL > hombros - 0.1; // cae por delante de los hombros en dos mechones
    const ancho = h.tipo === 'liso' ? 0.1 : h.tipo === 'ondulado' ? 0.18 : h.tipo === 'rizado' ? 0.3 : 0.06;
    const xb = wc + vs + ancho;
    const lateral = (k: number): Pt[] => [[-(wc + vs + ancho * k), Math.min(0.45, yL - 0.1)], [-(wc + vs + 0.02), -0.22], ...revuelto(casco(vs, vt)), [wc + vs + 0.02, -0.22], [wc + vs + ancho * k, Math.min(0.45, yL - 0.1)]];
    const xf = porDelante ? xb : xb * 0.86; // las puntas se recogen un poco
    const contorno: Pt[] = [[-xf, yL], ...(porDelante ? [] : [[-xb, yL - 0.2] as Pt]), ...lateral(0.9), ...(porDelante ? [] : [[xb, yL - 0.2] as Pt]), [xf, yL]];
    atras.push(`M${p(contorno[0])}${tr(contorno)}${tramo([[xf, yL], [0, yL + 0.06], [-xf, yL]], T.borde === 'rizo' ? 'rizo' : 'liso', T.paso, 1)}Z`);
    if (calvo < CALVICIE.soloLados) {
      const q = calvo / CALVICIE.soloLados;
      const px = lado * 0.16 * wc, yRaya = yh - 0.02 - 0.32 * q;
      const yF = porDelante ? yL + 0.08 : yL - 0.04;
      const xiB = porDelante ? 0.5 * C.w : C.borde(Math.min(0.9, yL * 0.7)) + 0.06;
      const xoB = porDelante ? wc + vs * 0.4 : xf - 0.01;
      const cortina = (s: number): Pt[] => [[s * xiB, yF], ...(porDelante ? [[s * (C.wj * 0.98), 1.0] as Pt] : []), ...(yF > 0.62 ? [[s * (C.borde(0.5) - 0.015), 0.5] as Pt] : []), [s * (C.borde(0.1) - 0.07), 0.08], [s * wc * 0.8, -0.27], [s * wc * (0.5 + 0.15 * q), -0.49 - 0.1 * q], [px + s * 0.015, yRaya]];
      const exterior: Pt[] = [[-xoB, yF], ...(porDelante ? [] : [[-xb + 0.01, yF - 0.18] as Pt]), ...lateral(porDelante ? 0.6 : 0.9), ...(porDelante ? [] : [[xb - 0.01, yF - 0.18] as Pt]), [xoB, yF]];
      const der = cortina(1), izq = cortina(-1).reverse();
      if (h.estilo === 'bob' && q < 0.55) {
        // Con flequillo recto: en vez de la raya, el pelo cruza la frente por encima de las cejas (y baja al crecer).
        const fy = Math.min(C.ey - C.eh - 0.02, -0.34 + Math.min(0.3, h.crecido * 0.035));
        const frente: Pt[] = [...der.slice(0, -2), [wc * 0.84, fy - 0.02], [wc * 0.4, fy + 0.02 * az.next()], [0, fy + 0.015], [-wc * 0.4, fy + 0.02 * az.next()], [-wc * 0.84, fy - 0.02], ...izq.slice(2)];
        formas.push(`M${p(exterior[0])}${tr(exterior)}L${p(frente[0])}${tramo(frente, 'liso', 0.2)}Z`);
      } else formas.push(`M${p(exterior[0])}${tr(exterior)}L${p(der[0])}${tramo(der, 'liso', 0.2)}L${p(izq[0])}${tramo(izq, 'liso', 0.2)}Z`);
    } else lados(0.1);
  }

  // ---- relleno, sombra, mechones y contorno
  const caja: [number, number, number, number] = [-(wc + 0.75), -1.7, wc + 0.75, Math.max(1.3, hombros + 1.1)];
  // Las raíces de un pelo teñido: el color natural (con sus canas) junto al cuero cabelludo, tan anchas como haya crecido.
  const raiz = h.tinte && h.raiz > 0 ? clamp(h.raiz / u, 0.035, 1.2) : 0;
  const craneo = curva(casco(0, 0), false, 1);
  const pintar = (d: string, detras: boolean): string => {
    // Rapado al cero: solo la sombra de donde crece el pelo, sin línea.
    if (sombra) return detras ? '' : `<path d="${d}" fill="${P.pelo}" opacity="${n(0.16 + 0.5 * (h.largo / LARGO_DE_SOMBRA))}"/>`;
    const rec = L.recorte(d);
    const raices = raiz > 0 && !detras ? `<path d="${craneo}" fill="none" stroke="${h.natural}" stroke-width="${n(raiz * 2)}" stroke-linecap="round"/>` : '';
    const dentro = raices + L.sombra(`M${n(wc * 0.55)},-1.8C${n(wc * 0.9)},-0.9 ${n(wc * 0.85)},0 ${n(wc * 0.7)},3.2L${n(wc + 0.9)},3.2L${n(wc + 0.9)},-1.8Z`, P.peloSombra, 0.85) + mechones(P, L, az, caja, lado * 0.16 * wc);
    return L.relleno(d, detras ? P.peloSombra : P.pelo) + `<g clip-path="url(#${rec})">${dentro}</g>` + L.contorno(d);
  };
  return { atras: atras.map((d) => pintar(d, true)).join(''), delante: formas.map((d) => pintar(d, false)).join('') + (sombra ? '' : extras.join('')) };
}

/** La textura del pelo: mechones sueltos por toda la caja (se recortan a la forma), con la dirección del pelo y la forma de su tipo; parte de ellos, canas. */
function mechones(P: Parametros, L: Lienzo, az: Rng, caja: readonly [number, number, number, number], rayaX: number): string {
  const tipo = P.peinado.tipo;
  const cuantos = Math.round(34 * (tipo === 'muy_rizado' ? 2.2 : tipo === 'rizado' ? 1.5 : 1) * ((caja[3] - caja[1]) / 3));
  const oscuros: string[] = [];
  const canosos: string[] = [];
  const canas = P.peinado.canas;
  for (let i = 0; i < cuantos; i++) {
    const x = az.range(caja[0], caja[2]), y = az.range(caja[1], caja[3]);
    // Dirección: desde la coronilla hacia fuera por arriba; hacia abajo en lo que cuelga.
    let dx = x - rayaX, dy = y + 1.0;
    if (y > -0.25) { dx = dx * 0.12; dy = 1; }
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const nx = -dy, ny = dx;
    let d: string;
    if (tipo === 'liso') { const len = az.range(0.25, 0.5), c = az.range(-0.04, 0.04); d = `M${n(x)},${n(y)}q${n(dx * len * 0.5 + nx * c)},${n(dy * len * 0.5 + ny * c)} ${n(dx * len)},${n(dy * len)}`; }
    else if (tipo === 'ondulado') { const len = az.range(0.28, 0.46), c = 0.055; d = `M${n(x)},${n(y)}c${n(dx * len * 0.33 + nx * c)},${n(dy * len * 0.33 + ny * c)} ${n(dx * len * 0.66 - nx * c)},${n(dy * len * 0.66 - ny * c)} ${n(dx * len)},${n(dy * len)}`; }
    else { const r = tipo === 'rizado' ? az.range(0.045, 0.075) : az.range(0.022, 0.04), g = az.range(0, 6.28); d = `M${n(x)},${n(y)}a${n(r)},${n(r)} 0 1 ${az.chance(0.5) ? 1 : 0} ${n(Math.cos(g) * r * 1.5)},${n(Math.sin(g) * r * 1.5)}`; }
    // Las canas salen antes en las sienes.
    const sien = Math.abs(x) > 0.5 && y > -0.6 ? 1.6 : 1;
    (!P.peinado.tinte && canas > 0.02 && canas < 0.85 && az.next() < canas * sien * 0.8 ? canosos : oscuros).push(d);
  }
  return (oscuros.length ? L.trazo(oscuros.join(''), 0.0136, 0.55, TINTA) : '') + (canosos.length ? L.trazo(canosos.join(''), 0.0136, 0.9, '#efeeea') : '');
}
