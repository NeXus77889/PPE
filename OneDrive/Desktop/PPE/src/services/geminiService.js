/**
 * @fileoverview Servicio de integración con la API de Google Gemini para el asistente Byte.
 * Implementa un modelo conversacional empático, reflexivo y fluido sobre bienestar digital.
 * @module services/geminiService
 */

const { GEMINI_API_KEY, GEMINI_MODEL } = require('../config/env');

const MODELOS_DISPONIBLES = [
  ...new Set([
    GEMINI_MODEL,
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-flash-latest'
  ])
];

const SYSTEM_PROMPT = `
Eres Byte, un compañero virtual inteligente, empático y reflexivo creado para el proyecto de PPE "Sincronía Digital" (Robótica y Bienestar en Adolescentes).

Tu personalidad y tono:
- Eres cálido, cercano, comprensivo y juvenil. Hablas de tú a tú, sin formalismos corporativos ni discursos moralistas o sermones.
- Comprendes los desafíos reales de los jóvenes: el "scroll" infinito en TikTok o Instagram, las alertas nocturnas, la presión del FOMO (miedo a perderse algo) y la dificultad para concentrarse con tantas notificaciones.

Reglas de conversación esenciales:
1. NO actúes como un formulario o un interrogador rígido. No dispares preguntas mecánicas una tras otra.
2. Si el usuario te cuenta algo sobre sus hábitos, valida primero su experiencia de forma comprensiva (ej. "Te entiendo totalmente, es súper fácil perder la noción del tiempo cuando un video te lleva al siguiente").
3. Si el usuario pide ayuda o reflexiona, comparte micro-consejos prácticos y amigables (ej. modo descanso, alejar el cargador de la cama, o cómo nuestra caja robótica con Jaula de Faraday ayuda a crear una pausa física para el celular).
4. Mantén tus respuestas breves y naturales (entre 2 y 4 oraciones bien hiladas).
5. No uses formatos complejos como tablas ni listas con viñetas largas.
6. Cierra tus intervenciones con una frase reflexiva o una pregunta abierta y genuina que invite a seguir conversando de forma espontánea.
`.trim();

/**
 * Sanitiza y formatea el historial de conversación según las especificaciones de Gemini.
 * @param {Array<{role: string, parts: Array<{text: string}>}>} historial
 * @returns {Array<{role: string, parts: Array<{text: string}>}>}
 */
function limpiarHistorial(historial) {
  if (!Array.isArray(historial)) return [];

  const limpio = historial
    .slice(-20)
    .map((m) => ({
      role: m && m.role === 'model' ? 'model' : 'user',
      parts: [
        {
          text: String(
            (m && m.parts && m.parts[0] && m.parts[0].text) || ''
          ).slice(0, 1000)
        }
      ]
    }))
    .filter((m) => m.parts[0].text.trim().length > 0);

  // Gemini requiere que la secuencia inicie y finalice con un turno del usuario
  while (limpio.length && limpio[0].role !== 'user') limpio.shift();
  while (limpio.length && limpio[limpio.length - 1].role !== 'user') limpio.pop();

  return limpio;
}

/**
 * Realiza la llamada a la API de Gemini con rotación de modelos ante cuotas o saturación.
 * @param {Array<{role: string, parts: Array<{text: string}>}>} historialLimpio
 * @returns {Promise<string>}
 */
async function generarRespuestaByte(historialLimpio) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno.');
  }

  let ultimoError = { status: 500, mensaje: 'Error desconocido al conectar con Gemini' };

  for (const modelo of MODELOS_DISPONIBLES) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: historialLimpio
        }),
        signal: AbortSignal.timeout(18000)
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const partes =
          (data.candidates &&
            data.candidates[0] &&
            data.candidates[0].content &&
            data.candidates[0].content.parts) ||
          [];
        const texto = partes.map((p) => p.text || '').join('').trim();
        return texto || 'Me quedé pensando en lo que dijiste... ¿Me lo cuentas con otras palabras?';
      }

      ultimoError = {
        status: response.status,
        mensaje: (data.error && data.error.message) || `HTTP ${response.status}`
      };

      console.warn(`[Gemini Fallback] Modelo ${modelo} retornó ${response.status}: ${ultimoError.mensaje}`);

      // Solo intentamos con el siguiente modelo si es error de no encontrado, cuota o servicio no disponible
      if (![403, 404, 429, 503].includes(response.status)) {
        break;
      }
    } catch (fetchErr) {
      console.warn(`[Gemini Error] Fallo de red con modelo ${modelo}:`, fetchErr.message);
      ultimoError = { status: 502, mensaje: fetchErr.message };
    }
  }

  const errorFinal = new Error(ultimoError.mensaje);
  errorFinal.status = ultimoError.status;
  throw errorFinal;
}

module.exports = {
  generarRespuestaByte,
  limpiarHistorial
};
