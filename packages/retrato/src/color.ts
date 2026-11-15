/** Mezclas de color (hexadecimal). */
type Rgb = [number, number, number];
const rgb = (hex: string): Rgb => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const hex = (c: Rgb): string => '#' + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');

/** El color `a` con una parte `t` (0 a 1) de `b`. */
export const mix = (a: string, b: string, t: number): string => { const x = rgb(a); const y = rgb(b); return hex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]); };
/** ¿Es un color oscuro? */
export const oscuro = (c: string): boolean => rgb(c)[0] < 150;
