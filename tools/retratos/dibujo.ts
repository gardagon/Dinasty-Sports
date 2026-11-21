/**
 * MUESTRAS DE ESTILO (etapa 2a de `docs/PLAN_VISUALIZADOR.md`): de los parámetros a SVG, con cuatro variantes de estilo. Código provisional para que el usuario elija;
 * el dibujo de verdad (paquete `@ds/retrato`) se hará en la etapa 2b con el estilo elegido. Determinista: lo que se sortea sale de la semilla de dibujo de la persona.
 *
 * Unidades: el cuerpo se dibuja en centímetros (x = 0 en el eje de la persona, y = 0 en la coronilla, hacia abajo); la cabeza, en «unidades de cabeza» (media altura de
 * la cabeza: va de y = −1, la coronilla, a y = 1, el mentón) dentro de un grupo escalado. El retrato y la figura entera son el mismo dibujo con otro encuadre.
 */
import { rngEstable, type Rng } from '@ds/contracts';
import { curva, espejo, n, p, tramo, type Borde, type Pt } from './geometria';
import { mix, type Parametros } from './parametros';

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mezcla = (a: number, b: number, t: number) => a + (b - a) * t;

// ------------------------------------------------------------------------------------------------------------ estilos

export interface Estilo {
  id: string;
  nombre: string;
  /** En qué se diferencia, para rotular la muestra. */
  resumen: string;
  /** Tamaño de la cabeza y de los ojos respecto a lo real (1 = proporciones reales). */
  cabeza: number;
  ojos: number;
  /** Curvas (1) o aristas (hacia 0) en las formas grandes. */
  tension: number;
  contorno: 'no' | 'tinta' | 'color';
  /** Grosor del contorno, en unidades de cabeza. */
  grosor: number;
  sombra: 'difusa' | 'plana' | 'facetas' | 'pintada';
  pelo: 'masa' | 'tinta' | 'bloques' | 'hebras';
}

export const ESTILOS: readonly Estilo[] = [
  { id: 'suave', nombre: 'A · Suave', resumen: 'Sin línea. Volumen con degradados y sombras difuminadas. El pelo es una masa con brillo. Proporciones reales.', cabeza: 1, ojos: 1, tension: 1, contorno: 'no', grosor: 0, sombra: 'difusa', pelo: 'masa' },
  { id: 'tinta', nombre: 'B · Tinta', resumen: 'Línea oscura de contorno y sombra plana de un solo tono, de borde duro (como un cómic). El pelo, con mechones a línea. Cabeza un poco mayor.', cabeza: 1.06, ojos: 1.05, tension: 1, contorno: 'tinta', grosor: 0.036, sombra: 'plana', pelo: 'tinta' },
  { id: 'facetas', nombre: 'C · Facetas', resumen: 'Sin línea. Formas de aristas y planos de luz y sombra recortados (papel cortado). El pelo, en bloques. Cabeza claramente mayor: el más estilizado.', cabeza: 1.16, ojos: 1.1, tension: 0.22, contorno: 'no', grosor: 0, sombra: 'facetas', pelo: 'bloques' },
  { id: 'pintado', nombre: 'D · Pintado', resumen: 'Línea fina del color de cada forma, degradados, sombra con borde, brillos y rubor (ilustración). El pelo, hebra a hebra. Ojos algo mayores.', cabeza: 1.03, ojos: 1.12, tension: 1, contorno: 'color', grosor: 0.016, sombra: 'pintada', pelo: 'hebras' },
];

const TINTA = '#2a2026';

// ------------------------------------------------------------------------------------------------------------ lienzo

/** Lo que se va juntando de un dibujo: definiciones (degradados, recortes, filtros) con ids propios. */
class Lienzo {
  defs: string[] = [];
  private cuenta = 0;
  private filtros = new Map<string, string>();
  constructor(readonly prefijo: string) {}
  id(): string { return `${this.prefijo}${(this.cuenta++).toString(36)}`; }
  recorte(d: string): string { const id = this.id(); this.defs.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`); return id; }
  desenfoque(sigma: number): string {
    const k = n(sigma);
    let id = this.filtros.get(k);
    if (!id) { id = this.id(); this.filtros.set(k, id); this.defs.push(`<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${k}"/></filter>`); }
    return id;
  }
  lineal(paradas: [number, string][], x1 = 0, y1 = 0, x2 = 0, y2 = 1): string {
    const id = this.id();
    this.defs.push(`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${paradas.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`);
    return `url(#${id})`;
  }
  radial(paradas: [number, string][], cx: number, cy: number, r: number): string {
    const id = this.id();
    this.defs.push(`<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${paradas.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</radialGradient>`);
    return `url(#${id})`;
  }
}

/** El pincel de un estilo: cómo rellena, sombrea, ilumina y traza. `esc` es el tamaño de una unidad de cabeza en las unidades en que se está dibujando (1 en la cabeza). */
class Pincel {
  constructor(readonly L: Lienzo, readonly E: Estilo, readonly esc = 1) {}
  get suave(): boolean { return this.E.sombra === 'difusa' || this.E.sombra === 'pintada'; }
  /** Trazado de una forma grande: con la tensión del estilo. */
  forma(pts: readonly Pt[], cerrada = true): string { return curva(pts, cerrada, this.E.tension); }
  /** Trazado de una mancha de sombra o de luz: curva, o polígono en el estilo de facetas. */
  mancha(pts: readonly Pt[]): string { return curva(pts, true, this.E.sombra === 'facetas' ? 0 : 1); }
  relleno(d: string, color: string, extra = ''): string { return `<path d="${d}" fill="${color}"${extra}/>`; }
  /** El contorno de una forma, según el estilo (nada, tinta o el color de la forma oscurecido). */
  contorno(d: string, color: string, peso = 1): string {
    if (this.E.contorno === 'no') return '';
    const c = this.E.contorno === 'tinta' ? TINTA : mix(color, '#2c1512', 0.5);
    return `<path d="${d}" fill="none" stroke="${c}" stroke-width="${n(this.E.grosor * peso * this.esc)}" stroke-linejoin="round" stroke-linecap="round"/>`;
  }
  sombra(d: string, color: string, fuerza: number, difuso = 0.06): string {
    const s = this.E.sombra;
    if (s === 'difusa') return `<path d="${d}" fill="${color}" opacity="${n(fuerza * 0.6)}" filter="url(#${this.L.desenfoque(difuso * this.esc)})"/>`;
    if (s === 'pintada') return `<path d="${d}" fill="${color}" opacity="${n(Math.min(1, fuerza * 0.85))}" filter="url(#${this.L.desenfoque(difuso * 0.22 * this.esc)})"/>`;
    return `<path d="${d}" fill="${color}" opacity="${n(Math.min(1, fuerza * (s === 'plana' ? 0.85 : 0.75)))}"/>`;
  }
  luz(d: string, color: string, fuerza: number, difuso = 0.06): string {
    const s = this.E.sombra;
    if (s === 'plana') return '';
    if (s === 'facetas') return `<path d="${d}" fill="${color}" opacity="${n(Math.min(1, fuerza * 0.38))}"/>`;
    return `<path d="${d}" fill="${color}" opacity="${n(Math.min(1, fuerza * (s === 'pintada' ? 0.95 : 0.6)))}" filter="url(#${this.L.desenfoque(difuso * (s === 'pintada' ? 0.6 : 1) * this.esc)})"/>`;
  }
  /** Una línea de detalle (párpado, arruga, pliegue): más marcada en tinta, más leve en los estilos sin línea. */
  trazo(d: string, color: string, ancho: number, opacidad = 1): string {
    const e = this.E;
    const c = e.contorno === 'tinta' ? TINTA : color;
    const a = ancho * (e.contorno === 'tinta' ? 1.25 : 1) * this.esc;
    const o = opacidad * (e.contorno === 'tinta' ? 1 : e.sombra === 'facetas' ? 0.85 : 0.8);
    return `<path d="${d}" fill="none" stroke="${c}" stroke-width="${n(a)}" stroke-linecap="round" stroke-linejoin="round" opacity="${n(Math.min(1, o))}"/>`;
  }
}

// ------------------------------------------------------------------------------------------------------------ medidas de la cara

interface Cara {
  w: number; wc: number; wz: number; wj: number; wm: number; yj: number;
  /** Media anchura de la cara a una altura. */
  borde(y: number): number;
  contorno: Pt[];
  ey: number; ex: number; ew: number; eh: number; sube: number;
  yn: number; na: number;
  ym: number; mw: number; lu: number; ll: number;
  yh: number;
}

