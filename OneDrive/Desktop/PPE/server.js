const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/* ==========================================================================
   0. CONFIGURACIÓN (lee el archivo .env si existe)
   ========================================================================== */
(function cargarEnv() {
  const ruta = path.join(__dirname, '.env');
  if (!fs.existsSync(ruta)) return;
  fs.readFileSync(ruta, 'utf8')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .forEach((linea) => {
      const l = linea.trim();
      if (!l || l.startsWith('#')) return;
      const i = l.indexOf('=');
      if (i === -1) return;
      const clave = l.slice(0, i).trim();
      let valor = l.slice(i + 1).trim();
      if (
        (valor.startsWith('"') && valor.endsWith('"')) ||
        (valor.startsWith("'") && valor.endsWith("'"))
      ) {
        valor = valor.slice(1, -1);
      }
      if (process.env[clave] === undefined) process.env[clave] = valor;
    });
})();

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASS || 'admin123';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Se prueba el primero y, si Google responde que no existe / no hay acceso / no hay cupo, se prueba el siguiente.
const MODELOS_GEMINI = [
  ...new Set([
    process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-flash-latest'
  ])
];

const SYSTEM_PROMPT = `Eres Byte (junto a Sincro), un asistente conversacional reflexivo para adolescentes en un proyecto de PPE sobre bienestar digital.
Tu objetivo es escuchar al usuario sobre cómo usa su teléfono, hacerle preguntas reflexivas y ayudarlo a tomar conciencia de su tiempo en pantalla.
Mantén tus respuestas cortas (2 a 3 oraciones máximo), cercanas, sin sermones ni lenguaje corporativo. No uses formato markdown (nada de asteriscos ni listas). Termina siempre con una pregunta reflexiva para seguir conversando.`;

const app = express();
app.use(cors());
app.use(express.json({ limit: '20kb' }));

/* ==========================================================================
   1. BASE DE DATOS
   ========================================================================== */
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '0000',
  database: process.env.DB_NAME || 'encuestas_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
const dbp = db.promise();

(async () => {
  try {
    await dbp.query('SELECT edad, daily_hours, p1, p2, p3, p4, p5, p6, p7, p8, fecha_registro FROM respuestas_encuesta LIMIT 1');
    console.log('✅ Conexión exitosa a MySQL y tabla respuestas_encuesta correcta');
  } catch (err) {
    console.error('❌ Problema con MySQL:', err.message);
    console.error('   👉 Ejecuta el archivo PPE.sql en MySQL para crear la tabla con las columnas correctas.');
  }
})();

if (!GEMINI_API_KEY) {
  console.warn('⚠️  Falta GEMINI_API_KEY: el chat de Byte no funcionará. Créala en .env (mira .env.example).');
}
if (ADMIN_PASSWORD === 'admin123') {
  console.warn('⚠️  Estás usando la contraseña admin por defecto. Cámbiala con ADMIN_PASS en .env.');
}

/* ==========================================================================
   2. UTILIDADES (límite de solicitudes y sesiones de administrador)
   ========================================================================== */
