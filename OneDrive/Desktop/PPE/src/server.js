/**
 * @fileoverview Punto de entrada del servidor HTTP de Sincronía Digital.
 * @module server
 */

const app = require('./app');
const { PORT, GEMINI_API_KEY, ADMIN_PASSWORD } = require('./config/env');

if (!GEMINI_API_KEY) {
  console.warn('⚠️ [Aviso] Falta GEMINI_API_KEY en .env: El chat con Byte operará en modo limitado.');
}
if (ADMIN_PASSWORD === 'admin123') {
  console.warn('⚠️ [Seguridad] Contraseña de admin por defecto en uso. Configura ADMIN_PASS en .env.');
}

const server = app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 Servidor Sincronía Digital en ejecución`);
  console.log(`   ➜ Web Principal:  http://localhost:${PORT}`);
  console.log(`   ➜ Dashboard Admin: http://localhost:${PORT}/admin`);
  console.log(`===================================================`);
});

module.exports = server;
