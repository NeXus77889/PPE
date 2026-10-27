/**
 * @fileoverview Punto de entrada raíz para compatibilidad con scripts existentes ("node server.js").
 * Redirige la ejecución a la arquitectura modular ubicada en /src.
 */

module.exports = require('./src/server');
