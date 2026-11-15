/** Por debajo de los 3 años no se dibuja a la persona: sale una cuna con una manta, igual para todos (decisión del usuario). En centímetros, con el suelo en y = ALTO. */
import { TINTA } from './catalogos';
import { n } from './geometria';

export const CUNA = { ancho: 76, alto: 82 } as const;

export function dibujarCuna(): string {
  const madera = '#c9a278', sombra = '#a37f58', manta = '#8fb3d9', mantaSombra = '#6f93bb', sabana = '#f4f1ea';
  const linea = `stroke="${TINTA}" stroke-width="0.8" stroke-linejoin="round" stroke-linecap="round"`;
  const o: string[] = [];
  const x0 = -CUNA.ancho / 2, x1 = CUNA.ancho / 2;
  // Patas y cabecero.
  for (const x of [x0, x1 - 5]) o.push(`<rect x="${n(x)}" y="14" width="5" height="68" rx="1.5" fill="${x < 0 ? madera : sombra}" ${linea}/>`);
  o.push(`<path d="M${n(x0)},20Q0,-2 ${n(x1)},20L${n(x1)},30L${n(x0)},30Z" fill="${madera}" ${linea}/>`);
  // Colchón, almohada y manta abultada.
  o.push(`<rect x="${n(x0 + 5)}" y="42" width="${CUNA.ancho - 10}" height="12" fill="${sabana}" ${linea}/>`);
  o.push(`<ellipse cx="${n(x0 + 19)}" cy="41" rx="11" ry="4.5" fill="${sabana}" ${linea}/>`);
  o.push(`<path d="M${n(x0 + 20)},44C${n(x0 + 26)},30 ${n(x1 - 22)},28 ${n(x1 - 6)},43L${n(x1 - 6)},56L${n(x0 + 16)},56Z" fill="${manta}" ${linea}/>`);
  o.push(`<path d="M${n(x1 - 26)},34C${n(x1 - 16)},35 ${n(x1 - 9)},40 ${n(x1 - 6)},43L${n(x1 - 6)},56L${n(x1 - 24)},56Z" fill="${mantaSombra}" opacity="0.8"/>`);
  o.push(`<path d="M${n(x0 + 30)},40q6,-5 12,-1M${n(x0 + 38)},48q7,-4 14,0" fill="none" ${linea} opacity="0.5"/>`);
  // Barrotes y largueros.
  for (let i = 1; i < 9; i++) o.push(`<rect x="${n(x0 + 5 + (i * (CUNA.ancho - 13)) / 9)}" y="33" width="2.6" height="34" rx="1.2" fill="${i > 6 ? sombra : madera}" ${linea}/>`);
  o.push(`<rect x="${n(x0 + 3)}" y="29" width="${CUNA.ancho - 6}" height="5" rx="2" fill="${madera}" ${linea}/>`, `<rect x="${n(x0 + 3)}" y="66" width="${CUNA.ancho - 6}" height="5" rx="2" fill="${madera}" ${linea}/>`);
  return o.join('');
}
