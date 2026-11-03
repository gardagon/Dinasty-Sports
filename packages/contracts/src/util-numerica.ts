/** Acota un número entre un mínimo y un máximo. */
export const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
