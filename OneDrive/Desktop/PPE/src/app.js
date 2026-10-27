/**
 * @fileoverview Configuración principal de la aplicación Express.
 * Implementa cabeceras de seguridad con Helmet, CORS, parser de JSON y servicio estático.
 * @module app
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const apiRoutes = require('./routes/apiRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Configuración de cabeceras de seguridad con Helmet
// Se configuran directivas permisivas para permitir fuentes externas (Google Fonts, FontAwesome, Chart.js)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

app.use(cors());
app.use(express.json({ limit: '25kb' }));
app.use(express.urlencoded({ extended: true, limit: '25kb' }));

// Directorio público principal
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// Rutas API REST
app.use('/api', apiRoutes);

// Vistas amigables y compatibilidad directa
app.get('/admin', (req, res) => {
  res.sendFile(path.join(publicDir, 'admin.html'));
});

// Soporte de compatibilidad con rutas raíz anteriores
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Middleware de manejo de errores
app.use(errorHandler);

module.exports = app;
