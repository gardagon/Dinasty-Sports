/**
 * CAPA 2 DEL DIBUJO, la cara: medidas, orejas, sombras, nariz, boca, ojos, cejas, arrugas y distintivos. Todo sale de los parámetros; las proporciones por edad y los
 * doce rasgos heredados están en `medidasDeCara` (no se tocan al añadir peinados, barbas o prendas: `docs/ANEXO_RETRATOS.md`).
 */
import { rngEstable } from '@ds/contracts';
import { FORMA_DE_CARA } from './catalogos';
import { mix } from './color';
import { curva, espejo, n, p, type Pt } from './geometria';
import type { Lienzo } from './lienzo';
import type { Parametros } from './parametros';
import { dibujarVello } from './vello';

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mezcla = (a: number, b: number, t: number) => a + (b - a) * t;

export interface Cara {
  w: number; wc: number; wz: number; wj: number; wm: number; yj: number;
  /** Media anchura de la cara a una altura. */
  borde(y: number): number;
  contorno: Pt[];
  ey: number; ex: number; ew: number; eh: number; sube: number;
  yn: number; na: number;
  ym: number; mw: number; lu: number; ll: number;
  yh: number;
}

/** Las medidas de la cara, en unidades de cabeza (y = −1 la coronilla, y = 1 el mentón): de aquí salen todas las piezas. */
export function medidasDeCara(P: Parametros): Cara {
  const r = P.rostro, m = P.madura, v = P.vejez, g = Math.max(0, P.gordo), k = P.nino;
  const F = FORMA_DE_CARA[P.forma] ?? FORMA_DE_CARA.ovalada;
  const hombre = P.sexo === 'm';
  const w = mezcla(0.765, 0.7, m) + F[0] * (1 - 0.5 * k) + 0.05 * g + 0.035 * k;
  const wc = w * (P.forma === 'corazon' ? 1.01 : 0.985);
  const wz = w * (0.895 + 0.115 * r.pomulos + (P.forma === 'corazon' ? 0.02 : 0));
  const wj = w * (mezcla(0.8, hombre ? 0.8 + 0.05 * P.masc : 0.74, m) + F[1] * (1 - 0.5 * k) + 0.1 * g + 0.04 * v + 0.07 * k);
  const wm = w * (mezcla(0.3, hombre ? 0.37 : 0.29, m) + F[2] + (r.menton - 0.5) * 0.25 * (1 - 0.4 * k) + 0.05 * g + 0.05 * k);
  const yj = F[3] + 0.03 * g + 0.03 * v;
  const mitad: Pt[] = [[0, -1], [0.5 * wc, -0.955], [0.875 * wc, -0.73], [wc, -0.32], [wz, 0.1], [wj, yj], [(wj + wm) / 2 + w * (0.05 + 0.05 * (1 - m) + 0.05 * g + F[4] + 0.07 * k), (yj + 0.9) / 2 + 0.03], [wm, 0.9 + 0.04 * (r.menton - 0.5)], [0, 1]];
  const contorno = [...mitad, ...espejo(mitad).slice(1, -1)];
  const borde = (y: number): number => {
    for (let i = 1; i < mitad.length; i++) if (y <= mitad[i][1]) { const a = mitad[i - 1], b = mitad[i]; return a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1] || 1); }
    return 0;
  };
  const ey = mezcla(0.13, 0, m) + 0.08 * k;
  const ew = 0.4 * w * (0.86 + 0.26 * r.ojosTamano) * mezcla(1.14, 1, m) * 1.05 * (1 + 0.16 * k);
  const eh = ew * (0.31 + 0.19 * r.ojosForma) * (1 - 0.18 * v) * mezcla(1.08, 1, m) * (1 + 0.1 * k);
  const sube = (ew / 2) * (0.04 + 0.22 * (1 - r.ojosForma) - 0.1 * v);
  const yn = ey + mezcla(0.3, 0.4, m) - 0.045 * k + 0.14 * (r.narizTamano - 0.5) * mezcla(0.6, 1, m) + 0.03 * v;
  const na = w * (0.155 + 0.1 * r.narizForma) * (0.82 + 0.36 * r.narizTamano) * mezcla(0.85, 1, m) * (1 + 0.08 * v + 0.04 * P.masc) * (1 - 0.16 * k);
  const ym = Math.min(0.72, yn + mezcla(0.17, 0.215, m) - (r.menton - 0.5) * 0.05);
  const mw = w * (0.25 + 0.13 * r.bocaAnchura) * mezcla(0.86, 1, m) * (1 - 0.1 * k);
  const lu = (0.03 + 0.05 * r.bocaGrosor) * (1 - 0.3 * v) * (1 - 0.12 * P.masc);
  const ll = (0.045 + 0.065 * r.bocaGrosor) * (1 - 0.25 * v) * (1 - 0.1 * P.masc);
  return { w, wc, wz, wj, wm, yj, borde, contorno, ey, ex: 0.41 * w, ew, eh, sube, yn, na, ym, mw, lu, ll, yh: -0.6 };
}

