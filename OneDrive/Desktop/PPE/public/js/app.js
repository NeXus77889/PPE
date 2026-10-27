/**
 * @fileoverview Controlador de navegación entre pestañas del portal principal.
 * @module public/js/app
 */

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
});

/**
 * Configura la navegación suave entre las pestañas principales (Inicio, Asistente IA, Encuesta).
 */
function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const pageSections = document.querySelectorAll('.page-section');
  const btnGoSurvey = document.getElementById('btn-go-survey');
  const btnHomeChat = document.getElementById('btn-home-chat');

  navButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.dataset.target;
      if (targetId) switchSection(targetId);
    });
  });

  if (btnGoSurvey) {
    btnGoSurvey.addEventListener('click', (e) => {
      e.preventDefault();
      switchSection('sec-survey');
    });
  }

  if (btnHomeChat) {
    btnHomeChat.addEventListener('click', (e) => {
      e.preventDefault();
      switchSection('sec-chat');
    });
  }

  // Soporte universal para cualquier botón con clase .btn-byte-chat
  document.querySelectorAll('.btn-byte-chat').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      switchSection('sec-chat');
    });
  });

  window.switchSection = switchSection;
}

/**
 * Cambia la sección activa y actualiza los botones de navegación.
 * @param {string} targetId - ID de la sección objetivo
 */
function switchSection(targetId) {
  const navButtons = document.querySelectorAll('.nav-btn');
  const pageSections = document.querySelectorAll('.page-section');

  navButtons.forEach((b) => {
    b.classList.toggle('active', b.dataset.target === targetId);
  });

  pageSections.forEach((s) => {
    const isTarget = s.id === targetId;
    s.classList.toggle('active', isTarget);
    if (isTarget) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  // Si se abre el chat, enfocamos el campo de entrada
  if (targetId === 'sec-chat') {
    setTimeout(() => {
      const input = document.getElementById('user-input');
      if (input) input.focus();
    }, 150);
  }
}