const FORMAS: Record<string, readonly [number, number, number, number]> = {
  // [anchura, mandíbula, mentón, altura del ángulo de la mandíbula]
  ovalada: [0, 0, 0, 0.55], redonda: [0.045, 0.07, 0.07, 0.5], cuadrada: [0.02, 0.12, 0.11, 0.63], alargada: [-0.055, -0.01, 0, 0.57], corazon: [0.012, -0.05, -0.05, 0.52],
};

function medidasDeCara(P: Parametros, E: Estilo): Cara {
  const r = P.rostro, m = P.madura, v = P.vejez, g = Math.max(0, P.gordo);
  const F = FORMAS[P.forma] ?? FORMAS.ovalada;
  const hombre = P.sexo === 'm';
  const w = mezcla(0.765, 0.7, m) + F[0] + 0.05 * g;
  const wc = w * (P.forma === 'corazon' ? 1.01 : 0.985);
  const wz = w * (0.925 + 0.075 * r.pomulos + (P.forma === 'corazon' ? 0.02 : 0));
  const wj = w * (mezcla(0.8, hombre ? 0.8 + 0.05 * P.masc : 0.74, m) + F[1] + 0.1 * g + 0.04 * v);
  const wm = w * (mezcla(0.3, hombre ? 0.37 : 0.29, m) + F[2] + (r.menton - 0.5) * 0.17 + 0.05 * g);
  const yj = F[3] + 0.03 * g + 0.03 * v;
  const mitad: Pt[] = [[0, -1], [0.5 * wc, -0.955], [0.875 * wc, -0.73], [wc, -0.32], [wz, 0.1], [wj, yj], [(wj + wm) / 2 + w * (0.05 + 0.05 * (1 - m) + 0.05 * g + (P.forma === 'redonda' ? 0.04 : P.forma === 'cuadrada' ? 0.05 : 0)), (yj + 0.9) / 2 + 0.03], [wm, 0.9 + 0.02 * (r.menton - 0.5)], [0, 1]];
  const contorno = [...mitad, ...espejo(mitad).slice(1, -1)];
  const borde = (y: number): number => {
    for (let i = 1; i < mitad.length; i++) if (y <= mitad[i][1]) { const a = mitad[i - 1], b = mitad[i]; return a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1] || 1); }
    return 0;
  };
  const ey = mezcla(0.13, 0, m);
  const ew = 0.4 * w * (0.86 + 0.26 * r.ojosTamano) * mezcla(1.14, 1, m) * E.ojos;
  const eh = ew * (0.31 + 0.19 * r.ojosForma) * (1 - 0.18 * v) * mezcla(1.08, 1, m);
  const sube = (ew / 2) * (0.04 + 0.22 * (1 - r.ojosForma) - 0.1 * v);
  const yn = ey + mezcla(0.3, 0.4, m) + 0.1 * (r.narizTamano - 0.5) * mezcla(0.6, 1, m) + 0.03 * v;
  const na = w * (0.155 + 0.1 * r.narizForma) * (0.88 + 0.24 * r.narizTamano) * mezcla(0.85, 1, m) * (1 + 0.08 * v + 0.04 * P.masc);
  const ym = Math.min(0.72, yn + mezcla(0.17, 0.215, m) - (r.menton - 0.5) * 0.05);
  const mw = w * (0.25 + 0.13 * r.bocaAnchura) * mezcla(0.86, 1, m);
  const lu = (0.03 + 0.05 * r.bocaGrosor) * (1 - 0.3 * v) * (1 - 0.12 * P.masc);
  const ll = (0.045 + 0.065 * r.bocaGrosor) * (1 - 0.25 * v) * (1 - 0.1 * P.masc);
  return { w, wc, wz, wj, wm, yj, borde, contorno, ey, ex: 0.41 * w, ew, eh, sube, yn, na, ym, mw, lu, ll, yh: -0.6 };
}

// ------------------------------------------------------------------------------------------------------------ la cara

