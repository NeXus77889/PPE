/**
 * @file env.js
 * @author Equipo PPE Robótica
 * @copyright (c) 2026 Equipo PPE Robótica. Todos los derechos reservados.
 * @license MIT
 */
/**
 * @fileoverview Carga y centralización de variables de entorno del sistema.
 * Lee de forma segura el archivo .env si existe en la raíz del proyecto.
 * @module config/env
 */

const fs = require('fs');
const path = require('path');

(function cargarEnv() {
  const ruta = path.join(__dirname, '..', '..', '.env');
  if (!fs.existsSync(ruta)) return;

  try {
    const contenido = fs.readFileSync(ruta, 'utf8');
    contenido
      .replace(/^\uFEFF/, '') // Eliminar BOM si existe
      .split(/\r?\n/)
      .forEach((linea) => {
        const l = linea.trim();
        if (!l || l.startsWith('#')) return;
        const i = l.indexOf('=');
        if (i === -1) return;
        const clave = l.slice(0, i).trim();
        let valor = l.slice(i + 1).trim();

        if (
          (valor.startsWith('"') && valor.endsWith('"')) ||
          (valor.startsWith("'") && valor.endsWith("'"))
        ) {
          valor = valor.slice(1, -1);
        }

        if (process.env[clave] === undefined) {
          process.env[clave] = valor;
        }
      });
  } catch (error) {
    console.warn('⚠️ No se pudo procesar el archivo .env:', error.message);
  }
})();

module.exports = {
  PORT: process.env.PORT || 3000,
  ADMIN_PASSWORD: process.env.ADMIN_PASS || 'admin123',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  DB: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '0000',
    database: process.env.DB_NAME || 'encuestas_db',
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0
  }
};
