CREATE DATABASE IF NOT EXISTS encuestas_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE encuestas_db;

-- Tabla de Ocupaciones
CREATE TABLE IF NOT EXISTS ocupaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE
);

INSERT INTO ocupaciones (nombre) VALUES 
('Estudiante'), 
('Desarrollador / Programador'), 
('Diseñador UX/UI'), 
('Profesional Independiente'), 
('Otro')
ON DUPLICATE KEY UPDATE nombre=nombre;

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(120) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    edad INT CHECK (edad >= 12 AND edad <= 100),
    ocupacion_id INT,
    FOREIGN KEY (ocupacion_id) REFERENCES ocupaciones(id)
);

-- Tabla de Respuestas
CREATE TABLE IF NOT EXISTS respuestas_encuesta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    satisfaccion TINYINT NOT NULL CHECK (satisfaccion BETWEEN 1 AND 5),
    comentarios TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);