/** La cara entera (sin el pelo): orejas, base, sombras, contorno, vello facial y rasgos. */
export function dibujarCara(P: Parametros, L: Lienzo, C: Cara): string {
  const r = P.rostro, v = P.vejez, g = Math.max(0, P.gordo), a = P.arrugas;
  const o: string[] = [];
  const dCara = L.forma(C.contorno);
  const recorte = L.recorte(dCara);
  const sombra = P.pielSombra;

  // ---- orejas (detrás de la cara)
  const eyC = (C.ey + C.yn) / 2 - 0.04;
  const eh = (0.36 + 0.2 * r.orejasTamano) * (1 + 0.1 * v);
  const ew = eh * (0.2 + 0.3 * r.orejasDespegadas);
  for (const s of [-1, 1]) {
    const x0 = s * (C.borde(eyC) - 0.06);
    const q = (x: number, y: number): Pt => [x0 + s * x, eyC + y];
    const d = `M${p(q(0, -eh * 0.42))}C${p(q(ew * 0.75, -eh * 0.66))} ${p(q(ew * 1.25, -eh * 0.2))} ${p(q(ew * 0.85, eh * 0.16))}C${p(q(ew * 0.68, eh * 0.4))} ${p(q(ew * 0.3, eh * 0.56))} ${p(q(0, eh * 0.4))}Z`;
    o.push(L.relleno(d, mix(P.piel, sombra, s > 0 ? 0.3 : 0.1)));
    o.push(L.trazo(`M${p(q(ew * 0.25, -eh * 0.3))}C${p(q(ew * 0.75, -eh * 0.42))} ${p(q(ew * 0.85, -eh * 0.05))} ${p(q(ew * 0.5, eh * 0.12))}`, 0.016, 0.55));
    o.push(L.contorno(d));
  }

  // ---- base y sombras planas, recortadas a la cara. La luz viene de arriba a la izquierda.
  o.push(L.relleno(dCara, P.piel));
  const s: string[] = [];
  const w = C.w;
  s.push(L.sombra(L.forma([[0.42 * C.wc, -1.1], [0.72 * C.wc, -0.62], [0.78 * C.wz, 0.02], [0.8 * C.wj, C.yj - 0.08], [0.55 * C.wm + 0.12, 0.9], [0.1, 1.1], [w + 0.3, 1.1], [w + 0.3, -1.1]]), sombra, 0.55));
  // Bajo el pómulo: más marcado con pómulos altos, menos con grasa.
  const hueco = clamp(0.25 + 0.6 * r.pomulos - 0.5 * g) * mezcla(0.5, 1, P.madura) * (1 - P.nino);
  for (const lado of [-1, 1]) s.push(L.sombra(L.forma([[lado * C.wz * 0.98, 0.2], [lado * C.wz * 0.6, 0.3], [lado * (C.mw + 0.1), C.ym + 0.02], [lado * C.wj * 0.72, C.yj + 0.12], [lado * C.wj * 1.0, C.yj - 0.05]]), sombra, hueco * (lado > 0 ? 0.5 : 0.36)));
  // Cuencas de los ojos.
  for (const lado of [-1, 1]) s.push(L.sombra(L.forma([[lado * (C.ex - C.ew * 0.62), C.ey - C.eh * 0.2], [lado * C.ex, C.ey - C.eh * 0.95 - 0.03], [lado * (C.ex + C.ew * 0.62), C.ey - C.eh * 0.3], [lado * (C.ex + C.ew * 0.5), C.ey + C.eh * 0.5], [lado * (C.ex - C.ew * 0.5), C.ey + C.eh * 0.55]]), sombra, 0.22 + 0.2 * v));
  // Mofletes de niño: un rubor plano en las mejillas.
  if (P.nino > 0.05) for (const lado of [-1, 1]) s.push(`<ellipse cx="${n(lado * C.wz * 0.66)}" cy="${n(C.yn - 0.02)}" rx="0.17" ry="0.11" fill="#e0705f" opacity="${n(0.26 * P.nino)}"/>`);
  // Papada.
  if (g > 0.15) s.push(L.sombra(L.forma([[-C.wj * 0.8, C.yj + 0.2], [0, 0.9], [C.wj * 0.8, C.yj + 0.2], [C.wm, 1.02], [-C.wm, 1.02]]), sombra, 0.5 * g));
  o.push(`<g clip-path="url(#${recorte})">${s.join('')}</g>`);

  // ---- contorno de la cara y, encima, el vello facial: la línea rodea el borde de fuera de la barba (la que cuelga tapa la línea del mentón y lleva la suya).
  const vello = dibujarVello(P, L, C, recorte);
  o.push(L.contorno(dCara), vello.svg);

  // ---- nariz
  const { yn, na } = C;
  const puente = 0.035 + 0.03 * (1 - r.narizForma);
  o.push(L.sombra(L.forma([[puente, C.ey - 0.1], [puente + 0.02, C.ey + 0.12], [na * 0.62, yn - 0.2], [na * 1.02, yn - 0.06], [na * 0.9, yn + 0.03], [na * 0.3, yn + 0.05], [0.05, yn - 0.03], [0.015, yn - 0.2]]), sombra, 0.55 * mezcla(0.5, 1, P.madura) * (1 - 0.85 * P.nino)));
  o.push(L.sombra(L.forma([[-na * 0.6, yn + 0.02], [na * 0.95, yn + 0.01], [na * 0.75, yn + 0.085], [0.02, yn + 0.1], [-na * 0.35, yn + 0.06]]), sombra, 0.5));
  const redonda = 0.9 + 0.35 * mezcla(r.narizForma, 1, 0.6 * P.nino);
  for (const lado of [-1, 1]) {
    const q = (x: number, y: number): Pt => [lado * x, yn + y];
    o.push(L.trazo(`M${p(q(na * 0.62, -0.16))}C${p(q(na * (0.98 * redonda), -0.15))} ${p(q(na * 1.06 * redonda, -0.02))} ${p(q(na * 0.78, 0.008))}`, 0.016, (lado > 0 ? 0.7 : 0.35) * (1 - 0.45 * P.nino)));
    o.push(`<ellipse cx="${n(lado * na * 0.5)}" cy="${n(yn - 0.003)}" rx="${n(na * (0.2 + 0.07 * r.narizForma))}" ry="${n(0.013 + 0.009 * r.narizForma)}" transform="rotate(${lado * -14} ${n(lado * na * 0.5)} ${n(yn)})" fill="${mix(sombra, '#1c0d0c', 0.55)}" opacity="0.85"/>`);
  }
  o.push(L.trazo(`M${n(-na * 0.3)},${n(yn + 0.022)}Q0,${n(yn + 0.055)} ${n(na * 0.3)},${n(yn + 0.022)}`, 0.016, 0.7));
  // Puente marcado en las narices finas.
  if (r.narizForma < 0.45 && P.madura > 0.6) o.push(L.trazo(`M${n(puente + 0.012)},${n(C.ey + 0.04)}L${n(puente + 0.03)},${n(yn - 0.2)}`, 0.014, 0.5 * (1 - r.narizForma)));

  // ---- boca
  const { ym, mw, lu, ll } = C;
  const yc = ym - 0.012; // comisuras algo levantadas
  const union = `Q${n(mw * 0.5)},${n(ym + 0.014)} 0,${n(ym + 0.006)}Q${n(-mw * 0.5)},${n(ym + 0.014)} ${n(-mw)},${n(yc)}`;
  const dSup = `M${n(-mw)},${n(yc)}C${n(-mw * 0.6)},${n(ym - lu * 0.75)} ${n(-mw * 0.28)},${n(ym - lu * 1.3)} ${n(-mw * 0.13)},${n(ym - lu * 1.12)}Q0,${n(ym - lu * 0.72)} ${n(mw * 0.13)},${n(ym - lu * 1.12)}C${n(mw * 0.28)},${n(ym - lu * 1.3)} ${n(mw * 0.6)},${n(ym - lu * 0.75)} ${n(mw)},${n(yc)}${union}Z`;
  const dInf = `M${n(-mw * 0.93)},${n(yc + 0.004)}C${n(-mw * 0.55)},${n(ym + ll * 1.32)} ${n(mw * 0.55)},${n(ym + ll * 1.32)} ${n(mw * 0.93)},${n(yc + 0.004)}Q${n(mw * 0.5)},${n(ym + 0.014)} 0,${n(ym + 0.006)}Q${n(-mw * 0.5)},${n(ym + 0.014)} ${n(-mw * 0.93)},${n(yc + 0.004)}Z`;
  if (!vello.tapaElMenton) o.push(L.sombra(L.forma([[-mw * 0.55, ym + ll * 1.05], [mw * 0.62, ym + ll * 1.05], [mw * 0.4, ym + ll * 1.05 + 0.07], [-mw * 0.3, ym + ll * 1.05 + 0.06]]), sombra, 0.42));
  o.push(L.relleno(dInf, P.labios));
  o.push(L.relleno(dSup, mix(P.labios, sombra, 0.3)));
  o.push(L.trazo(`M${n(-mw - 0.012)},${n(yc - 0.004)}Q${n(-mw * 0.5)},${n(ym + 0.014)} 0,${n(ym + 0.006)}Q${n(mw * 0.5)},${n(ym + 0.014)} ${n(mw + 0.012)},${n(yc - 0.004)}`, 0.018, 0.95));
  o.push(L.trazo(`M${n(-mw * 0.5)},${n(ym + ll * 1.0)}Q0,${n(ym + ll * 1.3)} ${n(mw * 0.5)},${n(ym + ll * 1.0)}`, 0.012, 0.8));
  // Surco bajo la nariz y hoyuelos.
  if (!vello.tapaElBigote) for (const lado of [-1, 1]) o.push(L.trazo(`M${n(lado * 0.035)},${n(yn + 0.06)}L${n(lado * mw * 0.13)},${n(ym - lu * 1.18)}`, 0.01, 0.22));
  if (P.distintivos.includes('hoyuelos')) for (const lado of [-1, 1]) o.push(L.trazo(`M${n(lado * (mw + 0.09))},${n(ym - 0.07)}q${n(lado * 0.04)},0.06 ${n(-lado * 0.005)},0.12`, 0.018, 0.75));

  // ---- ojos y cejas
  o.push(dibujarOjos(P, L, C));

  // ---- arrugas: cada una aparece a partir de un punto y se alarga y se marca poco a poco; a los 30 ya asoman el surco de la nariz a la boca y las patas de gallo.
  if (a > 0.02) {
    /** Cuánto se ve una arruga que empieza cuando las arrugas van por `desde` (0 a 1). */
    const ve = (desde: number) => clamp((a - desde) / (1 - desde));
    const t = (d: string, desde: number, ancho = 0.013) => { const x = ve(desde); if (x > 0) o.push(L.trazo(d, ancho * (0.8 + 0.5 * x), 0.3 + 0.6 * x)); };
    for (const lado of [-1, 1]) {
      // Surco nasolabial: se alarga hacia la boca.
      const nl = ve(0.02);
      if (nl > 0) o.push(L.trazo(`M${n(lado * na * 1.12)},${n(yn - 0.07)}Q${n(lado * (mw + 0.1) * mezcla(0.85, 1, nl))},${n(yn + 0.06)} ${n(lado * mezcla(na * 1.3, mw + 0.08, nl))},${n(mezcla(yn + 0.06, ym + 0.05, nl))}`, 0.012 + 0.008 * nl, 0.3 + 0.6 * nl));
      // Patas de gallo: primero una, luego tres.
      const xo = lado * (C.ex + C.ew * 0.58);
      t(`M${n(xo)},${n(C.ey - C.sube)}l${n(lado * 0.08)},-0.006`, 0.08, 0.011);
      t(`M${n(xo)},${n(C.ey - C.sube - 0.028)}l${n(lado * 0.075)},-0.042`, 0.3, 0.011);
      t(`M${n(xo)},${n(C.ey - C.sube + 0.028)}l${n(lado * 0.075)},0.034`, 0.3, 0.011);
      // Bolsas bajo los ojos.
      t(`M${n(lado * (C.ex - C.ew * 0.42))},${n(C.ey + C.eh * 0.55 + 0.03)}Q${n(lado * C.ex)},${n(C.ey + C.eh * 0.55 + 0.09)} ${n(lado * (C.ex + C.ew * 0.45))},${n(C.ey + C.eh * 0.5 + 0.02)}`, 0.25, 0.012);
      t(`M${n(lado * (C.ex - C.ew * 0.3))},${n(C.ey + C.eh * 0.55 + 0.085)}Q${n(lado * C.ex)},${n(C.ey + C.eh * 0.55 + 0.13)} ${n(lado * (C.ex + C.ew * 0.4))},${n(C.ey + C.eh * 0.5 + 0.07)}`, 0.7, 0.01);
      // Comisuras, mejilla y mandíbula caída.
      if (!vello.tapaElMenton) t(`M${n(lado * (mw + 0.02))},${n(ym + 0.02)}q${n(lado * 0.03)},0.06 ${n(lado * 0.01)},0.13`, 0.4);
      t(`M${n(lado * C.wz * 0.78)},${n(C.yn - 0.12)}Q${n(lado * C.wz * 0.86)},${n(C.yn + 0.05)} ${n(lado * C.wz * 0.74)},${n(C.ym + 0.02)}`, 0.62, 0.011);
      if (!vello.tapaElMenton) t(`M${n(lado * C.wj * 0.8)},${n(C.yj + 0.05)}Q${n(lado * C.wj * 0.72)},${n(C.yj + 0.22)} ${n(lado * C.wm * 1.25)},${n(0.9)}`, 0.6);
      // Entrecejo.
      t(`M${n(lado * 0.045)},${n(C.ey - C.eh - 0.17)}l${n(lado * 0.008)},0.08`, 0.35);
    }
    // Frente: una línea, luego tres.
    [0.22, 0.4, 0.6].forEach((desde, i) => { const y = -0.42 - i * 0.085; t(`M${n(-0.36 + i * 0.03)},${n(y)}Q0,${n(y - 0.028)} ${n(0.36 - i * 0.03)},${n(y)}`, desde); });
  }

  // ---- distintivos
  if (P.distintivos.includes('pecas')) {
    const az = rngEstable('retrato', P.semilla, 'pecas');
    for (let k = 0; k < 34; k++) {
      const x = (az.next() + az.next() - 1) * C.wz * 0.78, y = C.ey + 0.13 + az.next() * (yn - C.ey - 0.1) + Math.abs(x) * 0.12;
      o.push(`<circle cx="${n(x)}" cy="${n(y)}" r="${n(0.007 + az.next() * 0.008)}" fill="${mix(sombra, '#7a3a16', 0.5)}" opacity="${n(0.4 + az.next() * 0.35)}"/>`);
    }
  }
  if (P.distintivos.includes('lunares')) {
    const az = rngEstable('retrato', P.semilla, 'lunares');
    const sitios: Pt[] = [[(az.chance(0.5) ? 1 : -1) * (C.wz * (0.45 + az.next() * 0.3)), yn - 0.05 + az.next() * 0.2], [(az.chance(0.5) ? 1 : -1) * (mw + 0.05 + az.next() * 0.1), ym + 0.03 + az.next() * 0.16]];
    for (const [x, y] of sitios) o.push(`<circle cx="${n(x)}" cy="${n(y)}" r="${n(0.014 + az.next() * 0.008)}" fill="${mix(sombra, '#22100c', 0.7)}"/>`);
  }
  return o.join('');
}