function dibujarCara(P: Parametros, E: Estilo, L: Lienzo, C: Cara): string {
  const B = new Pincel(L, E);
  const r = P.rostro, v = P.vejez, g = Math.max(0, P.gordo), a = P.arrugas;
  const o: string[] = [];
  const dCara = B.forma(C.contorno);
  const recorte = L.recorte(dCara);
  const sombraCol = P.pielSombra;
  const linea = mix(P.pielSombra, '#2a1512', 0.35);

  // ---- orejas (detrás de la cara)
  const eyC = (C.ey + C.yn) / 2 - 0.04;
  const eh = (0.4 + 0.14 * r.orejasTamano) * (1 + 0.1 * v);
  const ew = eh * (0.2 + 0.3 * r.orejasDespegadas);
  for (const s of [-1, 1]) {
    const x0 = s * (C.borde(eyC) - 0.06);
    const q = (x: number, y: number): Pt => [x0 + s * x, eyC + y];
    const d = `M${p(q(0, -eh * 0.42))}C${p(q(ew * 0.75, -eh * 0.66))} ${p(q(ew * 1.25, -eh * 0.2))} ${p(q(ew * 0.85, eh * 0.16))}C${p(q(ew * 0.68, eh * 0.4))} ${p(q(ew * 0.3, eh * 0.56))} ${p(q(0, eh * 0.4))}Z`;
    o.push(B.relleno(d, s > 0 ? mix(P.piel, sombraCol, 0.3) : mix(P.piel, sombraCol, 0.1)));
    o.push(B.trazo(`M${p(q(ew * 0.25, -eh * 0.3))}C${p(q(ew * 0.75, -eh * 0.42))} ${p(q(ew * 0.85, -eh * 0.05))} ${p(q(ew * 0.5, eh * 0.12))}`, linea, 0.016, 0.55));
    o.push(B.contorno(d, P.piel));
  }

  // ---- base de la cara
  const base = B.suave ? L.radial([[0, mix(P.piel, P.pielLuz, 0.5)], [0.55, P.piel], [1, mix(P.piel, sombraCol, 0.3)]], 0.4, 0.38, 0.75) : P.piel;
  o.push(B.relleno(dCara, base));

  // ---- luces y sombras, recortadas a la cara. La luz viene de arriba a la izquierda.
  const s: string[] = [];
  const w = C.w;
  // Lado en sombra (derecha).
  s.push(B.sombra(B.mancha([[0.42 * C.wc, -1.1], [0.72 * C.wc, -0.62], [0.78 * C.wz, 0.02], [0.8 * C.wj, C.yj - 0.08], [0.55 * C.wm + 0.12, 0.9], [0.1, 1.1], [w + 0.3, 1.1], [w + 0.3, -1.1]]), sombraCol, 0.55, 0.09));
  // Bajo el pómulo: más marcado con pómulos altos, menos con grasa.
  const hueco = clamp(0.25 + 0.6 * r.pomulos - 0.5 * g) * mezcla(0.5, 1, P.madura);
  for (const lado of [-1, 1]) {
    s.push(B.sombra(B.mancha([[lado * C.wz * 0.98, 0.2], [lado * C.wz * 0.6, 0.3], [lado * (C.mw + 0.1), C.ym + 0.02], [lado * C.wj * 0.72, C.yj + 0.12], [lado * C.wj * 1.0, C.yj - 0.05]]), sombraCol, hueco * (lado > 0 ? 0.5 : 0.36), 0.08));
    if (E.sombra !== 'plana') s.push(B.luz(B.mancha([[lado * C.wz * 0.9, C.ey + 0.2], [lado * C.wz * 0.5, C.ey + 0.22], [lado * C.wz * 0.45, C.ey + 0.34], [lado * C.wz * 0.82, C.ey + 0.36]]), P.pielLuz, (0.3 + 0.5 * r.pomulos) * (lado < 0 ? 1 : 0.45), 0.06));
  }
  // Cuencas de los ojos y frente.
  for (const lado of [-1, 1]) s.push(B.sombra(B.mancha([[lado * (C.ex - C.ew * 0.62), C.ey - C.eh * 0.2], [lado * C.ex, C.ey - C.eh * 0.95 - 0.03], [lado * (C.ex + C.ew * 0.62), C.ey - C.eh * 0.3], [lado * (C.ex + C.ew * 0.5), C.ey + C.eh * 0.5], [lado * (C.ex - C.ew * 0.5), C.ey + C.eh * 0.55]]), sombraCol, 0.22 + 0.2 * v, 0.05));
  s.push(B.luz(B.mancha([[-0.55 * C.wc, -0.5], [0.05, -0.56], [0.1, -0.3], [-0.5 * C.wc, -0.24]]), P.pielLuz, 0.55, 0.1));
  // Papada y mentón.
  if (g > 0.15) s.push(B.sombra(B.mancha([[-C.wj * 0.8, C.yj + 0.2], [0, 0.9], [C.wj * 0.8, C.yj + 0.2], [C.wm, 1.02], [-C.wm, 1.02]]), sombraCol, 0.5 * g, 0.05));
  s.push(B.luz(B.mancha([[-C.wm * 0.6, 0.8], [C.wm * 0.3, 0.8], [C.wm * 0.3, 0.92], [-C.wm * 0.5, 0.93]]), P.pielLuz, 0.3, 0.05));
  // Rubor (niños y estilo pintado).
  const rubor = (1 - P.madura) * 0.5 + (E.sombra === 'pintada' ? 0.28 : 0.1);
  if (E.sombra !== 'plana') for (const lado of [-1, 1]) s.push(`<ellipse cx="${n(lado * C.wz * 0.62)}" cy="${n(C.yn - 0.03)}" rx="${n(0.17)}" ry="${n(0.11)}" fill="${P.rubor}" opacity="${n(rubor * 0.5)}" filter="url(#${L.desenfoque(0.06)})"/>`);
  o.push(`<g clip-path="url(#${recorte})">${s.join('')}</g>`);

  // ---- barba (antes de la boca y la nariz)
  o.push(dibujarBarba(P, E, L, C, recorte));

  // ---- nariz
  const { yn, na } = C;
  const puente = 0.035 + 0.03 * (1 - r.narizForma);
  const fuerzaNariz = mezcla(0.5, 1, P.madura);
  o.push(B.sombra(B.mancha([[puente, C.ey - 0.1], [puente + 0.02, C.ey + 0.12], [na * 0.62, yn - 0.2], [na * 1.02, yn - 0.06], [na * 0.9, yn + 0.03], [na * 0.3, yn + 0.05], [0.05, yn - 0.03], [0.015, yn - 0.2]]), sombraCol, 0.55 * fuerzaNariz, 0.03));
  o.push(B.luz(B.mancha([[-puente, C.ey + 0.02], [puente * 0.5, C.ey + 0.02], [0.03, yn - 0.16], [-0.035, yn - 0.14]]), P.pielLuz, 0.6 * fuerzaNariz, 0.025));
  if (E.sombra !== 'plana') o.push(`<ellipse cx="${n(-na * 0.12)}" cy="${n(yn - 0.085)}" rx="${n(na * 0.38)}" ry="${n(0.04)}" fill="${P.pielLuz}" opacity="${n(E.sombra === 'pintada' ? 0.8 : 0.55)}"${B.suave ? ` filter="url(#${L.desenfoque(0.018)})"` : ''}/>`);
  // Sombra bajo la nariz.
  o.push(B.sombra(B.mancha([[-na * 0.6, yn + 0.02], [na * 0.95, yn + 0.01], [na * 0.75, yn + 0.085], [0.02, yn + 0.1], [-na * 0.35, yn + 0.06]]), sombraCol, 0.5, 0.025));
  // Aletas y base.
  const redonda = 0.9 + 0.35 * r.narizForma;
  for (const lado of [-1, 1]) {
    const q = (x: number, y: number): Pt => [lado * x, yn + y];
    o.push(B.trazo(`M${p(q(na * 0.62, -0.16))}C${p(q(na * (0.98 * redonda), -0.15))} ${p(q(na * 1.06 * redonda, -0.02))} ${p(q(na * 0.78, 0.008))}`, linea, 0.016, lado > 0 ? 0.7 : 0.35));
    o.push(`<ellipse cx="${n(lado * na * 0.5)}" cy="${n(yn - 0.003)}" rx="${n(na * (0.2 + 0.07 * r.narizForma))}" ry="${n(0.013 + 0.009 * r.narizForma)}" transform="rotate(${lado * -14} ${n(lado * na * 0.5)} ${n(yn)})" fill="${mix(sombraCol, '#1c0d0c', 0.55)}" opacity="0.85"/>`);
  }
  o.push(B.trazo(`M${n(-na * 0.3)},${n(yn + 0.022)}Q0,${n(yn + 0.055)} ${n(na * 0.3)},${n(yn + 0.022)}`, linea, 0.016, 0.7));
  // Puente marcado en las narices finas.
  if (r.narizForma < 0.45 && P.madura > 0.6) o.push(B.trazo(`M${n(puente + 0.012)},${n(C.ey + 0.04)}L${n(puente + 0.03)},${n(yn - 0.2)}`, linea, 0.014, 0.5 * (1 - r.narizForma)));

  // ---- boca
  const { ym, mw, lu, ll } = C;
  const yc = ym - 0.012; // comisuras algo levantadas
  const hoyuelos = P.distintivos.includes('hoyuelos');
  const arco = `M${n(-mw)},${n(yc)}C${n(-mw * 0.6)},${n(ym - lu * 0.75)} ${n(-mw * 0.28)},${n(ym - lu * 1.3)} ${n(-mw * 0.13)},${n(ym - lu * 1.12)}Q0,${n(ym - lu * 0.72)} ${n(mw * 0.13)},${n(ym - lu * 1.12)}C${n(mw * 0.28)},${n(ym - lu * 1.3)} ${n(mw * 0.6)},${n(ym - lu * 0.75)} ${n(mw)},${n(yc)}`;
  const union = `Q${n(mw * 0.5)},${n(ym + 0.014)} 0,${n(ym + 0.006)}Q${n(-mw * 0.5)},${n(ym + 0.014)} ${n(-mw)},${n(yc)}`;
  const dSup = `${arco}${union}Z`;
  const dInf = `M${n(-mw * 0.93)},${n(yc + 0.004)}C${n(-mw * 0.55)},${n(ym + ll * 1.32)} ${n(mw * 0.55)},${n(ym + ll * 1.32)} ${n(mw * 0.93)},${n(yc + 0.004)}Q${n(mw * 0.5)},${n(ym + 0.014)} 0,${n(ym + 0.006)}Q${n(-mw * 0.5)},${n(ym + 0.014)} ${n(-mw * 0.93)},${n(yc + 0.004)}Z`;
  o.push(B.sombra(B.mancha([[-mw * 0.55, ym + ll * 1.05], [mw * 0.62, ym + ll * 1.05], [mw * 0.4, ym + ll * 1.05 + 0.07], [-mw * 0.3, ym + ll * 1.05 + 0.06]]), sombraCol, 0.42, 0.025));
  o.push(B.relleno(dInf, B.suave ? L.lineal([[0, mix(P.labios, sombraCol, 0.15)], [0.5, mix(P.labios, P.pielLuz, 0.2)], [1, P.labios]]) : P.labios));
  o.push(B.relleno(dSup, mix(P.labios, sombraCol, 0.3)));
  if (E.sombra !== 'plana') o.push(`<ellipse cx="${n(-mw * 0.15)}" cy="${n(ym + ll * 0.55)}" rx="${n(mw * 0.3)}" ry="${n(ll * 0.22)}" fill="#fff" opacity="${E.sombra === 'pintada' ? 0.4 : 0.22}"${B.suave ? ` filter="url(#${L.desenfoque(0.012)})"` : ''}/>`);
  o.push(B.trazo(`M${n(-mw - 0.012)},${n(yc - 0.004)}Q${n(-mw * 0.5)},${n(ym + 0.014)} 0,${n(ym + 0.006)}Q${n(mw * 0.5)},${n(ym + 0.014)} ${n(mw + 0.012)},${n(yc - 0.004)}`, mix(P.labios, '#2a0f10', 0.65), 0.018, 0.95));
  if (E.contorno === 'tinta') o.push(B.trazo(`M${n(-mw * 0.5)},${n(ym + ll * 1.0)}Q0,${n(ym + ll * 1.3)} ${n(mw * 0.5)},${n(ym + ll * 1.0)}`, linea, 0.012, 0.8));
  // Surco bajo la nariz.
  for (const lado of [-1, 1]) o.push(B.trazo(`M${n(lado * 0.035)},${n(yn + 0.06)}L${n(lado * mw * 0.13)},${n(ym - lu * 1.18)}`, linea, 0.01, 0.22));
  if (hoyuelos) for (const lado of [-1, 1]) o.push(B.trazo(`M${n(lado * (mw + 0.09))},${n(ym - 0.07)}q${n(lado * 0.04)},0.06 ${n(-lado * 0.005)},0.12`, linea, 0.018, 0.75));

  // ---- ojos y cejas
  o.push(dibujarOjos(P, E, L, C));

  // ---- arrugas
  if (a > 0.03) {
    const t = (d: string, fuerza: number, ancho = 0.012) => o.push(B.trazo(d, linea, ancho, clamp(a * fuerza)));
    for (const lado of [-1, 1]) {
      // Surco nasolabial, patas de gallo, bolsas, comisuras.
      t(`M${n(lado * na * 1.12)},${n(yn - 0.07)}Q${n(lado * (mw + 0.1))},${n(yn + 0.06)} ${n(lado * (mw + 0.07))},${n(ym + 0.03)}`, 1.3, 0.014);
      const xo = lado * (C.ex + C.ew * 0.58);
      for (const k of [-1, 0, 1]) t(`M${n(xo)},${n(C.ey - C.sube + k * 0.025)}l${n(lado * 0.075)},${n(k * 0.035 - 0.005)}`, 0.9 - Math.abs(k) * 0.15, 0.01);
      t(`M${n(lado * (C.ex - C.ew * 0.42))},${n(C.ey + C.eh * 0.55 + 0.03)}Q${n(lado * C.ex)},${n(C.ey + C.eh * 0.55 + 0.085)} ${n(lado * (C.ex + C.ew * 0.45))},${n(C.ey + C.eh * 0.5 + 0.02)}`, 1.1, 0.012);
      t(`M${n(lado * (mw + 0.02))},${n(ym + 0.02)}q${n(lado * 0.03)},0.06 ${n(lado * 0.01)},0.13`, 0.9);
      if (a > 0.5) t(`M${n(lado * C.wj * 0.8)},${n(C.yj + 0.05)}Q${n(lado * C.wj * 0.72)},${n(C.yj + 0.22)} ${n(lado * C.wm * 1.25)},${n(0.9)}`, 0.7);
    }
    for (let k = 0; k < 3; k++) { const y = -0.5 + k * 0.085; t(`M${n(-0.36 + k * 0.03)},${n(y)}Q0,${n(y - 0.025)} ${n(0.36 - k * 0.03)},${n(y)}`, 0.85 - k * 0.1); }
    for (const lado of [-1, 1]) t(`M${n(lado * 0.045)},${n(C.ey - C.eh - 0.16)}l${n(lado * 0.008)},0.07`, 0.8);
  }

  // ---- distintivos
  if (P.distintivos.includes('pecas')) {
    const az = rngEstable('retrato', P.semilla, 'pecas');
    for (let k = 0; k < 34; k++) {
      const x = (az.next() + az.next() - 1) * C.wz * 0.78, y = C.ey + 0.13 + az.next() * (yn - C.ey - 0.1) + Math.abs(x) * 0.12;
      o.push(`<circle cx="${n(x)}" cy="${n(y)}" r="${n(0.007 + az.next() * 0.008)}" fill="${mix(sombraCol, '#7a3a16', 0.5)}" opacity="${n(0.4 + az.next() * 0.35)}"/>`);
    }
  }
  if (P.distintivos.includes('lunares')) {
    const az = rngEstable('retrato', P.semilla, 'lunares');
    const sitios: Pt[] = [[(az.chance(0.5) ? 1 : -1) * (C.wz * (0.45 + az.next() * 0.3)), yn - 0.05 + az.next() * 0.2], [(az.chance(0.5) ? 1 : -1) * (mw + 0.05 + az.next() * 0.1), ym + 0.03 + az.next() * 0.16]];
    for (const [x, y] of sitios) o.push(`<circle cx="${n(x)}" cy="${n(y)}" r="${n(0.014 + az.next() * 0.008)}" fill="${mix(sombraCol, '#22100c', 0.7)}"/>`);
  }

  o.push(B.contorno(dCara, P.piel));
  return o.join('');
}

