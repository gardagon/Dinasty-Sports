import { TINTA } from './catalogos';
import { curva, n, type Pt } from './geometria';

/**
 * EL ESTILO DEL DIBUJO («tinta»: variante B de las muestras, elegida por el usuario): colores planos, sombra plana de un solo tono con el borde duro y línea oscura
 * de contorno. Aquí está todo lo que es del estilo: quien dibuja una pieza (un peinado, una barba, una prenda) solo usa estas funciones, no pone trazos a mano.
 */
export class Lienzo {
  readonly defs: string[] = [];
  private cuenta = 0;
  /** `prefijo` hace únicos los ids dentro de la página; `esc` es cuánto mide una unidad de cabeza en las unidades en que se dibuja (1 en la cabeza, cm en el cuerpo). */
  constructor(readonly prefijo: string, readonly esc = 1, private readonly raiz?: Lienzo) {}
  /** El mismo lienzo para dibujar en otra escala (el cuerpo, en centímetros). */
  enEscala(esc: number): Lienzo { return new Lienzo(this.prefijo, esc, this.raiz ?? this); }
  id(): string { const r = this.raiz ?? this; return `${r.prefijo}${(r.cuenta++).toString(36)}`; }
  private def(s: string): void { (this.raiz ?? this).defs.push(s); }
  /** Un recorte con la unión de uno o varios trazados; devuelve su id. */
  recorte(...ds: string[]): string { const id = this.id(); this.def(`<clipPath id="${id}">${ds.map((d) => `<path d="${d}"/>`).join('')}</clipPath>`); return id; }
  /** Trazado cerrado de una forma grande o de una mancha de sombra, con curvas suaves. */
  forma(pts: readonly Pt[], cerrada = true): string { return curva(pts, cerrada, 1); }
  relleno(d: string, color: string, extra = ''): string { return `<path d="${d}" fill="${color}"${extra}/>`; }
  /** La línea de contorno de una forma (peso 1 = la normal). */
  contorno(d: string, peso = 1, extra = ''): string {
    return `<path d="${d}" fill="none" stroke="${TINTA}" stroke-width="${n(0.036 * peso * this.esc)}" stroke-linejoin="round" stroke-linecap="round"${extra}/>`;
  }
  /** Una mancha de sombra plana (fuerza 0 a 1). */
  sombra(d: string, color: string, fuerza: number): string { return `<path d="${d}" fill="${color}" opacity="${n(Math.min(1, fuerza * 0.85))}"/>`; }
  /** Una línea de detalle (párpado, arruga, pliegue): `ancho` en unidades de cabeza. */
  trazo(d: string, ancho: number, opacidad = 1, color = TINTA): string {
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(ancho * 1.25 * this.esc)}" stroke-linecap="round" stroke-linejoin="round"${opacidad < 1 ? ` opacity="${n(opacidad)}"` : ''}/>`;
  }
  /** Una parte del cuerpo o de la ropa: relleno, sombra en el lado derecho (la misma forma desplazada, recortada a sí misma) y contorno. */
  parte(d: string, color: string, sombra: string, banda: number): string {
    const rec = this.recorte(d);
    return `<g clip-path="url(#${rec})"><path d="${d}" fill="${sombra}"/><path d="${d}" fill="${color}" transform="translate(${n(-banda)},0)"/></g>` + this.contorno(d);
  }
}