function dibujarOjos(P: Parametros, L: Lienzo, C: Cara): string {
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
    const [ix, iy] = q(0, (hl - hu) * 0.5 + 0.004);
    const g: string[] = [`<path d="${dOjo}" fill="#f3efea"/>`];
    // Iris con su borde oscuro, pupila, sombra del párpado y brillo (siempre del mismo lado: la luz viene de la izquierda).
    g.push(`<circle cx="${n(ix)}" cy="${n(iy)}" r="${n(ri)}" fill="${P.iris}" stroke="${mix(P.iris, '#0c0a10', 0.6)}" stroke-width="${n(ri * 0.13)}"/>`);
    g.push(`<path d="M${n(ix - ri * 0.8)},${n(iy + ri * 0.2)}A${n(ri * 0.85)},${n(ri * 0.85)} 0 0 0 ${n(ix + ri * 0.8)},${n(iy + ri * 0.2)}Z" fill="${mix(P.iris, '#fff', 0.35)}" opacity="0.4"/>`);
    g.push(`<circle cx="${n(ix)}" cy="${n(iy)}" r="${n(ri * 0.44)}" fill="#0d0b0e"/>`);
    g.push(`<path d="M${p(dentro)}${sup}" fill="none" stroke="#2c1d22" stroke-width="${n(eh * 0.42)}" opacity="0.26"/>`);
    g.push(`<circle cx="${n(ix - ri * 0.32)}" cy="${n(iy - ri * 0.36)}" r="${n(ri * 0.2)}" fill="#fff" opacity="0.95"/>`);
    o.push(`<g clip-path="url(#${L.recorte(dOjo)})">${g.join('')}</g>`);
    // Párpado de arriba (línea de pestañas), pliegue y párpado de abajo.
    const grosor = (mujer ? 0.039 : 0.028) * mezcla(0.8, 1, P.madura);
    o.push(`<path d="M${p(dentro)}${sup}${mujer ? `l${n(s * 0.03)},${n(-0.022)}` : ''}" fill="none" stroke="${pestana}" stroke-width="${n(grosor)}" stroke-linecap="round" stroke-linejoin="round"/>`);
    if (mujer) for (const k of [0.55, 0.8]) o.push(`<path d="M${p(q(a * k, -hu * (1.05 - (k - 0.55) * 1.2) - sube * k))}l${n(s * 0.028)},${n(-0.03)}" fill="none" stroke="${pestana}" stroke-width="0.014" stroke-linecap="round"/>`);
    const alto = hu * 0.55 + 0.035 - 0.012 * P.vejez;
    o.push(L.trazo(`M${p(q(-a * 0.78, -hu * 0.55 - alto))}Q${p(q(-a * 0.05, -hu * 1.45 - alto))} ${p(q(a * 0.95, -sube - alto * 0.55))}`, 0.014, (0.6 + 0.3 * P.vejez) * (1 - 0.75 * P.nino)));
    o.push(L.trazo(`M${p(fuera)}${inf}`, 0.011, 0.45));

    // Ceja.
    const y0 = ey - hu - 0.085 - 0.03 * (1 - 0.6 * P.masc) - eh * 0.12;
    const th0 = (0.03 + 0.055 * r.cejasGrosor) * (1 + 0.25 * P.masc) * mezcla(0.75, 1, P.madura) * (1 - 0.25 * P.vejez) * (1 - 0.25 * P.nino);
    const arco = 0.008 + 0.115 * r.cejasForma;
    const x0 = Math.max(0.045, C.ex - ew * 0.56), largo = ew * 1.16;
    const ts = [0, 0.14, 0.36, 0.6, 0.82, 1];
    const centro = (t: number): Pt => [x0 + t * largo, y0 - arco * (t < 0.6 ? Math.sin((t / 0.6) * Math.PI * 0.5) : Math.cos(((t - 0.6) / 0.4) * Math.PI * 0.42)) - sube * 0.5 * t + 0.02 * P.masc * (1 - t)];
    const th = (t: number) => th0 * (t < 0.14 ? 0.78 + (t / 0.14) * 0.22 : 1 - 0.82 * ((t - 0.14) / 0.86) ** 1.4);
    const arriba = ts.map((t): Pt => { const c = centro(t); return [s * c[0], c[1] - th(t) / 2]; });
    const abajo = ts.map((t): Pt => { const c = centro(t); return [s * c[0], c[1] + th(t) / 2]; }).reverse();
    o.push(`<path d="${curva([...arriba, ...abajo], true, 1)}" fill="${P.ceja}" opacity="${n(0.82 + 0.18 * r.cejasGrosor)}"/>`);
    const pelos: string[] = [];
    for (let k = 0; k < 7; k++) { const t = 0.06 + k * 0.13; const c = centro(t); pelos.push(`M${n(s * c[0])},${n(c[1] + th(t) * 0.45)}l${n(s * 0.03)},${n(-th(t) * 0.95)}`); }
    o.push(`<path d="${pelos.join('')}" stroke="${mix(P.ceja, '#000', 0.35)}" stroke-width="0.008" opacity="0.6" fill="none"/>`);
  }
  return o.join('');
}
