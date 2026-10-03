const API_URL = 'http://localhost:3000/api/encuestas';

const navButtons = document.querySelectorAll('.nav-btn');
const pageSections = document.querySelectorAll('.page-section');
const surveyForm = document.getElementById('survey-form');
const surveySuccessMsg = document.getElementById('survey-success-msg');
const btnGoSurvey = document.getElementById('btn-go-survey');

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupFormHandler();
});

/* ==========================================================================
   1. NAVEGACIÓN
   ========================================================================== */
function setupNavigation() {
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => switchSection(btn.dataset.target));
  });

  if (btnGoSurvey) {
    btnGoSurvey.addEventListener('click', () => switchSection('sec-survey'));
  }
}

function switchSection(targetId) {
  navButtons.forEach(b => b.classList.toggle('active', b.dataset.target === targetId));
  pageSections.forEach(s => s.classList.toggle('active', s.id === targetId));
}

/* ==========================================================================
   2. CAPTURA Y ENVÍO ANONIMIZADO DE LA ENCUESTA
   ========================================================================== */
function setupFormHandler() {
  if (!surveyForm) return;

  surveyForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Captura de datos anonimizados (Cumpliendo Observaciones 1 y 2)
    const payload = {
      age: parseInt(document.getElementById('age').value, 10),
      dailyHours: document.getElementById('dailyHours').value,
      p1: document.getElementById('p1').value,
      p2: document.getElementById('p2').value,
      p3: document.getElementById('p3').value,
      p4: document.getElementById('p4').value,
      p5: document.getElementById('p5').value,
      p6: document.getElementById('p6').value,
      p7: document.getElementById('p7').value, // Pregunta 7 actualizada
      p8: document.getElementById('p8').value
    };

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // Oculta el formulario y muestra mensaje de éxito anónimo (Cumpliendo Observación 4)
        surveyForm.reset();
        surveyForm.classList.add('hidden');
        if (surveySuccessMsg) {
          surveySuccessMsg.classList.remove('hidden');
        }
      } else {
        alert('Error al guardar la encuesta en el servidor. Inténtalo nuevamente.');
      }
    } catch (err) {
      console.error('Error de conexión:', err);
      alert('No se pudo conectar con el servidor backend.');
    }
  });
}