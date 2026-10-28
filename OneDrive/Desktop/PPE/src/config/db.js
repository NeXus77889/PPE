/**
 * @file db.js
 * @author Samuel Bazurto Proaño
 * @copyright (c) 2026 Samuel Bazurto Proaño.
 * @license MIT
 */
/**
 * @fileoverview Configuración y conexión con la base de datos MySQL mediante pool promise-based.
 * Cumple con la regla de oro: trabaja con el esquema existente sin modificar tablas.
 * @module config/db
 */

const mysql = require('mysql2');
const { DB } = require('./env');

const pool = mysql.createPool({
  host: DB.host,
  user: DB.user,
  password: DB.password,
  database: DB.database,
  port: DB.port || 13409,
  ssl: {
    rejectUnauthorized: false
  },
  waitForConnections: DB.waitForConnections,
  connectionLimit: DB.connectionLimit,
  queueLimit: DB.queueLimit
});

const dbp = pool.promise();

// Verificación inicial de conectividad y existencia de la tabla respuestas_encuesta
(async () => {
  try {
    await dbp.query(
      'SELECT edad, daily_hours, p1, p2, p3, p4, p5, p6, p7, p8, fecha_registro FROM respuestas_encuesta LIMIT 1'
    );
    console.log('✅ [MySQL] Conexión establecida con éxito y tabla respuestas_encuesta validada.');
  } catch (err) {
    console.warn('⚠️ [MySQL] Aviso de conexión:', err.message);
    console.warn('   Asegúrate de que el servicio MySQL esté activo y la base de datos encuestas_db disponible.');
  }
})();

module.exports = dbp;