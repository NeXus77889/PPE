/**
 * @fileoverview Middleware y utilidades criptográficas para autenticación de administrador.
 * Manejo de sesiones en memoria y validación resistente a ataques de temporización.
 * @module middlewares/auth
 */

const crypto = require('crypto');
const { ADMIN_PASSWORD } = require('../config/env');

// Mapa de sesiones en memoria: token -> timestamp expiración
const sesionesAdmin = new Map();
const DURACION_SESION_MS = 2 * 60 * 60 * 1000; // 2 horas de validez

/**
 * Genera un token criptográfico seguro y registra la sesión de administrador.
 * @returns {string} Token hexadecimal seguro de 32 bytes
 */
function crearToken() {
  const token = crypto.randomBytes(32).toString('hex');
  sesionesAdmin.set(token, Date.now() + DURACION_SESION_MS);
  return token;
}

/**
 * Compara la contraseña enviada con la contraseña de administrador usando sha256 y timingSafeEqual.
 * @param {string} intento - Contraseña ingresada por el usuario
 * @returns {boolean} True si coincide exactamente
 */
function verificarPassword(intento) {
  if (typeof intento !== 'string') return false;
  const hashIntento = crypto.createHash('sha256').update(String(intento)).digest();
  const hashReal = crypto.createHash('sha256').update(String(ADMIN_PASSWORD)).digest();
  return crypto.timingSafeEqual(hashIntento, hashReal);
}

/**
 * Extrae el token Bearer del encabezado Authorization.
 * @param {import('express').Request} req
 * @returns {string} Token extraído o cadena vacía
 */
function extraerToken(req) {
  return (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
}

/**
 * Revoca el token de sesión actual.
 * @param {string} token
 */
function revocarToken(token) {
  if (token) sesionesAdmin.delete(token);
}

/**
 * Middleware para restringir rutas privadas de administración.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function requireAdmin(req, res, next) {
  const token = extraerToken(req);
  const expira = sesionesAdmin.get(token);

  if (!token || !expira || expira < Date.now()) {
    if (token) sesionesAdmin.delete(token);
    return res.status(401).json({
      success: false,
      error: 'Sesión no válida o expirada. Por favor, inicia sesión nuevamente.'
    });
  }

  // Renueva ventana de actividad si está activo
  sesionesAdmin.set(token, Date.now() + DURACION_SESION_MS);
  req.adminToken = token;
  next();
}

module.exports = {
  crearToken,
  verificarPassword,
  extraerToken,
  revocarToken,
  requireAdmin
};
