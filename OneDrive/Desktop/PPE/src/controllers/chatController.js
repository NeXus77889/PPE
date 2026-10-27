/**
 * @fileoverview Controlador para el chat conversacional con el agente de IA Byte.
 * @module controllers/chatController
 */

const { generarRespuestaByte, limpiarHistorial } = require('../services/geminiService');

/**
 * Procesa el mensaje del usuario y obtiene respuesta empática de Byte.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function chatearConByte(req, res) {
  const historialCrudo = req.body && req.body.history;
  const historial = limpiarHistorial(historialCrudo);

  if (!historial.length) {
    return res.status(400).json({
      success: false,
      error: 'Mensaje no válido o vacío. Por favor escribe una consulta para Byte.'
    });
  }

  try {
    const respuesta = await generarRespuestaByte(historial);
    return res.json({
      success: true,
      text: respuesta
    });
  } catch (error) {
    console.error('❌ Error en chatearConByte:', error.message);

    const mensajeCliente =
      error.status === 429
        ? 'Byte está recibiendo muchas consultas en este momento. Inténtalo de nuevo en unos segundos.'
        : 'Byte no pudo responder en este momento. Intenta reformular tu pregunta.';

    return res.status(error.status || 502).json({
      success: false,
      error: mensajeCliente,
      detalle: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

module.exports = {
  chatearConByte
};