function dibujarOjos(P: Parametros, E: Estilo, L: Lienzo, C: Cara): string {
  const B = new Pincel(L, E);
  const r = P.rostro;
  const o: string[] = [];
  const { ew, eh, ey, sube } = C;
  const a = ew / 2, hu = eh * 0.58, hl = eh * 0.42;
  const pestana = mix(P.ceja, '#160e0e', 0.6);
  const mujer = P.sexo === 'f' && P.madura > 0.65;
  const ri = Math.min(a * 0.5, eh * 0.62);
  for (const s of [-1, 1]) {
    const q = (x: number, y: number): Pt => [s * (C.ex + x), ey + y];
    const dentro = q(-a, eh * 0.1), fuera = q(a, -sube);
    const sup = `C${p(q(-a * 0.5, -hu * 1.32))} ${p(q(a * 0.3, -hu * 1.36 - sube * 0.5))} ${p(fuera)}`;
    const inf = `C${p(q(a * 0.5, hl * 1.22 - sube * 0.3))} ${p(q(-a * 0.35, hl * 1.3))} ${p(dentro)}`;
    const dOjo = `M${p(dentro)}${sup}${inf}Z`;
    const rec = L.recorte(dOjo);
    const [ix, iy] = q(0, (hl - hu) * 0.5 + 0.004);
    const g: string[] = [];
    g.push(`<path d="${dOjo}" fill="#f3efea"/>`);
    // Iris: borde oscuro, color, pupila.
    const iris = B.suave ? L.radial([[0, mix(P.iris, '#fff', 0.12)], [0.62, P.iris], [1, mix(P.iris, '#0c0a10', 0.55)]], 0.5, 0.62, 0.55) : P.iris;
    g.push(`<circle cx="${n(ix)}" cy="${n(iy)}" r="${n(ri)}" fill="${iris}" stroke="${mix(P.iris, '#0c0a10', 0.6)}" stroke-width="${n(ri * 0.13)}"/>`);
    if (E.sombra === 'pintada' || E.sombra === 'facetas') g.push(`<path d="M${n(ix - ri * 0.8)},${n(iy + ri * 0.2)}A${n(ri * 0.85)},${n(ri * 0.85)} 0 0 0 ${n(ix + ri * 0.8)},${n(iy + ri * 0.2)}Z" fill="${mix(P.iris, '#fff', 0.35)}" opacity="0.5"/>`);
    g.push(`<circle cx="${n(ix)}" cy="${n(iy)}" r="${n(ri * 0.44)}" fill="#0d0b0e"/>`);
    // Sombra del párpado sobre el ojo.
    g.push(`<path d="M${p(dentro)}${sup}" fill="none" stroke="#2c1d22" stroke-width="${n(eh * 0.42)}" opacity="0.26"/>`);
    // Brillo: siempre del mismo lado (la luz viene de la izquierda).
    g.push(`<circle cx="${n(ix - ri * 0.32)}" cy="${n(iy - ri * 0.36)}" r="${n(ri * 0.2)}" fill="#fff" opacity="0.95"/>`);
    if (E.sombra === 'pintada') g.push(`<circle cx="${n(ix + ri * 0.36)}" cy="${n(iy + ri * 0.34)}" r="${n(ri * 0.1)}" fill="#fff" opacity="0.6"/>`);
    o.push(`<g clip-path="url(#${rec})">${g.join('')}</g>`);
    // Párpado de arriba (línea de pestañas), pliegue y párpado de abajo.
    const grosor = (mujer ? 0.034 : 0.024) * (E.contorno === 'tinta' ? 1.15 : 1) * mezcla(0.8, 1, P.madura);
    o.push(`<path d="M${p(dentro)}${sup}${mujer ? `l${n(s * 0.03)},${n(-0.022)}` : ''}" fill="none" stroke="${pestana}" stroke-width="${n(grosor)}" stroke-linecap="round" stroke-linejoin="round"/>`);
    if (mujer) for (const k of [0.55, 0.8]) o.push(`<path d="M${p(q(a * k, -hu * (1.05 - (k - 0.55) * 1.2) - sube * k))}l${n(s * 0.028)},${n(-0.03)}" fill="none" stroke="${pestana}" stroke-width="0.014" stroke-linecap="round"/>`);
    const alto = hu * 0.55 + 0.035 - 0.012 * P.vejez;
    o.push(B.trazo(`M${p(q(-a * 0.78, -hu * 0.55 - alto))}Q${p(q(-a * 0.05, -hu * 1.45 - alto))} ${p(q(a * 0.95, -sube - alto * 0.55))}`, mix(P.pielSombra, '#2a1512', 0.3), 0.014, 0.6 + 0.3 * P.vejez));
    o.push(B.trazo(`M${p(fuera)}${inf}`, mix(P.pielSombra, '#2a1512', 0.3), 0.011, 0.45));

    // Ceja.
    const y0 = ey - hu - 0.085 - 0.03 * (1 - 0.6 * P.masc) - eh * 0.12;
    const th0 = (0.03 + 0.055 * r.cejasGrosor) * (1 + 0.25 * P.masc) * mezcla(0.75, 1, P.madura) * (1 - 0.25 * P.vejez);
    const arco = 0.015 + 0.085 * r.cejasForma;
    const x0 = Math.max(0.045, C.ex - ew * 0.56), largo = ew * 1.16;
    const ts = [0, 0.14, 0.36, 0.6, 0.82, 1];
    const centro = (t: number): Pt => [x0 + t * largo, y0 - arco * (t < 0.6 ? Math.sin((t / 0.6) * Math.PI * 0.5) : Math.cos(((t - 0.6) / 0.4) * Math.PI * 0.42)) - sube * 0.5 * t + 0.02 * P.masc * (1 - t)];
    const th = (t: number) => th0 * (t < 0.14 ? 0.78 + (t / 0.14) * 0.22 : 1 - 0.82 * ((t - 0.14) / 0.86) ** 1.4);
    const arriba = ts.map((t): Pt => { const c = centro(t); return [s * c[0], c[1] - th(t) / 2]; });
    const abajo = ts.map((t): Pt => { const c = centro(t); return [s * c[0], c[1] + th(t) / 2]; }).reverse();
    const dCeja = curva([...arriba, ...abajo], true, E.sombra === 'facetas' ? 0.5 : 1);
    o.push(`<path d="${dCeja}" fill="${P.ceja}" opacity="${n(0.82 + 0.18 * r.cejasGrosor)}"/>`);
    if (E.pelo === 'hebras' || E.pelo === 'tinta') {
      // Pelos de la ceja.
      for (let k = 0; k < 7; k++) { const t = 0.06 + k * 0.13; const c = centro(t); o.push(`<path d="M${n(s * c[0])},${n(c[1] + th(t) * 0.45)}l${n(s * 0.03)},${n(-th(t) * 0.95)}" stroke="${mix(P.ceja, '#000', 0.35)}" stroke-width="0.008" opacity="0.6" fill="none"/>`); }
    }
  }
  return o.join('');
}

