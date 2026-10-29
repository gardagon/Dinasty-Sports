/** «3º»: puesto en una clasificación. */
export const orden = (n: number): string => `${n}º`;

/**
 * Las 10 primeras filas de una clasificación y, si el personaje no está entre ellas, su fila al final con su puesto real.
 * `yo` dice si una fila es la del personaje y `fila` la convierte en las celdas de la tabla.
 */
export function recorte<F extends { yo?: boolean }>(filas: readonly F[], fila: (f: F, puesto: number) => string[]): { rows: string[][]; highlight: number } {
  const top = filas.slice(0, 10);
  const yo = filas.findIndex((f) => f.yo);
  const rows = top.map((f, i) => fila(f, i + 1));
  if (yo >= 10) rows.push(fila(filas[yo], yo + 1));
  return { rows, highlight: yo < 0 ? -1 : Math.min(yo, rows.length - 1) };
}
