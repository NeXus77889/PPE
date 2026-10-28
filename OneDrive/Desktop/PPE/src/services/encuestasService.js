/**
 * @fileoverview Servicio de persistencia y consultas para encuestas.
 * @module services/encuestasService
 * @author Samuel Bazurto Proaño
 * @copyright (c) 2026 Samuel Bazurto Proaño.
 * @license MIT
 */

const dbp = require('../config/db');

/**
 * Inserta un registro anónimo de encuesta.
 * @param {Object} encuesta
 * @returns {Promise<{id: number}>}
 */
async function guardarEncuesta(encuesta) {
  // Inserción con prepared statement pq evita inyección SQL
  const sql = `
    INSERT INTO respuestas_encuesta
      (edad, daily_hours, p1, p2, p3, p4, p5, p6, p7, p8)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const valores = [
    encuesta.edad,
    encuesta.daily_hours,
    encuesta.p1,
    encuesta.p2,
    encuesta.p3,
    encuesta.p4,
    encuesta.p5,
    encuesta.p6,
    encuesta.p7,
    encuesta.p8,
  ];
  const [resultado] = await dbp.query(sql, valores);
  return { id: resultado.insertId };
}

/**
 * Obtiene todas las encuestas ordenadas de más nueva a más antigua.
 * @returns {Promise<Array<Object>>}
 */
async function obtenerTodasLasEncuestas() {
  // Alias edad->age para compatibilidad con el frontend pq el panel usa "age"
  const sql = `
    SELECT
      id,
      edad       AS age,
      daily_hours,
      p1, p2, p3, p4, p5, p6, p7, p8,
      DATE_FORMAT(fecha_registro, '%d/%m/%Y %H:%i') AS createdAt
    FROM respuestas_encuesta
    ORDER BY fecha_registro DESC, id DESC
  `;
  const [filas] = await dbp.query(sql);
  return filas;
}

/**
 * Elimina una encuesta individual por su id.
 * @param {number} id
 * @returns {Promise<boolean>} true si se eliminó, false si no existía
 */
async function eliminarEncuestaPorId(id) {
  // Usamos prepared statement pq previene inyecciones SQL
  const [resultado] = await dbp.query(
    'DELETE FROM respuestas_encuesta WHERE id = ?',
    [id]
  );
  console.log(`🗑️  [Service] eliminarEncuestaPorId(${id}) → affectedRows: ${resultado.affectedRows}`);
  return resultado.affectedRows > 0;
}

/**
 * Elimina TODAS las encuestas de la tabla (limpieza de prueba).
 * @returns {Promise<number>} Cantidad de registros eliminados
 */
async function eliminarTodasLasEncuestas() {
  // TRUNCATE es más rápido que DELETE pq reinicia el auto_increment
  await dbp.query('TRUNCATE TABLE respuestas_encuesta');
  console.log('🧹 [Service] eliminarTodasLasEncuestas() → tabla vaciada');
  return true;
}

module.exports = {
  guardarEncuesta,
  obtenerTodasLasEncuestas,
  eliminarEncuestaPorId,
  eliminarTodasLasEncuestas,
};