function dibujarBarba(P: Parametros, E: Estilo, L: Lienzo, C: Cara, recorteCara: string): string {
  const b = P.barba;
  if (b.estilo === 'ninguna' || b.densidad <= 0.02) return '';
  const B = new Pincel(L, E);
  const o: string[] = [];
  const { yn, ym, mw, na } = C;
  const col = b.color;
  // La zona de la barba: de patilla a patilla por debajo de la línea de la mejilla.
  const mejilla: Pt[] = [[C.borde(0.14) + 0.05, 0.14], [C.wz * 0.86, 0.36], [C.wz * 0.66, ym - 0.1], [mw + 0.07, ym - 0.1], [na + 0.06, yn + 0.045], [0, yn + 0.075]];
  const zona = (baja: number): string => curva([...mejilla, ...espejo(mejilla).slice(1), [-(C.wj + 0.12), C.yj + 0.05], [-(C.wm + 0.1), 1.0 + baja * 0.6], [0, 1.04 + baja], [C.wm + 0.1, 1.0 + baja * 0.6], [C.wj + 0.12, C.yj + 0.05]], true, 1);
  const bigote = (): string => {
    const g = 0.035 + 0.03 * b.densidad;
    const m: Pt[] = [[0, yn + 0.06], [na * 0.9, yn + 0.05], [mw + 0.04, ym - 0.045], [mw + 0.07, ym + 0.01], [mw * 0.6, ym - C.lu * 0.9 - 0.0], [0, ym - C.lu * 0.85 + g * 0.1]];
    return curva([...m, ...espejo(m).slice(1, -1)], true, 1);
  };
  const perilla = (): string => { const m: Pt[] = [[0, ym + C.ll * 1.25], [mw * 0.55, ym + C.ll * 1.5], [mw * 0.75, 0.86], [C.wm * 0.7, 1.0], [0, 1.03]]; return curva([...m, ...espejo(m).slice(1, -1)], true, 1); };
  const opaco = E.sombra === 'plana' || E.sombra === 'facetas';
  const pelos = (d: string, fuerza: number, difuso: number) => (opaco ? `<path d="${d}" fill="${col}" opacity="${n(fuerza)}"/>` : `<path d="${d}" fill="${col}" opacity="${n(fuerza)}" filter="url(#${L.desenfoque(difuso)})"/>`);
  if (b.estilo === 'afeitado') {
    // La sombra de la barba, según su densidad.
    o.push(`<g clip-path="url(#${recorteCara})">${pelos(zona(0), b.densidad * (opaco ? 0.16 : 0.26), 0.05)}</g>`);
    return o.join('');
  }
  if (b.estilo === 'barba' || b.estilo === 'barba_corta') {
    const larga = b.estilo === 'barba';
    const baja = 0.13;
    const cuelga: Pt[] = [[0, 0.8], [C.wm, 0.74], [C.wj * 0.97, C.yj - 0.02], [C.wj * 0.9, C.yj + 0.14], [C.wm + 0.1, 0.98 + baja * 0.6], [0, 1.04 + baja]];
    const d = larga ? curva([...cuelga, ...espejo(cuelga).slice(1, -1)], true, 1) : zona(0);
    const fuerza = larga ? 0.97 : mezcla(0.62, 0.85, b.densidad);
    o.push(`<g clip-path="url(#${recorteCara})">${pelos(zona(0), fuerza, larga ? 0.02 : 0.035)}</g>`);
    if (larga) o.push(pelos(d, fuerza, 0.012));
    if (E.pelo === 'hebras' || E.pelo === 'tinta') {
      const az = rngEstable('retrato', P.semilla, 'pelos de barba');
      const rec = L.recorte(d);
      const h: string[] = [];
      for (let k = 0; k < 70; k++) { const x = (az.next() * 2 - 1) * C.wj, y = 0.3 + az.next() * (0.78 + (larga ? 0.14 : 0)); h.push(`M${n(x)},${n(y)}l${n(x * 0.03 + (az.next() - 0.5) * 0.02)},${n(0.05 + az.next() * 0.04)}`); }
      o.push(`<g clip-path="url(#${recorteCara})"><path d="${h.join('')}" stroke="${E.pelo === 'tinta' ? TINTA : mix(col, '#000', 0.4)}" stroke-width="0.01" opacity="0.5" fill="none" clip-path="url(#${rec})"/></g>`);
    }
    return o.join('');
  }
  if (b.estilo === 'perilla') {
    o.push(`<g clip-path="url(#${recorteCara})">${pelos(zona(0), b.densidad * (opaco ? 0.1 : 0.16), 0.05)}</g>`);
    o.push(pelos(perilla(), 0.9, 0.012));
  } else o.push(`<g clip-path="url(#${recorteCara})">${pelos(zona(0), b.densidad * (opaco ? 0.1 : 0.16), 0.05)}</g>`);
  o.push(pelos(bigote(), 0.92, 0.01));
  return o.join('');
}

// ------------------------------------------------------------------------------------------------------------ el pelo

interface Pelo { atras: string; delante: string }

const VOLUMEN: Record<string, readonly [number, number]> = { liso: [0.07, 0.04], ondulado: [0.1, 0.07], rizado: [0.15, 0.12], muy_rizado: [0.19, 0.17] };
const BORDE: Record<string, readonly [Borde, number]> = { liso: ['liso', 0], ondulado: ['onda', 0.36], rizado: ['rizo', 0.16], muy_rizado: ['rizo', 0.1] };

