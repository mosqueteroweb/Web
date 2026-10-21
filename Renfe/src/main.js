/**
 * InfoTren Renfe - Punto de entrada modular ES6
 * Importa los módulos correspondientes y expone la API pública a window.app
 */

export * from './config.js';
export * from './state.js';
export * from './utils.js';
export * from './api.js';
export * from './map.js';

console.info('InfoTren Renfe: Arquitectura Modular ES6 cargada correctamente.');
