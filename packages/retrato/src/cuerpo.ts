/**
 * CAPA 2 DEL DIBUJO, el cuerpo (en centímetros: x = 0 en el eje de la persona, y = 0 en la coronilla): cuello, camiseta, brazos, manos, pantalón y zapatos, con las
 * anchuras de la edad, el sexo, el músculo y la grasa. La ropa es neutra y sus colores son parámetros. Para añadir una prenda: `docs/ANEXO_RETRATOS.md`.
 */
import type { Cara } from './cara';
import { mix } from './color';
import { curva, espejo, n, p, type Pt } from './geometria';
import type { Lienzo } from './lienzo';
import type { Parametros } from './parametros';

const mezcla = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export interface CuerpoDibujado { svg: string; /** Altura de los hombros (cm desde la coronilla) y media anchura de la figura (cm). */ hombros: number; medioAncho: number }

/** `L` debe estar en la escala del cuerpo (`enEscala(media cabeza)`). */
export function dibujarCuerpo(P: Parametros, L: Lienzo, C: Cara): CuerpoDibujado {
  const hh = P.cabeza, u = hh / 2;
  const H = P.altura, m = P.madura, f = P.fuerte, g = Math.max(0, P.gordo), flaco = Math.min(0, P.gordo);
  const val = (nino: number, hombre: number, mujer: number) => nino + (hombre - nino) * P.masc + (mujer - nino) * P.fem;
  // Alturas: cuello, hombros, cintura, cadera, entrepierna, rodilla y tobillo. Las piernas son más cortas en los niños.
  const lc = hh * (0.12 + 0.13 * m);
  const nw = u * C.w * (0.46 + 0.06 * m + 0.16 * P.masc + 0.07 * Math.max(0, f) + 0.12 * g);
  const yNB = hh + 0.5 * lc, yS = hh + lc + 0.012 * H;
  const piernas = 0.4 + 0.08 * Math.min(1, m / 0.6) - 0.006 * Math.max(0, (m - 0.6) / 0.4);
  const yC = H * (1 - piernas), yW = yS + 0.58 * (yC - yS), yH = yC - 0.03 * H, yK = yC + 0.47 * (H - yC), yA = H - 0.04 * H;
  // Medias anchuras (fracción de la altura: niño, hombre, mujer), con el músculo y la grasa.
  const sw = H * val(0.118, 0.131, 0.117) * (1 + 0.2 * f + 0.07 * g + 0.06 * flaco);
  const cw = H * val(0.085, 0.098, 0.088) * (1 + 0.26 * f + 0.26 * g + 0.14 * flaco);
  const ww = H * val(0.08, 0.082, 0.07) * (1 + 0.05 * f + 0.75 * g + 0.32 * flaco + 0.08 * P.vejez);
  const hw = H * val(0.085, 0.092, 0.102) * (1 + 0.42 * g + 0.2 * flaco + 0.05 * f);
  const o: string[] = [];
  const parte = (d: string, color: string, banda = 0.022 * H): string => L.parte(d, color, mix(color, '#141018', 0.38), banda);
  const t = 0.75;

  // ---- piernas (pantalón) y zapatos
  const ax = H * 0.05, lx = hw * 0.5, kx = mezcla(lx, ax, 0.5) + 0.004 * H;
  const pk = H * val(0.035, 0.04, 0.038) * (1 + 0.4 * g + 0.3 * f + 0.4 * flaco), ph = H * 0.033 * (1 + 0.15 * g);
  const sh = 0.034 * H, fw = ph * 1.05;
  for (const s of [-1, 1]) {
    const x = s * (ax + 0.004 * H);
    o.push(parte(curva([[x - fw, H - sh * 1.3], [x + fw, H - sh * 1.3], [x + fw + s * fw * 0.25, H - sh * 0.3], [x + fw * 0.95 + s * fw * 0.2, H], [x - fw * 0.95 + s * fw * 0.2, H], [x - fw + s * fw * 0.25, H - sh * 0.3]], true, 0.6), P.zapato, 0.008 * H));
  }
  const pierna: Pt[] = [[ww * 1.02, yW], [hw * 1.03, yH], [kx + pk, yK], [ax + ph, yA], [ax - ph, yA], [kx - pk * 0.9, yK], [0.012 * H, yC + 0.012 * H]];
  o.push(parte(`M${p([-ww * 1.02, yW])}L${p(pierna[0])}${curva(pierna, false, t, true)}L0,${n(yC)}L${p([-0.012 * H, yC + 0.012 * H])}${curva(espejo(pierna), false, t, true)}Z`, P.pantalon));

  // ---- brazos y manos (con la manga corta encima)
  const au = H * val(0.05, 0.06, 0.05) * (1 + 0.75 * f + 0.45 * g + 0.45 * flaco), af = au * 0.82, wr = H * 0.03 * (1 + 0.1 * g + 0.1 * f);
  const lu = 0.172 * H * mezcla(0.93, 1, m), lf = 0.148 * H * mezcla(0.93, 1, m), hl = 0.1 * H;
  const abre = 0.1 + 0.1 * g + 0.06 * Math.max(0, f);
  let fuera = sw;
  for (const s of [-1, 1]) {
    const S: Pt = [sw - au * 0.5, yS + au * 0.5], Ec: Pt = [S[0] + abre * lu, S[1] + lu], W: Pt = [Ec[0] + abre * 0.5 * lf, Ec[1] + lf];
    fuera = Math.max(fuera, W[0] + wr);
    const q = (x: number, y: number): Pt => [s * x, y];
    const piel = [q(S[0] + au * 0.5, S[1] - au * 0.2), q(mezcla(S[0], Ec[0], 0.45) + au * (0.52 + 0.06 * Math.max(0, f)), mezcla(S[1], Ec[1], 0.45)), q(Ec[0] + af * 0.5, Ec[1]), q(Ec[0] + abre * 0.15 * lf + af * 0.52, Ec[1] + lf * 0.3), q(W[0] + wr * 0.5, W[1]),
      q(W[0] + wr * 0.95, W[1] + hl * 0.3), q(W[0] + wr * 0.8, W[1] + hl * 0.78), q(W[0] + wr * 0.15, W[1] + hl), q(W[0] - wr * 0.5, W[1] + hl * 0.82), q(W[0] - wr * 0.62, W[1] + hl * 0.5), q(W[0] - wr * 1.05, W[1] + hl * 0.52), q(W[0] - wr * 0.9, W[1] + hl * 0.2),
      q(W[0] - wr * 0.5, W[1]), q(Ec[0] + abre * 0.15 * lf - af * 0.46, Ec[1] + lf * 0.3), q(Ec[0] - af * 0.46, Ec[1]), q(mezcla(S[0], Ec[0], 0.45) - au * 0.48, mezcla(S[1], Ec[1], 0.45)), q(S[0] - au * 0.5, S[1] + au * 0.3)];
    const manga = [q(sw * 0.72, yS - 0.012 * H), q(S[0] + au * 0.3, S[1] - au * 0.5), q(S[0] + au * 0.6, S[1] + au * 0.1), q(mezcla(S[0], Ec[0], 0.58) + au * 0.62, mezcla(S[1], Ec[1], 0.58)), q(mezcla(S[0], Ec[0], 0.58) - au * 0.56, mezcla(S[1], Ec[1], 0.58) + au * 0.12), q(cw * 0.98, yS + 0.08 * H)];
    o.push(parte(curva(s > 0 ? piel : [...piel].reverse(), true, 1), P.piel, 0.01 * H), parte(curva(s > 0 ? manga : [...manga].reverse(), true, t), P.camiseta, 0.012 * H));
  }

  // ---- cuello, con la sombra del mentón
  const cuello: Pt[] = [[nw, hh * 0.7], [nw * 1.02, yNB - 0.2 * lc], [nw * 1.5, yNB + 0.3 * lc], [0, yNB + 0.9 * lc]];
  const dCuello = curva([...cuello, ...espejo(cuello).slice(1)], true, 0.8);
  o.push(L.relleno(dCuello, mix(P.piel, P.pielSombra, 0.12)));
  o.push(`<g clip-path="url(#${L.recorte(dCuello)})">${L.sombra(L.forma([[-nw * 1.6, hh * 0.68], [nw * 1.9, hh * 0.68], [nw * 1.9, hh + 0.12 * lc], [nw * 0.75, hh + 0.3 * lc], [nw * 0.1, hh + 0.45 * lc], [-nw * 0.9, hh + 0.12 * lc]]), P.pielSombra, 1.1)}</g>`);
  o.push(L.contorno(`M${p([-nw, hh * 0.9])}L${p([-nw * 1.02, yNB])}M${p([nw, hh * 0.9])}L${p([nw * 1.02, yNB])}`));

  // ---- camiseta
  const yBajo = yW + 0.72 * (yH - yW), bajo = Math.max(hw * 1.05, ww * 1.06);
  const ladoD: Pt[] = [[nw * 1.28, yNB - 0.06 * lc], [sw * 0.97, yS], [cw * 1.03, yS + 0.085 * H], [ww * 1.07, yW], [bajo, yBajo]];
  const yEscote = yNB + 0.85 * lc;
  const escote = `M${p([-nw * 1.28, yNB - 0.06 * lc])}C${n(-nw * 1.0)},${n(yEscote)} ${n(nw * 1.0)},${n(yEscote)} ${p(ladoD[0])}`;
  const dCamiseta = `${escote}${curva(ladoD, false, t, true)}L${p([-bajo, yBajo])}${curva(espejo(ladoD), false, t, true)}Z`;
  o.push(parte(dCamiseta, P.camiseta));
  o.push(`<path d="${escote}" fill="none" stroke="${mix(P.camiseta, '#141018', 0.3)}" stroke-width="${n(0.06 * u)}" stroke-linecap="round"/>`);
  // Pliegue del pecho: más marcado con músculo y en las mujeres.
  const pecho = clamp(0.25 + 0.6 * f + 0.5 * P.fem);
  o.push(`<g clip-path="url(#${L.recorte(dCamiseta)})">${L.sombra(L.forma([[-cw * 0.85, yS + 0.105 * H], [0, yS + 0.118 * H], [cw * 0.9, yS + 0.105 * H], [cw * 0.8, yS + 0.135 * H], [0, yS + 0.14 * H], [-cw * 0.7, yS + 0.13 * H]]), mix(P.camiseta, '#141018', 0.5), 0.22 * pecho)}</g>`);
  return { svg: o.join(''), hombros: yS, medioAncho: fuera };
}
