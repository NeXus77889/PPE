/**
 * @fileoverview Validación y envío de encuestas sobre hábitos y bienestar digital.
 * Respeta 100% el esquema de campos y columnas de la base de datos existente.
 * @module public/js/survey
 */

const SURVEY_API_URL = '/api/encuestas';

document.addEventListener('DOMContentLoaded', () => {
  setupSurveyHandler();
});

/**
 * Configura el formulario de encuesta y su envío mediante fetch.
 */
function setupSurveyHandler() {
  const surveyForm = document.getElementById('survey-form');
  const surveySuccessMsg = document.getElementById('survey-success-msg');
  const btnNewSurvey = document.getElementById('btn-new-survey');

  if (!surveyForm) return;

  surveyForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = surveyForm.querySelector('button[type="submit"]');

    // Mapeo exacto con los nombres de campos esperados por el controlador y la base de datos
    const payload = {
      age: parseInt(document.getElementById('age').value, 10),
      dailyHours: document.getElementById('dailyHours').value,
      p1: document.getElementById('p1').value,
      p2: document.getElementById('p2').value,
      p3: document.getElementById('p3').value,
      p4: document.getElementById('p4').value,
      p5: document.getElementById('p5').value,
      p6: document.getElementById('p6').value,
      p7: document.getElementById('p7').value,
      p8: document.getElementById('p8').value
    };

    // Validación básica en cliente
    if (isNaN(payload.age) || payload.age < 10 || payload.age > 25) {
      alert('Por favor ingresa una edad válida entre 10 y 25 años.');
      document.getElementById('age').focus();
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando respuestas...';
    }

    try {
      const respuesta = await fetch(SURVEY_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await respuesta.json().catch(() => ({}));

      if (respuesta.ok && data.success) {
        surveyForm.reset();
        surveyForm.classList.add('hidden');
        if (surveySuccessMsg) {
          surveySuccessMsg.classList.remove('hidden');
          surveySuccessMsg.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        alert(data.error || 'No se pudo guardar la encuesta. Inténtalo de nuevo.');
      }
    } catch (error) {
      console.error('Error al enviar la encuesta:', error);
      alert('Error de conexión. Confirma que el servidor de Sincronía Digital esté en línea.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Guardar Encuesta Anónima';
      }
    }
  });

  if (btnNewSurvey) {
    btnNewSurvey.addEventListener('click', () => {
      if (surveySuccessMsg) surveySuccessMsg.classList.add('hidden');
      if (surveyForm) {
        surveyForm.classList.remove('hidden');
        surveyForm.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
}
