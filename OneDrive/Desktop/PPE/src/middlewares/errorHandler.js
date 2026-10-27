/**
 * @fileoverview Middleware centralizado para captura y formateo de errores en Express.
 * @module middlewares/errorHandler
 */

/**
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function errorHandler(err, req, res, next) {
  console.error('❌ [Error Inesperado]:', err.stack || err.message);

  const status = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Ocurrió un error en el servidor. Inténtalo más tarde.'
      : err.message || 'Error interno del servidor';

  res.status(status).json({
    success: false,
    error: message
  });
}

module.exports = errorHandler;
