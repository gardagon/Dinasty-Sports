/**
 * KIT DE DEPORTE (`@ds/kit-deporte`): las piezas que necesita cualquier deporte con club y entrenador, para no escribirlas
 * en cada deporte. No es un módulo ni tiene estado: cada deporte las monta con su configuración (`ConfigDeporte`) y el kit
 * trabaja con el estado de ese deporte (`EstadoBaseDeDeporte`). Solo importa `@ds/contracts`; los módulos de deporte pueden
 * importar `@ds/contracts` y este kit (lo vigila `tests/arquitectura.test.ts`).
 */
export * from './tipos';
export * from './habilidades';
export * from './club';
export * from './categorias';
export * from './comunes';
export * from './tablas';
