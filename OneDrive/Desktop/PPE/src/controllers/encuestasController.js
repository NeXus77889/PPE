/**
 * @fileoverview Controlador para recepción y validación de encuestas públicas.
 * @module controllers/encuestasController
 */

const { guardarEncuesta } = require('../services/encuestasService');

const SI_NO = ['Sí', 'No'];
const SI_AVECES_NO = ['Sí', 'A veces', 'No'];
const SIEMPRE_AVECES_NUNCA = ['Siempre', 'A veces', 'Nunca'];

const OPCIONES_VALIDAS = {
  dailyHours: ['Menos de 2 horas', 'Entre 2 y 4 horas', 'Entre 4 y 6 horas', 'Más de 6 horas'],
  p1: SI_NO,
  p2: SIEMPRE_AVECES_NUNCA,
  p3: SIEMPRE_AVECES_NUNCA,
  p4: SI_AVECES_NO,
  p5: SI_NO,
  p6: SI_NO,
  p7: SI_AVECES_NO,
  p8: SI_NO
};

/**
 * Registra una nueva respuesta de encuesta validando tipado y opciones permitidas.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function registrarEncuesta(req, res, next) {
  try {
    const d = req.body || {};
    const edad = Number(d.age);

    if (!Number.isInteger(edad) || edad < 10 || edad > 25) {
      return res.status(400).json({
        success: false,
        error: 'La edad del estudiante debe ser un número entero entre 10 y 25 años.'
      });
    }

    for (const [campo, validos] of Object.entries(OPCIONES_VALIDAS)) {
      if (!validos.includes(d[campo])) {
        return res.status(400).json({
          success: false,
          error: `Opción no válida seleccionada en el campo "${campo}".`
        });
      }
    }

    const resultado = await guardarEncuesta({
      edad,
      daily_hours: d.dailyHours,
      p1: d.p1,
      p2: d.p2,
      p3: d.p3,
      p4: d.p4,
      p5: d.p5,
      p6: d.p6,
      p7: d.p7,
      p8: d.p8
    });

    return res.status(201).json({
      success: true,
      message: 'Encuesta registrada con éxito de manera anónima y segura.',
      id: resultado.id
    });
  } catch (error) {
    console.error('❌ Error registrando encuesta:', error.message);
    return res.status(500).json({
      success: false,
      error: 'No se pudo guardar la encuesta en la base de datos. Inténtalo de nuevo.'
    });
  }
}

module.exports = {
  registrarEncuesta
};
