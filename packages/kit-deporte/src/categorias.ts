import { SERVICES, categoriaDeEdad, datosDeDeporte, categoriaSuperior, type ActionDef, type CategoriaDef, type IdentityService, type ReadContext } from '@ds/contracts';
import type { ConfigDeporte, EstadoBaseDeDeporte } from './tipos';

/** Las categorías por edad del deporte en el país de la partida (datos del deporte; si no trae el país, las de España). */
export const categoriasDe = (ctx: ReadContext, cfg: ConfigDeporte): readonly CategoriaDef[] => datosDeDeporte(ctx, cfg.id).categorias;

export interface CategoriaJugador {
  /** La que le toca por edad. */
  propia: CategoriaDef;
  /** En la que compite (la superior si ha subido). */
  competida: CategoriaDef;
  superior: boolean;
}

/** Categoría del jugador según su edad y si ha subido de categoría. */
export function categoriaDelJugador(ctx: ReadContext, cfg: ConfigDeporte): CategoriaJugador {
  // La categoría depende de la edad de temporada (la que se tenía al empezar el curso), como en la federación.
  const edad = ctx.service<IdentityService>(SERVICES.identidad)?.view().seasonAge ?? 8;
  const propia = categoriaDeEdad(categoriasDe(ctx, cfg), edad);
  const s = ctx.state<EstadoBaseDeDeporte>();
  const sup = categoriaSuperior(categoriasDe(ctx, cfg), propia);
  const superior = !!s.categoriaSuperior && s.categoriaPropia === propia.id && !!sup;
  return { propia, competida: superior ? sup! : propia, superior };
}

/** Nombre visible de una categoría del deporte por su id. */
export const nombreDeCategoria = (ctx: ReadContext, cfg: ConfigDeporte, id: string): string => categoriasDe(ctx, cfg).find((c) => c.id === id)?.nombre ?? id;

/**
 * Aceptar competir en la categoría superior (`<deporte>.subir_categoria`) y volver a la propia (`<deporte>.volver_categoria`).
 * Cuándo se puede subir lo decide cada deporte (`puedeSubir`): en uno individual, por puestos; en uno de equipo, por otra cosa.
 */
export function accionesDeCategoria(cfg: ConfigDeporte, puedeSubir: (ctx: ReadContext) => true | string): ActionDef[] {
  return [
    {
      id: `${cfg.id}.subir_categoria`,
      name: 'Aceptar competir en la categoría superior',
      description: 'Tu entrenador propone que compitas con los mayores si destacas mucho en tu categoría y puedes ser competitivo. Contra rivales más fuertes se aprende más.',
      tags: [cfg.id],
      group: 'Competición',
      duration: 15,
      available: puedeSubir,
      run: (ctx) => {
        const { propia } = categoriaDelJugador(ctx, cfg);
        const sup = categoriaSuperior(categoriasDe(ctx, cfg), propia)!;
        ctx.updateState<EstadoBaseDeDeporte>((s) => ({ ...s, categoriaSuperior: true, categoriaPropia: propia.id }));
        ctx.log(`Tu entrenador te propone competir en ${sup.nombre}, aunque te toca ${propia.nombre}. Aceptas.`, 'logro');
      },
    },
    {
      id: `${cfg.id}.volver_categoria`,
      name: 'Volver a competir en tu categoría',
      tags: [cfg.id],
      group: 'Competición',
      duration: 15,
      available: (ctx) => (categoriaDelJugador(ctx, cfg).superior ? true : 'Ya compites en tu categoría'),
      run: (ctx) => {
        const { propia } = categoriaDelJugador(ctx, cfg);
        ctx.updateState<EstadoBaseDeDeporte>((s) => ({ ...s, categoriaSuperior: false }));
        ctx.log(`Vuelves a competir en ${propia.nombre}.`);
      },
    },
  ];
}
