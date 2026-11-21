import type { Borde } from './geometria';

/**
 * CATÁLOGOS DEL DIBUJO, como datos (lo que amplía la etapa 2c siguiendo `docs/ANEXO_RETRATOS.md`). Los ids de los peinados y del vello facial están en contracts
 * (`PEINADOS`, `VELLOS`); aquí está cómo se ve cada valor de la apariencia.
 */

/** Un color por cada valor de los catálogos de la apariencia (`PIEL`, `PELO_COLOR`, `OJOS`). */
export const COLOR_DE_PIEL: Record<string, string> = { muy_clara: '#f7dfd0', clara: '#eecaae', media: '#dfb08a', oliva: '#c99a6b', morena: '#a5714a', oscura: '#6f4732' };
export const COLOR_DE_PELO: Record<string, string> = { negro: '#262021', castano_oscuro: '#432e22', castano: '#6f4a31', rubio_oscuro: '#9c7a4c', rubio: '#d6b571', pelirrojo: '#b1542a' };
export const COLOR_DE_OJOS: Record<string, string> = { marron_oscuro: '#402818', marron: '#70471f', avellana: '#94763a', verde: '#5f8f58', gris: '#8494a2', azul: '#4a82bd' };
export const COLOR_DE_CANA = '#d9d8d4';
export const TINTA = '#2a2026';

/** Ropa neutra por defecto (los colores son parámetros del dibujo: la equipación del club llegará por ahí). */
export const ROPA = { camiseta: '#5b7a99', pantalon: '#3a4252', zapato: '#2b2d33' } as const;

/** Forma de la cara (`CARA`): [anchura, mandíbula, mentón, altura del ángulo de la mandíbula, relleno entre mandíbula y mentón]. */
export const FORMA_DE_CARA: Record<string, readonly [number, number, number, number, number]> = {
  ovalada: [0, 0, 0, 0.55, 0], redonda: [0.045, 0.07, 0.07, 0.5, 0.04], cuadrada: [0.02, 0.12, 0.11, 0.63, 0.05], alargada: [-0.055, -0.01, 0, 0.57, 0], corazon: [0.012, -0.05, -0.05, 0.52, 0],
};

/**
 * Tipo de pelo (`PELO_TIPO`): cómo es el borde (liso, con ondas o con rizos, y el tamaño del rizo), cuánto abulta ([base, por cm de largo, largo hasta el que crece el
 * volumen]) y cuánto de su largo se ve (un rizo de 10 cm cuelga 6).
 */
export const TIPO_DE_PELO: Record<string, { borde: Borde; paso: number; volumen: readonly [number, number, number]; lados: number; cuelga: number }> = {
  liso: { borde: 'liso', paso: 0.2, volumen: [0.03, 0.011, 6], lados: 0.55, cuelga: 1 },
  ondulado: { borde: 'onda', paso: 0.36, volumen: [0.03, 0.015, 7], lados: 0.7, cuelga: 0.85 },
  rizado: { borde: 'rizo', paso: 0.16, volumen: [0.03, 0.021, 9], lados: 0.8, cuelga: 0.6 },
  muy_rizado: { borde: 'rizo', paso: 0.1, volumen: [0.03, 0.028, 16], lados: 0.9, cuelga: 0.3 },
};
