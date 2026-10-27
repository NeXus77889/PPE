/**
 * @fileoverview Limitador de tasa de peticiones (Rate Limiter) en memoria por dirección IP.
 * Previene ataques de denegación de servicio (DoS), fuerza bruta y sobreconsumo de cuota en IA.
 * @module middlewares/rateLimiter
 */

/**
 * Crea un middleware de limitación de solicitudes.
 * @param {number} max - Cantidad máxima de solicitudes permitidas en la ventana
 * @param {number} ventanaMs - Duración de la ventana en milisegundos
 * @param {string} [mensajePersonalizado] - Mensaje de error retornado si se excede el límite
 * @returns {import('express').RequestHandler}
 */
function rateLimiter(max, ventanaMs, mensajePersonalizado) {
  const registros = new Map();

  // Limpieza periódica de registros antiguos
  setInterval(() => {
    const ahora = Date.now();
    for (const [ip, r] of registros) {
      if (r.reinicio < ahora) registros.delete(ip);
    }
  }, ventanaMs).unref();

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const ahora = Date.now();
    const registro = registros.get(ip);

    if (!registro || registro.reinicio < ahora) {
      registros.set(ip, { cuenta: 1, reinicio: ahora + ventanaMs });
      return next();
    }

    registro.cuenta++;
    if (registro.cuenta > max) {
      const tiempoEsperaSegundos = Math.ceil((registro.reinicio - ahora) / 1000);
      return res.status(429).json({
        success: false,
        error:
          mensajePersonalizado ||
          `Demasiadas solicitudes. Por favor, espera ${tiempoEsperaSegundos} segundos antes de intentar de nuevo.`
      });
    }

    next();
  };
}

module.exports = rateLimiter;
