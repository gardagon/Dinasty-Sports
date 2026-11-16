import { suceso, type AporteDeSucesos, type Condicion, type Disparo } from '@ds/contracts';

/** Una revelación: cuándo se da cuenta el personaje de un perk latente que tiene desde que nació, y cómo se cuenta. */
export interface Revelacion {
  perk: string;
  titulo: string;
  disparo: Disparo;
  /** Además de tener el perk sin revelar. */
  cuando?: readonly Condicion[];
  texto: string;
  /** Ánimo que da o quita enterarse. */
  motivacion: number;
  /** Nombre del perk tal como sale en el diario. */
  nombre: string;
}

/**
 * Los sucesos de revelación a partir de una tabla (una fila por perk): todos tienen la misma forma, así que se escriben una vez.
 * Lo que sale es el mismo dato que si se escribiera cada uno a mano, y pasa las mismas comprobaciones.
 */
export const revelaciones = (filas: readonly Revelacion[]): AporteDeSucesos[] =>
  filas.map((f) =>
    suceso({
      id: `eventos.perks.${f.perk}`,
      titulo: f.titulo,
      disparo: f.disparo,
      cuando: [{ perk: f.perk, revelado: false }, ...(f.cuando ?? [])],
      repite: 'nunca',
      texto: f.texto,
      efectos: [{ revelaPerk: f.perk }, { estado: 'gen.motivacion', mas: f.motivacion }, { diario: `Has descubierto algo de ti: ${f.nombre}.`, tipo: 'logro' }],
    }),
  );