function limitar(max, ventanaMs) {
  const registros = new Map();
  setInterval(() => {
    const ahora = Date.now();
    for (const [ip, r] of registros) if (r.reinicio < ahora) registros.delete(ip);
  }, ventanaMs).unref();

  return (req, res, next) => {
    const ahora = Date.now();
    const r = registros.get(req.ip);
    if (!r || r.reinicio < ahora) {
      registros.set(req.ip, { cuenta: 1, reinicio: ahora + ventanaMs });
      return next();
    }
    r.cuenta++;
    if (r.cuenta > max) {
      return res.status(429).json({ error: 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.' });
    }
    next();
  };
}

const sesionesAdmin = new Map(); // token -> fecha de expiración

function crearToken() {
  const token = crypto.randomBytes(24).toString('hex');
  sesionesAdmin.set(token, Date.now() + 2 * 60 * 60 * 1000); // 2 horas
  return token;
}

function claveCorrecta(intento) {
  const a = crypto.createHash('sha256').update(String(intento)).digest();
  const b = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

function tokenDe(req) {
  return (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
}

function requireAdmin(req, res, next) {
  const token = tokenDe(req);
  const expira = sesionesAdmin.get(token);
  if (!expira || expira < Date.now()) {
    sesionesAdmin.delete(token);
    return res.status(401).json({ success: false, message: 'Sesión no válida o expirada' });
  }
  next();
}

/* ==========================================================================
   3. ARCHIVOS DEL SITIO (solo los públicos; así nadie puede descargar server.js ni .env)
   ========================================================================== */
const ARCHIVOS_PUBLICOS = ['index.html', 'admin.html', 'script.js', 'admin.js', 'styles.css', 'byte1.jfif'];

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
ARCHIVOS_PUBLICOS.forEach((archivo) => {
  app.get('/' + archivo, (req, res) => res.sendFile(path.join(__dirname, archivo)));
});

/* ==========================================================================
   4. GUARDAR ENCUESTA (público y anónimo)
   ========================================================================== */
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

app.post('/api/encuestas', async (req, res) => {
  const d = req.body || {};
  const edad = Number(d.age);

  if (!Number.isInteger(edad) || edad < 10 || edad > 25) {
    return res.status(400).json({ error: 'La edad debe estar entre 10 y 25 años.' });
  }
  for (const [campo, validos] of Object.entries(OPCIONES_VALIDAS)) {
    if (!validos.includes(d[campo])) {
      return res.status(400).json({ error: `Respuesta no válida en "${campo}".` });
    }
  }

  const sql = `
    INSERT INTO respuestas_encuesta
    (edad, daily_hours, p1, p2, p3, p4, p5, p6, p7, p8)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const valores = [edad, d.dailyHours, d.p1, d.p2, d.p3, d.p4, d.p5, d.p6, d.p7, d.p8];

  try {
    await dbp.query(sql, valores);
    res.json({ success: true, message: 'Encuesta guardada anónimamente' });
  } catch (err) {
    console.error('❌ Error en INSERT:', err.message);
    res.status(500).json({ error: 'No se pudo guardar la encuesta en la base de datos.' });
  }
});

/* ==========================================================================
   5. PANEL ADMIN (login con token; consultar y eliminar requieren token)
   ========================================================================== */
app.post('/api/admin/login', limitar(15, 15 * 60 * 1000), (req, res) => {
  const { password } = req.body || {};
  if (typeof password === 'string' && claveCorrecta(password)) {
    return res.json({ success: true, token: crearToken() });
  }
  res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
});

app.post('/api/admin/logout', (req, res) => {
  sesionesAdmin.delete(tokenDe(req));
  res.json({ success: true });
});

app.get('/api/admin/encuestas', requireAdmin, async (req, res) => {
  const sql = `
    SELECT
      id,
      edad AS age,
      daily_hours,
      p1, p2, p3, p4, p5, p6, p7, p8,
      DATE_FORMAT(fecha_registro, '%d/%m/%Y %H:%i') AS createdAt
    FROM respuestas_encuesta
    ORDER BY fecha_registro DESC, id DESC
  `;
  try {
    const [filas] = await dbp.query(sql);
    res.json({ success: true, encuestas: filas });
  } catch (err) {
    console.error('❌ Error en SELECT:', err.message);
    res.status(500).json({ error: 'No se pudieron leer las encuestas.' });
  }
});

app.delete('/api/admin/eliminar/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID no válido' });

  try {
    await dbp.query('DELETE FROM respuestas_encuesta WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error en DELETE:', err.message);
    res.status(500).json({ error: 'No se pudo eliminar el registro.' });
  }
});

/* ==========================================================================
   6. CHAT CON GEMINI (la clave vive solo aquí, en el servidor)
   ========================================================================== */
function limpiarHistorial(h) {
  if (!Array.isArray(h)) return [];
  const limpio = h
    .slice(-20)
    .map((m) => ({
      role: m && m.role === 'model' ? 'model' : 'user',
      parts: [{ text: String((m && m.parts && m.parts[0] && m.parts[0].text) || '').slice(0, 1000) }]
    }))
    .filter((m) => m.parts[0].text.trim());

  // Gemini exige que la conversación empiece y termine con un mensaje del usuario
  while (limpio.length && limpio[0].role !== 'user') limpio.shift();
  while (limpio.length && limpio[limpio.length - 1].role !== 'user') limpio.pop();
  return limpio;
}

async function llamarGemini(historial) {
  let ultimo = { status: 500, mensaje: 'Error desconocido' };

  for (const modelo of MODELOS_GEMINI) {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: historial
        }),
        signal: AbortSignal.timeout(20000)
      }
    );
    const data = await r.json().catch(() => ({}));

    if (r.ok) {
      const partes = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
      const texto = partes.map((p) => p.text || '').join('').trim();
      return texto || 'No pude responder eso. ¿Me lo cuentas de otra forma?';
    }

    ultimo = { status: r.status, mensaje: (data.error && data.error.message) || `HTTP ${r.status}` };
    console.error(`❌ Gemini (${modelo}) respondió ${r.status}: ${ultimo.mensaje}`);

    // Solo probamos otro modelo si este no existe, no hay acceso, no hay cupo o está saturado
    if (![403, 404, 429, 503].includes(r.status)) break;
  }

  const err = new Error(ultimo.mensaje);
  err.status = ultimo.status;
  throw err;
}

app.post('/api/chat', limitar(60, 60 * 1000), async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'El chat no está configurado en el servidor (falta GEMINI_API_KEY).' });
  }

  const historial = limpiarHistorial(req.body && req.body.history);
  if (!historial.length) {
    return res.status(400).json({ error: 'Mensaje vacío o no válido.' });
  }

  try {
    const text = await llamarGemini(historial);
    res.json({ text });
  } catch (err) {
    console.error('❌ Error en /api/chat:', err.message);
    const error =
      err.status === 429
        ? 'Byte está recibiendo muchas preguntas. Intenta de nuevo en un minuto.'
        : 'Byte no pudo responder en este momento.';
    res.status(502).json({ error, detalle: err.message });
  }
});

/* ==========================================================================
   7. MANEJO DE ERRORES Y ARRANQUE
   ========================================================================== */
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({ error: 'Solicitud no válida.' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`   Modelos de Gemini a probar (en orden): ${MODELOS_GEMINI.join(', ')}`);
});
