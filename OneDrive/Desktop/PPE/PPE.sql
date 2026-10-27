-- Crea la base de datos si no existe
CREATE DATABASE IF NOT EXISTS encuestas_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE encuestas_db;

-- Elimina la tabla anterior si existe para evitar conflictos de esquema
DROP TABLE IF EXISTS respuestas_encuesta;

-- Tabla de respuestas de encuesta compatible con el backend Node.js
CREATE TABLE respuestas_encuesta (
  id             INT         AUTO_INCREMENT PRIMARY KEY,
  edad           TINYINT     NOT NULL,
  daily_hours    VARCHAR(40) NOT NULL,
  p1             VARCHAR(20) NOT NULL,
  p2             VARCHAR(20) NOT NULL,
  p3             VARCHAR(20) NOT NULL,
  p4             VARCHAR(20) NOT NULL,
  p5             VARCHAR(20) NOT NULL,
  p6             VARCHAR(20) NOT NULL,
  p7             VARCHAR(20) NOT NULL,
  p8             VARCHAR(20) NOT NULL,
  fecha_registro TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;