function dibujarPelo(P: Parametros, E: Estilo, L: Lienzo, C: Cara, hombros: number): Pelo {
  const B = new Pincel(L, E);
  const h = P.peinado;
  const az = rngEstable('retrato', P.semilla, 'pelo');
  const lado = h.lado;
  const calvo = h.calvicie;
  const [bordeBase, paso] = BORDE[h.tipo] ?? BORDE.liso;
  const borde: Borde = bordeBase === 'liso' && E.sombra === 'facetas' ? 'liso' : bordeBase;
  const tension = E.sombra === 'facetas' ? 0.45 : 1;
  const tr = (pts: readonly Pt[], b: Borde = borde): string => tramo(pts, b, paso || 0.2, 1, tension);
  let [vt, vs] = VOLUMEN[h.tipo] ?? VOLUMEN.liso;
  const afro = h.tipo === 'muy_rizado';
  const corto = h.estilo === 'corto' || h.estilo === 'flequillo' || h.estilo === 'rapado' || h.estilo === 'coleta';
  const k = h.estilo === 'rapado' ? 0.3 : h.estilo === 'coleta' ? 0.55 : h.estilo === 'flequillo' ? 1.1 : 1;
  vt = Math.max(0.03, vt * k * (1 - 0.5 * calvo)); vs = Math.max(0.02, vs * k * (1 - 0.4 * calvo));
  if (afro && (h.estilo === 'melena' || h.estilo === 'largo')) { vt = h.estilo === 'largo' ? 0.42 : 0.32; vs = h.estilo === 'largo' ? 0.46 : 0.36; }
  const elipse = (rx: number, ry: number, desde = 170, hasta = 10, pasos = 9): Pt[] => Array.from({ length: pasos + 1 }, (_, i): Pt => { const g = ((desde + ((hasta - desde) * i) / pasos) * Math.PI) / 180; return [rx * Math.cos(g), -0.3 - ry * Math.sin(g)]; });
  /** El contorno del pelo por arriba: el del cráneo más el volumen a los lados (`a`) y arriba (`b`). */
  const casco = (a: number, b: number): Pt[] => { const m: Pt[] = [[C.wc + a, -0.3], [0.9 * C.wc + a, -0.72 - 0.5 * b], [0.53 * C.wc + 0.6 * a, -0.965 - 0.9 * b], [0, -1.005 - b]]; return [...m.map(([x, y]): Pt => [-x, y]), ...m.slice(0, -1).reverse()]; };
  const wc = C.wc;
  const yh = C.yh;
  const atras: string[] = [];
  const delante: string[] = [];
  const formas: string[] = [];

  if (corto || (afro && h.estilo !== 'coleta')) {
    const ysb = afro && !corto ? 0.2 : h.estilo === 'rapado' ? -0.02 : h.estilo === 'coleta' ? -0.02 : mezcla(0.02, 0.1, P.masc);
    const fuera: Pt[] = [[-(C.borde(ysb) + 0.005), ysb], [-(wc + vs * 0.75), -0.1], ...casco(vs, vt), [wc + vs * 0.75, -0.1], [C.borde(ysb) + 0.005, ysb]];
    if (calvo < 0.55) {
      const q = calvo / 0.55, rec = 0.24 * q, yc = yh - 0.2 * q;
      let dentro: Pt[];
      if (h.estilo === 'flequillo' && q < 0.3) {
        const fy = (x: number) => -0.4 + 0.075 * lado * (x / wc) + (az.next() - 0.5) * 0.02;
        dentro = [[C.borde(ysb) - 0.075, ysb], [wc * 0.93, -0.16], [wc * 0.9, -0.33], [wc * 0.62, fy(wc * 0.62)], [wc * 0.22, fy(wc * 0.22)], [-wc * 0.22, fy(-wc * 0.22)], [-wc * 0.62, fy(-wc * 0.62)], [-wc * 0.9, -0.33], [-wc * 0.93, -0.16], [-(C.borde(ysb) - 0.075), ysb]];
      } else {
        const mitad: Pt[] = [[C.borde(ysb) - 0.075, ysb], [wc * 0.93, -0.17], [wc * 0.87, -0.4], [wc * 0.7, yh + 0.09 - rec * 0.5], [wc * 0.46, yh - 0.005 - rec * 1.25], [wc * 0.2, yc - 0.012], [0, yc + 0.012 * lado]];
        dentro = [...mitad, ...espejo(mitad).slice(1)];
      }
      const interior = h.estilo === 'flequillo' && calvo < 0.16 ? tr(dentro, borde === 'liso' ? 'liso' : borde) : tramo(dentro, 'liso', 0.2, 1, tension);
      formas.push(`M${p(fuera[0])}${tr(fuera)}L${p(dentro[0])}${interior}Z`);
    } else {
      // Calvo por arriba: quedan los lados (y algo de pelusa si aún no es del todo).
      const q = clamp((calvo - 0.55) / 0.45);
      const yTop = mezcla(-0.66, -0.3, q);
      for (const s of [-1, 1]) {
        const banda: Pt[] = [[s * (C.borde(ysb) + 0.005), ysb], [s * (wc + vs * 0.7), -0.1], [s * (wc + vs * 0.75), yTop + 0.16], [s * wc * 0.95, yTop], [s * wc * 0.8, yTop + 0.1], [s * wc * 0.86, -0.14], [s * (C.borde(ysb) - 0.075), ysb]];
        formas.push(curva(s > 0 ? banda : [...banda].reverse(), true, tension));
      }
      if (q < 0.55) {
        const mitad: Pt[] = [[wc * 0.8, -0.5], [wc * 0.55, -0.82], [0, -0.9]];
        const arriba = elipse(wc * 0.97, 0.7 + vt * 0.4, 150, 30, 6);
        delante.push(`<path d="M${p(arriba[0])}${tramo(arriba, 'liso', 0.2)}L${p(mitad[0])}${tramo([...mitad, ...espejo(mitad).slice(1)], 'liso', 0.2)}Z" fill="${P.pelo}" opacity="${n(0.4 * (1 - q / 0.55))}"/>`);
      }
    }
    if (h.estilo === 'coleta') {
      if (afro) atras.push(circuloRizado(0, -1.28, 0.36));
      else {
        const cola: Pt[] = [[0.2, -0.9], [wc + 0.2, -0.62], [wc + 0.42, 0.0], [wc + 0.34, 0.75], [wc + 0.14, 1.2], [wc + 0.1, 0.55], [wc + 0.02, 0.0], [wc - 0.15, -0.5]];
        atras.push(`M${p([lado * cola[0][0], cola[0][1]])}${tramo(cola.map(([x, y]): Pt => [lado * x, y]), borde === 'rizo' ? 'rizo' : borde, paso || 0.2, lado > 0 ? 1 : 0, tension)}Z`);
      }
    }
  } else {
    // Melena y pelo largo: una capa por detrás y otra por delante con la raya.
    const largo = h.estilo === 'largo';
    const ancho = h.tipo === 'liso' ? 0.1 : h.tipo === 'ondulado' ? 0.18 : 0.34;
    const yL = largo ? Math.max(hombros + 0.55, 1.95) : h.tipo === 'rizado' ? 1.02 : 1.14;
    const xb = wc + vs + ancho;
    const contorno: Pt[] = [[-xb, yL], [-(wc + vs + ancho * 0.9), 0.45], [-(wc + vs + 0.02), -0.22], ...casco(vs, vt), [wc + vs + 0.02, -0.22], [wc + vs + ancho * 0.9, 0.45], [xb, yL]];
    atras.push(`M${p(contorno[0])}${tr(contorno)}${tramo([[xb, yL], [0, yL + 0.06], [-xb, yL]], borde === 'rizo' ? 'rizo' : 'liso', paso || 0.2, 1, tension)}Z`);
    const px = lado * 0.16 * wc;
    const yF = largo ? yL + 0.08 : yL - 0.04;
    const xiB = largo ? 0.5 * C.w : C.borde(0.78) + 0.06;
    const xoB = largo ? wc + vs * 0.4 : xb - 0.01;
    const cortina = (s: number): Pt[] => [[s * xiB, yF], ...(largo ? [[s * (C.wj * 0.98), 1.0] as Pt] : []), [s * (C.borde(0.5) - 0.015), 0.5], [s * (C.borde(0.1) - 0.07), 0.08], [s * wc * 0.8, -0.27], [s * wc * 0.5, -0.49], [px + s * 0.015, yh - 0.02]];
    const exterior: Pt[] = [[-xoB, yF], [-(wc + vs + ancho * (largo ? 0.6 : 0.9)), 0.45], [-(wc + vs + 0.02), -0.22], ...casco(vs, vt), [wc + vs + 0.02, -0.22], [wc + vs + ancho * (largo ? 0.6 : 0.9), 0.45], [xoB, yF]];
    const der = cortina(1), izq = cortina(-1).reverse();
    formas.push(`M${p(exterior[0])}${tr(exterior)}L${p(der[0])}${tramo(der, 'liso', 0.2, 1, tension)}L${p(izq[0])}${tramo(izq, 'liso', 0.2, 1, tension)}Z`);
    // La raya.
    delante.push('');
  }

  function circuloRizado(cx: number, cy: number, r: number): string {
    const pts = Array.from({ length: 17 }, (_, i): Pt => { const g = (i / 16) * Math.PI * 2 - Math.PI / 2; return [cx + r * Math.cos(g), cy + r * Math.sin(g)]; });
    return `M${p(pts[0])}${tramo(pts, 'rizo', 0.1, 1)}Z`;
  }

  // ---- relleno y textura
  const caja: [number, number, number, number] = [-(wc + 0.75), -1.6, wc + 0.75, Math.max(1.3, hombros + 0.8)];
  const pintar = (d: string, detras: boolean): string => {
    const o: string[] = [];
    const baseCol = detras ? mix(P.pelo, P.peloSombra, 0.35) : P.pelo;
    const fill = B.suave ? L.lineal([[0, mix(baseCol, P.peloLuz, detras ? 0.1 : 0.35)], [0.35, baseCol], [1, mix(baseCol, P.peloSombra, 0.45)]]) : baseCol;
    o.push(B.relleno(d, fill));
    const rec = L.recorte(d);
    const g: string[] = [];
    // Lado en sombra y brillo.
    if (E.pelo === 'bloques') {
      g.push(`<path d="M${n(-wc - 0.8)},-1.7L${n(0.12 * lado)},-1.7L${n(-0.3)},${n(-0.72)}L${n(-wc - 0.8)},${n(-0.25)}Z" fill="${P.peloLuz}" opacity="0.4"/>`);
      g.push(`<path d="M${n(0.4)},-1.7L${n(wc + 0.8)},-1.7L${n(wc + 0.8)},3L${n(wc * 0.82)},3L${n(wc * 0.95)},${n(-0.1)}Z" fill="${P.peloSombra}" opacity="0.55"/>`);
      g.push(`<path d="M${n(-wc - 0.8)},0.15L${n(-wc * 1.02)},0.2L${n(-wc * 0.9)},3L${n(-wc - 0.8)},3Z" fill="${P.peloSombra}" opacity="0.28"/>`);
    } else {
      g.push(B.sombra(`M${n(wc * 0.55)},-1.7C${n(wc * 0.9)},-0.9 ${n(wc * 0.85)},0 ${n(wc * 0.7)},3L${n(wc + 0.9)},3L${n(wc + 0.9)},-1.7Z`, P.peloSombra, 0.85, 0.07));
      if (!detras && E.pelo !== 'tinta') g.push(B.luz(`M${n(-wc * 0.85)},${n(-0.62 - vt)}Q${n(-0.2)},${n(-1.02 - vt)} ${n(wc * 0.35)},${n(-0.86 - vt)}Q${n(-0.15)},${n(-0.8 - vt * 0.6)} ${n(-wc * 0.8)},${n(-0.45 - vt * 0.5)}Z`, P.peloLuz, 0.85, 0.05));
    }
    g.push(mechones(P, E, az, caja, lado * 0.16 * wc));
    o.push(`<g clip-path="url(#${rec})">${g.join('')}</g>`);
    o.push(B.contorno(d, P.pelo));
    return o.join('');
  };
  return { atras: atras.map((d) => pintar(d, true)).join(''), delante: formas.map((d) => pintar(d, false)).join('') + delante.join('') };
}

