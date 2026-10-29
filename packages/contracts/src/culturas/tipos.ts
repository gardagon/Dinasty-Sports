/**
 * Nombres y apellidos como DATO por cultura (un país nuevo o un mod añade otra cultura, sin tocar el código que los sortea).
 * Cada origen familiar (`ORIGENES`, en rasgos.ts) apunta a una reserva de nombres, y cada reserva tiene una o varias culturas:
 * una persona elige una cultura y saca de ella el nombre y los apellidos, para que no salgan mezclas absurdas («Hiroshi Zhang»).
 */

/** Los nombres de una cultura, por generación: los de quienes tienen menos de 25 años y los de los adultos. */
export interface NombresPorEdad {
  jovenes: readonly string[];
  adultos: readonly string[];
}

export interface Cultura {
  id: string;
  /** Peso de la cultura dentro de su reserva. */
  peso: number;
  /** Del más al menos frecuente: los primeros salen más. */
  nombres: { f: NombresPorEdad; m: NombresPorEdad };
  /** Nombres compuestos (José Manuel, María José…), del más al menos frecuente. */
  compuestos?: { f: readonly string[]; m: readonly string[] };
  /** Probabilidad de nombre compuesto (si hay lista): adultos y jóvenes. */
  probabilidadDeCompuesto?: { adultos: number; jovenes: number };
  apellidos: readonly string[];
  /** Apellidos que lleva un adulto de esta cultura: dos (España, Latinoamérica) o uno. Los nacidos en el país de juego llevan los suyos. */
  numeroDeApellidos: 1 | 2;
  /** Cómo cambia un apellido al ser de mujer: [final masculino, final femenino] (Kowalski → Kowalska). */
  femenino?: readonly (readonly [string, string])[];
}

/** Una lista escrita separada por comas (los nombres y apellidos con espacio, como «El Idrissi», van tal cual); si algo se repite, se queda la primera vez. */
export const lista = (texto: string): readonly string[] => [...new Set(texto.split(',').map((s) => s.trim()).filter(Boolean))];
