const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Clave del Administrador fija en el servidor
const ADMIN_PASSWORD = process.env.ADMIN_PASS || 'admin123';

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '0000',
  database: 'encuestas_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Error conectando a MySQL:', err.message);
  } else {
    console.log('✅ Conexión exitosa a MySQL (encuestas_db)');
    connection.release();
  }
});

/* ==========================================================================
   1. GUARDAR ENCUESTA (Público - Anónimo)
   ========================================================================== */
app.post('/api/encuestas', (req, res) => {
  const { age, dailyHours, p1, p2, p3, p4, p5, p6, p7, p8 } = req.body;

  const sql = `
    INSERT INTO respuestas_encuesta 
    (edad, daily_hours, p1, p2, p3, p4, p5, p6, p7, p8) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [age, dailyHours, p1, p2, p3, p4, p5, p6, p7, p8];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('❌ Error en INSERT:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, message: 'Encuesta guardada anónimamente' });
  });
});

/* ==========================================================================
   2. LOGIN ADMIN Y OBTENER DATOS (Protegido para admin.html)
   ========================================================================== */
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;

  if (password === ADMIN_PASSWORD) {
    const sql = `
      SELECT 
        id,
        edad AS age,
        daily_hours,
        p1, p2, p3, p4, p5, p6, p7, p8,
        DATE_FORMAT(fecha_registro, '%d/%m/%Y %H:%i') AS createdAt
      FROM respuestas_encuesta 
      ORDER BY fecha_registro DESC
    `;

    db.query(sql, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, encuestas: results });
    });
  } else {
    res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
  }
});

/* ==========================================================================
   3. ELIMINAR REGISTRO (Protegido para admin.html)
   ========================================================================== */
app.delete('/api/admin/eliminar/:id', (req, res) => {
  const { id } = req.params;

  db.query('DELETE FROM respuestas_encuesta WHERE id = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});