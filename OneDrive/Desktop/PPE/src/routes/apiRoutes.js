/**
 * @fileoverview Definición de endpoints de la API REST para Sincronía Digital.
 * @module routes/apiRoutes
 * @author Equipo PPE Robótica
 * @copyright (c) 2026 Equipo PPE Robótica. Todos los derechos reservados.
 * @license MIT
 */

const express = require('express');
const router  = express.Router();

const { registrarEncuesta } = require('../controllers/encuestasController');
const { login, logout, listarEncuestas, eliminarEncuesta, limpiarEncuestas } = require('../controllers/adminController');
const { chatearConByte } = require('../controllers/chatController');

const { requireAdmin } = require('../middlewares/auth');
const rateLimiter      = require('../middlewares/rateLimiter');
const { sanitizarEntrada } = require('../middlewares/security');

// ── Encuestas públicas ────────────────────────────────────────────────────────
router.post(
  '/encuestas',
  rateLimiter(30, 60 * 1000, 'Demasiadas encuestas. Espera un momento.'),
  sanitizarEntrada,
  registrarEncuesta
);

// ── Chat IA ───────────────────────────────────────────────────────────────────
router.post(
  '/chat',
  rateLimiter(60, 60 * 1000, 'Límite de mensajes alcanzado. Espera un minuto.'),
  sanitizarEntrada,
  chatearConByte
);

// ── Admin: login / logout ─────────────────────────────────────────────────────
router.post(
  '/admin/login',
  rateLimiter(15, 15 * 60 * 1000, 'Demasiados intentos de acceso. Espera 15 min.'),
  sanitizarEntrada,
  login
);

router.post('/admin/logout', logout);

// ── Admin: datos ──────────────────────────────────────────────────────────────
router.get('/admin/encuestas', requireAdmin, listarEncuestas);

// Eliminar UNA encuesta por id
router.delete('/admin/eliminar/:id', requireAdmin, eliminarEncuesta);

// Limpiar TODAS las encuestas (requiere body: { confirmacion: "CONFIRMAR" })
router.delete('/admin/limpiar-todo', requireAdmin, sanitizarEntrada, limpiarEncuestas);

module.exports = router;
