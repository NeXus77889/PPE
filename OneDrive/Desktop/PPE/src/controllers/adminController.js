/**
 * @fileoverview Controlador del panel administrativo.
 * @module controllers/adminController
 * @author Equipo PPE Robótica
 * @copyright (c) 2026 Equipo PPE Robótica. Todos los derechos reservados.
 * @license MIT
 */

const { crearToken, verificarPassword, revocarToken, extraerToken } = require('../middlewares/auth');
const {
  obtenerTodasLasEncuestas,
  eliminarEncuestaPorId,
  eliminarTodasLasEncuestas,
} = require('../services/encuestasService');

/**
 * Autentica al administrador y emite un token de sesión seguro.
 */
function login(req, res) {
  const { password } = req.body || {};

  // timingSafeEqual en verificarPassword pq previene timing attacks
  if (typeof password === 'string' && verificarPassword(password)) {
    const token = crearToken();
    return res.json({ success: true, token, message: 'Autenticación exitosa.' });
  }

  return res.status(401).json({ success: false, error: 'Contraseña incorrecta.' });
}

/**
 * Cierra la sesión activa revocando el token de memoria.
 */
function logout(req, res) {
  const token = extraerToken(req);
  revocarToken(token);
  return res.json({ success: true, message: 'Sesión finalizada.' });
}

/**
 * Obtiene todas las encuestas para el dashboard.
 */
async function listarEncuestas(req, res) {
  try {
    const encuestas = await obtenerTodasLasEncuestas();
    return res.json({ success: true, total: encuestas.length, encuestas });
  } catch (error) {
    console.error('❌ Error al listar encuestas:', error.message);
    return res.status(500).json({ success: false, error: 'Error al consultar encuestas.' });
  }
}

/**
 * Elimina una encuesta por su id.
 * Distingue entre: id inválido (400), no encontrado (404) y error interno (500).
 */
async function eliminarEncuesta(req, res) {
  // Number() convierte el string del param a número pq req.params siempre es string
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, error: 'ID no válido.' });
  }

  try {
    const eliminada = await eliminarEncuestaPorId(id);

    if (!eliminada) {
      return res.status(404).json({ success: false, error: 'Registro no encontrado o ya eliminado.' });
    }

    return res.json({ success: true, message: `Registro #${id} eliminado correctamente.` });
  } catch (error) {
    console.error('❌ Error al eliminar encuesta:', error.message);
    return res.status(500).json({ success: false, error: 'Error interno al eliminar el registro.' });
  }
}

/**
 * Elimina TODAS las encuestas (limpieza de datos de prueba).
 * Requiere confirmación explícita desde el cliente.
 */
async function limpiarEncuestas(req, res) {
  // Exigimos que el cliente mande confirmacion:'CONFIRMAR' pq es operación destructiva
  const { confirmacion } = req.body || {};

  if (confirmacion !== 'CONFIRMAR') {
    return res.status(400).json({
      success: false,
      error: 'Debes enviar { "confirmacion": "CONFIRMAR" } para ejecutar esta operación.'
    });
  }

  try {
    await eliminarTodasLasEncuestas();
    return res.json({ success: true, message: 'Todos los registros de encuesta fueron eliminados.' });
  } catch (error) {
    console.error('❌ Error al limpiar encuestas:', error.message);
    return res.status(500).json({ success: false, error: 'Error interno al limpiar los registros.' });
  }
}

module.exports = {
  login,
  logout,
  listarEncuestas,
  eliminarEncuesta,
  limpiarEncuestas,
};
