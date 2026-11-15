/** Utilidades de geometría para hacer trazados SVG (ver `docs/ANEXO_RETRATOS.md`). */

export type Pt = readonly [number, number];

/** Número corto para SVG (tres decimales como mucho). */
export const n = (v: number): string => String(+v.toFixed(3));
export const p = (q: Pt): string => `${n(q[0])},${n(q[1])}`;

/** Trazado por una lista de puntos con curvas suaves (Catmull-Rom); con tensión 0 son rectas (facetas). Devuelve los tramos sin el «M» inicial si `sinInicio`. */
export function curva(pts: readonly Pt[], cerrada = false, tension = 1, sinInicio = false): string {
  const m = pts.length;
  if (m < 2) return '';
  const en = (i: number): Pt => (cerrada ? pts[((i % m) + m) % m] : pts[Math.min(m - 1, Math.max(0, i))]);
  let d = sinInicio ? '' : `M${p(pts[0])}`;
  const tramos = cerrada ? m : m - 1;
  for (let i = 0; i < tramos; i++) {
    const a = en(i - 1);
    const b = en(i);
    const c = en(i + 1);
    const e = en(i + 2);
    if (tension === 0) { d += `L${p(c)}`; continue; }
    const k = tension / 6;
    d += `C${n(b[0] + (c[0] - a[0]) * k)},${n(b[1] + (c[1] - a[1]) * k)} ${n(c[0] - (e[0] - b[0]) * k)},${n(c[1] - (e[1] - b[1]) * k)} ${p(c)}`;
  }
  return cerrada ? d + 'Z' : d;
}

/** Puntos repartidos a distancia fija (aproximada) a lo largo de la curva suave que pasa por `pts`. */
export function repartir(pts: readonly Pt[], paso: number): Pt[] {
  const fino: Pt[] = [];
  const m = pts.length;
  const en = (i: number): Pt => pts[Math.min(m - 1, Math.max(0, i))];
  for (let i = 0; i < m - 1; i++) {
    const a = en(i - 1), b = en(i), c = en(i + 1), e = en(i + 2);
    for (let s = 0; s < 12; s++) {
      const t = s / 12, t2 = t * t, t3 = t2 * t;
      const f = (k: 0 | 1) => 0.5 * (2 * b[k] + (-a[k] + c[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - e[k]) * t2 + (-a[k] + 3 * b[k] - 3 * c[k] + e[k]) * t3);
      fino.push([f(0), f(1)]);
    }
  }
  fino.push(pts[m - 1]);
  let largo = 0;
  const acumulado = [0];
  for (let i = 1; i < fino.length; i++) { largo += Math.hypot(fino[i][0] - fino[i - 1][0], fino[i][1] - fino[i - 1][1]); acumulado.push(largo); }
  const partes = Math.max(2, Math.round(largo / paso));
  const r: Pt[] = [];
  let j = 0;
  for (let k = 0; k <= partes; k++) {
    const s = (largo * k) / partes;
    while (j < fino.length - 2 && acumulado[j + 1] < s) j++;
    const t = (s - acumulado[j]) / Math.max(1e-9, acumulado[j + 1] - acumulado[j]);
    r.push([fino[j][0] + (fino[j + 1][0] - fino[j][0]) * t, fino[j][1] + (fino[j + 1][1] - fino[j][1]) * t]);
  }
  return r;
}

export type Borde = 'liso' | 'onda' | 'rizo' | 'recto';

/**
 * Un tramo de contorno desde el punto en que está el trazado (el primero de `pts`) hasta el último: liso (curva suave), recto (facetas), con ondas (se desplaza a un lado y a otro)
 * o con rizos (arcos hacia fuera). `fuera` dice hacia qué lado caen los rizos (1 o 0, el sentido del arco).
 */
export function tramo(pts: readonly Pt[], borde: Borde, paso: number, fuera: 0 | 1 = 1, tension = 1): string {
  if (borde === 'recto') return curva(pts, false, 0, true);
  if (borde === 'liso') return curva(pts, false, tension, true);
  const q = repartir(pts, borde === 'onda' ? paso / 2 : paso);
  if (borde === 'rizo') {
    let d = '';
    for (let i = 1; i < q.length; i++) {
      const r = Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]) * 0.56;
      d += `A${n(r)},${n(r)} 0 0 ${fuera} ${p(q[i])}`;
    }
    return d;
  }
  // Ondas: los puntos impares se apartan de la línea, alternando el lado.
  const amp = paso * 0.16;
  const o: Pt[] = q.map((x, i) => {
    if (i === 0 || i === q.length - 1) return x;
    const a = q[i - 1], b = q[i + 1];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const s = (i % 2 ? 1 : -1) * amp * (fuera ? 1 : -1);
    return [x[0] + (-(b[1] - a[1]) / l) * s, x[1] + ((b[0] - a[0]) / l) * s] as Pt;
  });
  return curva(o, false, 1, true);
}

/** La otra mitad: los puntos reflejados en el eje vertical, en orden inverso. */
export const espejo = (pts: readonly Pt[]): Pt[] => pts.map(([x, y]) => [-x, y] as Pt).reverse();