/** La textura del pelo: mechones sueltos por toda la caja (se recortan a la forma), con la dirección del pelo y la forma de su tipo. */
function mechones(P: Parametros, E: Estilo, az: Rng, caja: readonly [number, number, number, number], rayaX: number): string {
  if (E.pelo === 'bloques') return '';
  const tipo = P.peinado.tipo;
  const cuantos = Math.round((E.pelo === 'hebras' ? 85 : E.pelo === 'tinta' ? 34 : 18) * (tipo === 'muy_rizado' ? 2.2 : tipo === 'rizado' ? 1.5 : 1) * ((caja[3] - caja[1]) / 3));
  const grupos: Record<string, string[]> = { oscuro: [], claro: [], cana: [] };
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
    grupos[canas > 0.02 && canas < 0.85 && az.next() < canas * sien * 0.8 ? 'cana' : i % 2 ? 'oscuro' : 'claro'].push(d);
  }
  const ancho = E.pelo === 'hebras' ? 0.011 : E.pelo === 'tinta' ? 0.017 : 0.022;
  const linea = (ds: string[], color: string, op: number) => (ds.length ? `<path d="${ds.join('')}" fill="none" stroke="${color}" stroke-width="${n(ancho)}" stroke-linecap="round" opacity="${n(op)}"/>` : '');
  if (E.pelo === 'tinta') return linea([...grupos.oscuro, ...grupos.claro], TINTA, 0.55) + linea(grupos.cana, '#efeeea', 0.9);
  if (E.pelo === 'hebras') return linea(grupos.oscuro, P.peloSombra, 0.55) + linea(grupos.claro, P.peloLuz, 0.55) + linea(grupos.cana, '#f1f0ec', 0.85);
  return linea(grupos.oscuro, P.peloSombra, 0.3) + linea(grupos.claro, P.peloLuz, 0.22) + linea(grupos.cana, '#eceae6', 0.6);
}

// ------------------------------------------------------------------------------------------------------------ el cuerpo

interface Cuerpo { svg: string; yHombros: number }

