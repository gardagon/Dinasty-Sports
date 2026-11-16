/**
 * CAPA 2 DEL DIBUJO, el cuerpo (en centímetros: x = 0 en el eje de la persona, y = 0 en la coronilla): cuello, camiseta, brazos, manos, pantalón y zapatos. Proporciones de niño que se pierden con la pubertad (cuello y extremidades más cortos, barriga, sin cintura), más diferencia
 * entre hombre y mujer (hombros, cintura, caderas, pecho) y entre complexiones (barriga, pectorales, brazos), manos con dedos y arrugas en el cuello. La ropa es neutra y sus colores son parámetros. Para añadir una prenda: `docs/ANEXO_RETRATOS.md`.
 */
import type { Cara } from './cara';
import { mix } from './color';
import { curva, espejo, n, p, type Pt } from './geometria';
import type { Lienzo } from './lienzo';
import type { Parametros } from './parametros';

const mezcla = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export interface CuerpoDibujado {
  svg: string;
  hombros: number;
  medioAncho: number;
  /** Cuánto queda (cm) entre el borde de dentro de la mano (el pulgar) y lo más ancho del tronco a su altura: positivo si la mano se ve entera. */
  holguraDeLasManos: number;
}

export function dibujarCuerpo(P: Parametros, L: Lienzo, C: Cara): CuerpoDibujado {
  const hh = P.cabeza, u = hh / 2;
  const H = P.altura, m = P.madura, k = P.nino, f = P.fuerte, g = Math.max(0, P.gordo), flaco = Math.min(0, P.gordo);
  const fp = Math.max(0, f);
  const val = (nino: number, hombre: number, mujer: number) => nino + (hombre - nino) * P.masc + (mujer - nino) * P.fem;
  // Alturas. De niño: cuello corto y piernas cortas (la entrepierna está más abajo de la mitad).
  const lc = hh * (0.06 + 0.19 * m) * (1 - 0.45 * k);
  const nw = u * C.w * (0.42 + 0.1 * m + 0.17 * P.masc + 0.08 * fp + 0.12 * g);
  const yNB = hh + 0.5 * lc, yS = hh + lc + 0.012 * H;
  const piernas = 0.385 + 0.095 * Math.min(1, m / 0.6) - 0.006 * Math.max(0, (m - 0.6) / 0.4) + 0.008 * P.fem - 0.03 * k;
  const yC = H * (1 - piernas), yW = yS + mezcla(0.58, 0.52, P.fem) * (yC - yS), yH = yC - 0.03 * H, yK = yC + 0.47 * (H - yC), yA = H - 0.04 * H;
  // Medias anchuras (fracción de la altura: niño, hombre, mujer). El niño no tiene cintura y tiene barriga; el hombre, hombros; la mujer, cintura y caderas.
  const sw = H * val(0.112, 0.137, 0.113) * (1 + 0.2 * f + 0.07 * g + 0.06 * flaco);
  const cw = H * val(0.085, 0.101, 0.087) * (1 + 0.26 * f + (0.26 + 0.14 * k) * g + 0.14 * flaco);
  const ww = H * val(0.084, 0.084, 0.066) * (1 + 0.05 * f + 0.75 * (1 - 0.4 * k) * g + 0.32 * flaco + 0.08 * P.vejez + 0.07 * k);
  const hw = H * val(0.086, 0.089, 0.107) * (1 + 0.42 * g + 0.2 * flaco + 0.05 * f);
  // La barriga (grasa y niñez) y el bajo de la camiseta; la cadera del pantalón nunca es más estrecha que el bajo (sin bajo acampanado).
  const barriga = g * (1 - 0.3 * P.fem) + 0.25 * k;
  const yBajo = yW + 0.72 * (yH - yW), bajo = Math.max(hw * 1.05, ww * (1.06 + 0.07 * barriga));
  const cadera = Math.max(hw * 1.03, bajo * 0.985);
  const o: string[] = [];
  const parte = (d: string, color: string, banda = 0.022 * H): string => L.parte(d, color, mix(color, '#141018', 0.38), banda);
  const t = 0.75;

  // ---- piernas (pantalón) y zapatos
  const ax = H * mezcla(0.05, 0.044, P.fem), lx = hw * 0.5, kx = mezcla(lx, ax, 0.5) + 0.004 * H;
  const pk = H * val(0.036, 0.04, 0.041) * (1 + 0.4 * g + 0.3 * f + 0.4 * flaco + 0.08 * k), ph = H * 0.033 * (1 + 0.15 * g);
  const sh = 0.034 * H, fw = ph * 1.05;
  for (const s of [-1, 1]) {
    const x = s * (ax + 0.004 * H);
    o.push(parte(curva([[x - fw, H - sh * 1.3], [x + fw, H - sh * 1.3], [x + fw + s * fw * 0.25, H - sh * 0.3], [x + fw * 0.95 + s * fw * 0.2, H], [x - fw * 0.95 + s * fw * 0.2, H], [x - fw + s * fw * 0.25, H - sh * 0.3]], true, 0.6), P.zapato, 0.008 * H));
  }
  const pierna: Pt[] = [[ww * 1.02, yW], [cadera, yH], [kx + pk, yK], [ax + ph, yA], [ax - ph, yA], [kx - pk * 0.9, yK], [0.012 * H, yC + 0.012 * H]];
  o.push(parte(`M${p([-ww * 1.02, yW])}L${p(pierna[0])}${curva(pierna, false, t, true)}L0,${n(yC)}L${p([-0.012 * H, yC + 0.012 * H])}${curva(espejo(pierna), false, t, true)}Z`, P.pantalon));

  // ---- brazos (más cortos y rollizos de niño), manos con dedos y mangas
  const au = H * val(0.052, 0.061, 0.05) * (1 + 0.75 * f + 0.45 * g + 0.45 * flaco + 0.1 * k), af = au * 0.82, wr = H * 0.029 * (1 + 0.1 * g + 0.1 * f);
  const largoBrazo = mezcla(0.88, 1, m) * (1 - 0.1 * k);
  const lu = 0.172 * H * largoBrazo, lf = 0.148 * H * largoBrazo, hl = 0.098 * H * mezcla(0.9, 1, m);
  // Los brazos cuelgan por fuera del tronco: se abren lo que haga falta para que la mano (con el pulgar hacia dentro) quede fuera de la barriga, la cadera y el bajo de la camiseta.
  const tronco = Math.max(bajo, cadera, ww * (1.07 + 0.1 * barriga), hw * 1.03);
  const pulgar = 1.42 * hl * 0.25;
  const hombro = sw - au * 0.5;
  const abre = Math.max(0.1 + 0.1 * g + 0.06 * fp, (tronco + pulgar + 0.008 * H - hombro) / (lu + 0.5 * lf));
  let fuera = sw;
  for (const s of [-1, 1]) {
    const S: Pt = [sw - au * 0.5, yS + au * 0.5], Ec: Pt = [S[0] + abre * lu, S[1] + lu], W: Pt = [Ec[0] + abre * 0.5 * lf, Ec[1] + lf];
    fuera = Math.max(fuera, W[0] + wr * 1.6);
    const q = (x: number, y: number): Pt => [s * x, y];
    // El brazo, con el hombro y el bíceps marcados si hay músculo y el antebrazo más ancho bajo el codo.
    const brazo = [q(S[0] + au * (0.5 + 0.08 * fp), S[1] - au * 0.2), q(mezcla(S[0], Ec[0], 0.4) + au * (0.52 + 0.1 * fp), mezcla(S[1], Ec[1], 0.4)), q(Ec[0] + af * 0.5, Ec[1]), q(Ec[0] + abre * 0.15 * lf + af * (0.54 + 0.05 * fp), Ec[1] + lf * 0.28), q(W[0] + wr * 0.5, W[1]), q(W[0] + wr * 0.5, W[1] + hl * 0.08),
      q(W[0] - wr * 0.5, W[1] + hl * 0.08), q(W[0] - wr * 0.5, W[1]), q(Ec[0] + abre * 0.15 * lf - af * 0.46, Ec[1] + lf * 0.3), q(Ec[0] - af * 0.46, Ec[1]), q(mezcla(S[0], Ec[0], 0.45) - au * 0.48, mezcla(S[1], Ec[1], 0.45)), q(S[0] - au * 0.5, S[1] + au * 0.3)];
    o.push(parte(curva(s > 0 ? brazo : [...brazo].reverse(), true, 1), P.piel, 0.01 * H));
    // La mano, relajada, con el pulgar hacia el cuerpo: palma, cuatro dedos de distinto largo y el pulgar.
    const a = hl * 0.25;
    const h = (x: number, y: number): Pt => [s * (W[0] + x * a), W[1] + y * hl];
    const mano = [h(0.72, 0), h(1.02, 0.24), h(1.0, 0.5), h(0.96, 0.7), h(0.8, 0.8), h(0.6, 0.74), h(0.5, 0.9), h(0.3, 0.96), h(0.14, 0.84), h(0.0, 0.98), h(-0.22, 1.01), h(-0.36, 0.86), h(-0.5, 0.9), h(-0.72, 0.88), h(-0.84, 0.66), h(-0.86, 0.5), h(-1.12, 0.62), h(-1.4, 0.6), h(-1.42, 0.42), h(-1.05, 0.2), h(-0.72, 0)];
    o.push(parte(curva(s > 0 ? mano : [...mano].reverse(), true, 0.9), P.piel, 0.006 * H));
    // Separación de los dedos y nudillos.
    const dedos = [[0.6, 0.74, 0.66, 0.5], [0.14, 0.84, 0.2, 0.52], [-0.36, 0.86, -0.3, 0.54]].map(([x0, y0, x1, y1]) => `M${p(h(x0, y0))}L${p(h(x1, y1))}`).join('');
    o.push(L.trazo(dedos, 0.011, 0.75), L.trazo(`M${p(h(-0.86, 0.5))}Q${p(h(-0.6, 0.4))} ${p(h(-0.5, 0.22))}`, 0.01, 0.55));
    const manga = [q(sw * 0.72, yS - 0.012 * H), q(S[0] + au * 0.3, S[1] - au * 0.5), q(S[0] + au * (0.6 + 0.08 * fp), S[1] + au * 0.1), q(mezcla(S[0], Ec[0], 0.58) + au * (0.62 + 0.08 * fp), mezcla(S[1], Ec[1], 0.58)), q(mezcla(S[0], Ec[0], 0.58) - au * 0.56, mezcla(S[1], Ec[1], 0.58) + au * 0.12), q(cw * 0.98, yS + 0.08 * H)];
    o.push(parte(curva(s > 0 ? manga : [...manga].reverse(), true, t), P.camiseta, 0.012 * H));
  }

  // ---- cuello, con la sombra del mentón y, con la edad, sus arrugas
  const cuello: Pt[] = [[nw, hh * 0.7], [nw * 1.02, yNB - 0.2 * lc], [nw * 1.5, yNB + 0.3 * lc], [0, yNB + 0.9 * lc]];
  const dCuello = curva([...cuello, ...espejo(cuello).slice(1)], true, 0.8);
  o.push(L.relleno(dCuello, mix(P.piel, P.pielSombra, 0.12)));
  const arrugasDelCuello = clamp((P.arrugas - 0.4) / 0.6);
  const lineas = arrugasDelCuello > 0 ? [0.2, 0.52].map((y, i) => L.trazo(`M${n(-nw * 0.8)},${n(hh + lc * y)}Q0,${n(hh + lc * (y + 0.16))} ${n(nw * 0.8)},${n(hh + lc * y)}`, 0.012, (0.3 + 0.5 * arrugasDelCuello) * (i ? clamp(arrugasDelCuello * 2 - 0.6) : 1))).join('') : '';
  o.push(`<g clip-path="url(#${L.recorte(dCuello)})">${L.sombra(L.forma([[-nw * 1.6, hh * 0.68], [nw * 1.9, hh * 0.68], [nw * 1.9, hh + 0.12 * lc], [nw * 0.75, hh + 0.3 * lc], [nw * 0.1, hh + 0.45 * lc], [-nw * 0.9, hh + 0.12 * lc]]), P.pielSombra, 1.1)}${lineas}</g>`);
  o.push(L.contorno(`M${p([-nw, hh * 0.9])}L${p([-nw * 1.02, yNB])}M${p([nw, hh * 0.9])}L${p([nw * 1.02, yNB])}`));

  // ---- camiseta: sigue el pecho, la cintura, la barriga y las caderas
  const ladoD: Pt[] = [[nw * 1.28, yNB - 0.06 * lc], [sw * 0.97, yS], [cw * (1.03 + 0.05 * P.fem), yS + 0.09 * H], [ww * 1.07, yW], ...(barriga > 0.1 ? [[ww * (1.07 + 0.1 * barriga), mezcla(yW, yBajo, 0.5)] as Pt] : []), [bajo, yBajo]];
  const yEscote = yNB + 0.85 * lc;
  const escote = `M${p([-nw * 1.28, yNB - 0.06 * lc])}C${n(-nw * 1.0)},${n(yEscote)} ${n(nw * 1.0)},${n(yEscote)} ${p(ladoD[0])}`;
  const dCamiseta = `${escote}${curva(ladoD, false, t, true)}L${p([-bajo, yBajo])}${curva(espejo(ladoD), false, t, true)}Z`;
  o.push(parte(dCamiseta, P.camiseta));
  o.push(`<path d="${escote}" fill="none" stroke="${mix(P.camiseta, '#141018', 0.3)}" stroke-width="${n(0.06 * u)}" stroke-linecap="round"/>`);
  const pliegues: string[] = [];
  const tela = mix(P.camiseta, '#141018', 0.5);
  const yP = yS + 0.108 * H;
  if (P.fem > 0.3) {
    // El pecho de la mujer: una sombra en media luna bajo cada lado.
    for (const s of [-1, 1]) pliegues.push(L.sombra(`M${n(s * cw * 0.1)},${n(yP)}Q${n(s * cw * 0.48)},${n(yP + 0.034 * H)} ${n(s * cw * 0.92)},${n(yP - 0.006 * H)}Q${n(s * cw * 0.5)},${n(yP + 0.016 * H)} ${n(s * cw * 0.1)},${n(yP)}Z`, tela, 0.5 * P.fem));
  } else {
    // Los pectorales del hombre, según el músculo; de niño, nada.
    const pec = clamp(0.15 + 0.9 * fp) * P.masc;
    if (pec > 0.05) for (const s of [-1, 1]) pliegues.push(L.sombra(`M${n(s * cw * 0.06)},${n(yP - 0.004 * H)}Q${n(s * cw * 0.45)},${n(yP + 0.02 * H)} ${n(s * cw * 0.9)},${n(yP - 0.014 * H)}Q${n(s * cw * 0.48)},${n(yP + 0.008 * H)} ${n(s * cw * 0.06)},${n(yP - 0.004 * H)}Z`, tela, 0.45 * pec));
  }
  // La barriga: una sombra curva por debajo.
  if (barriga > 0.3) pliegues.push(L.sombra(`M${n(-ww * 0.85)},${n(mezcla(yW, yBajo, 0.6))}Q0,${n(yBajo + 0.012 * H)} ${n(ww * 0.9)},${n(mezcla(yW, yBajo, 0.6))}Q0,${n(yBajo - 0.012 * H)} ${n(-ww * 0.85)},${n(mezcla(yW, yBajo, 0.6))}Z`, tela, 0.4 * clamp(barriga)));
  o.push(`<g clip-path="url(#${L.recorte(dCamiseta)})">${pliegues.join('')}</g>`);
  return { svg: o.join(''), hombros: yS, medioAncho: fuera, holguraDeLasManos: hombro + abre * (lu + 0.5 * lf) - pulgar - tronco };
}
