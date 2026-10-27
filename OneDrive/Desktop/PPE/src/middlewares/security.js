/**
 * @fileoverview Sanitización y validación preventiva contra XSS e inyecciones.
 * @module middlewares/security
 */

/**
 * Sanitiza recursivamente cadenas dentro de objetos o arrays para neutralizar etiquetas HTML.
 * @param {any} valor
 * @returns {any}
 */
function limpiarTexto(valor) {
  if (typeof valor === 'string') {
    return valor
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/["']/g, '')
      .trim();
  }
  if (Array.isArray(valor)) {
    return valor.map(limpiarTexto);
  }
  if (valor !== null && typeof valor === 'object') {
    const limpio = {};
    for (const [k, v] of Object.entries(valor)) {
      limpio[k] = limpiarTexto(v);
    }
    return limpio;
  }
  return valor;
}

/**
 * Middleware de Express para sanitizar el cuerpo de la petición.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function sanitizarEntrada(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = limpiarTexto(req.body);
  }
  next();
}

module.exports = {
  limpiarTexto,
  sanitizarEntrada
};