function dibujarCuerpo(P: Parametros, E: Estilo, L: Lienzo, C: Cara, hh: number): Cuerpo {
  const u = hh / 2;
  const B = new Pincel(L, E, u);
  const H = P.altura, m = P.madura, f = P.fuerte, g = Math.max(0, P.gordo), flaco = Math.min(0, P.gordo);
  const fem = P.sexo === 'f' ? clamp((m * 15 + 3 - 11) / 6) : 0;
  const val = (nino: number, hombre: number, mujer: number) => nino + (hombre - nino) * P.masc + (mujer - nino) * fem;
  const lc = hh * (0.12 + 0.13 * m);
  const nw = u * C.w * (0.46 + 0.06 * m + 0.16 * P.masc + 0.07 * Math.max(0, f) + 0.12 * g);
  const yNB = hh + 0.5 * lc, yS = hh + lc + 0.012 * H;
  const piernas = 0.4 + 0.08 * Math.min(1, m / 0.6) - 0.006 * Math.max(0, (m - 0.6) / 0.4);
  const yC = H * (1 - piernas), yW = yS + 0.58 * (yC - yS), yH = yC - 0.03 * H, yK = yC + 0.47 * (H - yC), yA = H - 0.04 * H;
  const sw = H * val(0.118, 0.131, 0.117) * (1 + 0.13 * f + 0.06 * g);
  const cw = H * val(0.085, 0.098, 0.088) * (1 + 0.15 * f + 0.22 * g);
  const ww = H * val(0.08, 0.082, 0.07) * (1 + 0.06 * f + 0.55 * g + 0.14 * flaco + 0.08 * P.vejez);
  const hw = H * val(0.085, 0.092, 0.102) * (1 + 0.3 * g + 0.08 * flaco);
  const o: string[] = [];

  /** Una parte del cuerpo: relleno, sombra en el lado derecho (la misma forma desplazada, recortada a sí misma) y contorno. */
  const parte = (d: string, color: string, banda = 0.022 * H): string => {
    const sombra = mix(color, '#141018', 0.38), luz = mix(color, '#ffffff', 0.16);
    if (B.suave) return B.relleno(d, L.lineal([[0, luz], [0.42, color], [1, sombra]], 0, 0, 1, 0)) + B.contorno(d, color);
    const rec = L.recorte(d);
    return `<g clip-path="url(#${rec})"><path d="${d}" fill="${sombra}"/><path d="${d}" fill="${color}" transform="translate(${n(-banda)},0)"/></g>` + B.contorno(d, color);
  };
  const t = E.tension * 0.75;

  // ---- piernas (pantalón) y zapatos
  const ax = H * 0.05, lx = hw * 0.5, kx = mezcla(lx, ax, 0.5) + 0.004 * H;
  const pk = H * val(0.035, 0.04, 0.038) * (1 + 0.3 * g + 0.15 * f + 0.1 * flaco), ph = H * 0.033 * (1 + 0.15 * g);
  const sh = 0.034 * H, fw = ph * 1.05;
  for (const s of [-1, 1]) {
    const x = s * (ax + 0.004 * H);
    o.push(parte(curva([[x - fw, H - sh * 1.3], [x + fw, H - sh * 1.3], [x + fw + s * fw * 0.25, H - sh * 0.3], [x + fw * 0.95 + s * fw * 0.2, H], [x - fw * 0.95 + s * fw * 0.2, H], [x - fw + s * fw * 0.25, H - sh * 0.3]], true, 0.6), P.zapato, 0.008 * H));
  }
  const pierna: Pt[] = [[ww * 1.02, yW], [hw * 1.03, yH], [kx + pk, yK], [ax + ph, yA], [ax - ph, yA], [kx - pk * 0.9, yK], [0.012 * H, yC + 0.012 * H]];
  o.push(parte(`M${p([-ww * 1.02, yW])}L${p(pierna[0])}${curva(pierna, false, t, true)}L0,${n(yC)}L${p([-0.012 * H, yC + 0.012 * H])}${curva(espejo(pierna), false, t, true)}Z`, P.pantalon));

  // ---- brazos y manos
  const au = H * val(0.05, 0.06, 0.05) * (1 + 0.4 * f + 0.35 * g + 0.15 * flaco), af = au * 0.82, wr = H * 0.03 * (1 + 0.1 * g + 0.1 * f);
  const lu = 0.172 * H * mezcla(0.93, 1, m), lf = 0.148 * H * mezcla(0.93, 1, m), hl = 0.1 * H;
  const abre = 0.1 + 0.1 * g + 0.06 * Math.max(0, f);
  const brazo = (s: number): string => {
    const S: Pt = [sw - au * 0.5, yS + au * 0.5], Ec: Pt = [S[0] + abre * lu, S[1] + lu], W: Pt = [Ec[0] + abre * 0.5 * lf, Ec[1] + lf];
    const q = (x: number, y: number): Pt => [s * x, y];
    const piel = [q(S[0] + au * 0.5, S[1] - au * 0.2), q(mezcla(S[0], Ec[0], 0.45) + au * (0.52 + 0.06 * Math.max(0, f)), mezcla(S[1], Ec[1], 0.45)), q(Ec[0] + af * 0.5, Ec[1]), q(Ec[0] + abre * 0.15 * lf + af * 0.52, Ec[1] + lf * 0.3), q(W[0] + wr * 0.5, W[1]),
      q(W[0] + wr * 0.95, W[1] + hl * 0.3), q(W[0] + wr * 0.8, W[1] + hl * 0.78), q(W[0] + wr * 0.15, W[1] + hl), q(W[0] - wr * 0.5, W[1] + hl * 0.82), q(W[0] - wr * 0.62, W[1] + hl * 0.5), q(W[0] - wr * 1.05, W[1] + hl * 0.52), q(W[0] - wr * 0.9, W[1] + hl * 0.2),
      q(W[0] - wr * 0.5, W[1]), q(Ec[0] + abre * 0.15 * lf - af * 0.46, Ec[1] + lf * 0.3), q(Ec[0] - af * 0.46, Ec[1]), q(mezcla(S[0], Ec[0], 0.45) - au * 0.48, mezcla(S[1], Ec[1], 0.45)), q(S[0] - au * 0.5, S[1] + au * 0.3)];
    const manga = [q(sw * 0.72, yS - 0.012 * H), q(S[0] + au * 0.3, S[1] - au * 0.5), q(S[0] + au * 0.6, S[1] + au * 0.1), q(mezcla(S[0], Ec[0], 0.58) + au * 0.62, mezcla(S[1], Ec[1], 0.58)), q(mezcla(S[0], Ec[0], 0.58) - au * 0.56, mezcla(S[1], Ec[1], 0.58) + au * 0.12), q(cw * 0.98, yS + 0.08 * H)];
    return parte(curva(s > 0 ? piel : [...piel].reverse(), true, Math.max(0.5, E.tension)), P.piel, 0.01 * H) + parte(curva(s > 0 ? manga : [...manga].reverse(), true, t), P.camiseta, 0.012 * H);
  };
  const brazos = brazo(-1) + brazo(1);

  // ---- cuello
  const cuello: Pt[] = [[nw, hh * 0.7], [nw * 1.02, yNB - 0.2 * lc], [nw * 1.5, yNB + 0.3 * lc], [0, yNB + 0.9 * lc]];
  const dCuello = curva([...cuello, ...espejo(cuello).slice(1)], true, 0.8);
  const recCuello = L.recorte(dCuello);
  o.push(brazos);
  o.push(B.relleno(dCuello, mix(P.piel, P.pielSombra, 0.12)));
  o.push(`<g clip-path="url(#${recCuello})">${B.sombra(new Pincel(L, E, u).mancha([[-nw * 1.6, hh * 0.68], [nw * 1.9, hh * 0.68], [nw * 1.9, hh + 0.12 * lc], [nw * 0.75, hh + 0.3 * lc], [nw * 0.1, hh + 0.45 * lc], [-nw * 0.9, hh + 0.12 * lc]]), P.pielSombra, 1.1, 0.05)}</g>`);
  o.push(B.contorno(`M${p([-nw, hh * 0.9])}L${p([-nw * 1.02, yNB])}M${p([nw, hh * 0.9])}L${p([nw * 1.02, yNB])}`, P.piel));

  // ---- camiseta
  const yBajo = yW + 0.72 * (yH - yW), bajo = Math.max(hw * 1.05, ww * 1.06);
  const ladoD: Pt[] = [[nw * 1.28, yNB - 0.06 * lc], [sw * 0.97, yS], [cw * 1.03, yS + 0.085 * H], [ww * 1.07, yW], [bajo, yBajo]];
  const yEscote = yNB + 0.85 * lc;
  const dCamiseta = `M${p([-nw * 1.28, yNB - 0.06 * lc])}C${n(-nw * 1.0)},${n(yEscote)} ${n(nw * 1.0)},${n(yEscote)} ${p(ladoD[0])}${curva(ladoD, false, t, true)}L${p([-bajo, yBajo])}${curva(espejo(ladoD), false, t, true)}Z`;
  o.push(parte(dCamiseta, P.camiseta));
  // Cuello de la camiseta y pliegues del pecho.
  o.push(`<path d="M${p([-nw * 1.28, yNB - 0.06 * lc])}C${n(-nw * 1.0)},${n(yEscote)} ${n(nw * 1.0)},${n(yEscote)} ${p(ladoD[0])}" fill="none" stroke="${mix(P.camiseta, '#141018', 0.3)}" stroke-width="${n(0.06 * u)}" stroke-linecap="round"/>`);
  const recCam = L.recorte(dCamiseta);
  const pecho = clamp(0.25 + 0.6 * f + 0.5 * fem);
  o.push(`<g clip-path="url(#${recCam})">${B.sombra(new Pincel(L, E, u).mancha([[-cw * 0.85, yS + 0.105 * H], [0, yS + 0.118 * H], [cw * 0.9, yS + 0.105 * H], [cw * 0.8, yS + 0.135 * H], [0, yS + 0.14 * H], [-cw * 0.7, yS + 0.13 * H]]), mix(P.camiseta, '#141018', 0.5), (B.suave ? 0.5 : 0.22) * pecho, 0.08)}</g>`);
  return { svg: o.join(''), yHombros: yS };
}

// ------------------------------------------------------------------------------------------------------------ la persona entera

export interface Dibujo {
  /** Definiciones (van en un `<defs>`) y el dibujo, en centímetros: x = 0 en el eje, y = 0 en la coronilla. */
  defs: string;
  cuerpo: string;
  /** Encuadre del retrato (x, y, ancho, alto) y altura de la figura (cm). */
  retrato: [number, number, number, number];
  altura: number;
}

/** Dibuja a una persona. `prefijo` hace únicos los ids dentro de la página. */
export function dibujar(P: Parametros, E: Estilo, prefijo: string): Dibujo {
  const L = new Lienzo(prefijo);
  const hh = P.cabeza * E.cabeza;
  const u = hh / 2;
  const C = medidasDeCara(P, E);
  const cuerpo = dibujarCuerpo(P, E, L, C, hh);
  const pelo = dibujarPelo(P, E, L, C, (cuerpo.yHombros - u) / u);
  const cabeza = (contenido: string) => `<g transform="translate(0,${n(u)}) scale(${n(u)})">${contenido}</g>`;
  const todo = cabeza(pelo.atras) + cuerpo.svg + cabeza(dibujarCara(P, E, L, C) + pelo.delante);
  return { defs: L.defs.join(''), cuerpo: todo, retrato: [-0.9 * hh, -0.4 * hh, 1.8 * hh, 1.84 * hh], altura: P.altura };
}
