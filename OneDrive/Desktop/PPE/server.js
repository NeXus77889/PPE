const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

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

// Guardar encuesta
app.post('/api/encuestas', (req, res) => {
  const { fullName, course, dailyHours, p1, p2, p3, p4, p5, p6, p7, p8 } = req.body;

  const sql = `
    INSERT INTO respuestas_encuesta 
    (nombre_completo, curso, horas_diarias, p1_uso_diario, p2_frecuencia_revision, p3_uso_antes_dormir, p4_dificultad_dejarlo, p5_conoce_tiempo_pantalla, p6_importancia_momentos_sin_cel, p7_cuidado_emocional, p8_interes_estrategias) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [fullName, course, dailyHours, p1, p2, p3, p4, p5, p6, p7, p8], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, message: 'Encuesta guardada con éxito' });
  });
});

// Obtener encuestas
app.get('/api/encuestas', (req, res) => {
  const sql = `
    SELECT 
      id,
      nombre_completo AS fullName,
      curso AS course,
      horas_diarias AS dailyHours,
      p3_uso_antes_dormir AS p3,
      p4_dificultad_dejarlo AS p4,
      DATE_FORMAT(fecha_registro, '%d/%m/%Y %H:%i') AS createdAt
    FROM respuestas_encuesta 
    ORDER BY fecha_registro DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Eliminar registro
app.delete('/api/encuestas/:id', (req, res) => {
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