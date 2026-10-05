// Si abres la página desde http://localhost:3000 usa rutas relativas;
// si la abres con Live Server o como archivo, apunta al servidor en el puerto 3000.
const API_BASE = window.location.port === '3000' ? '' : 'http://localhost:3000';
const API_URL = `${API_BASE}/api/encuestas`;
const CHAT_URL = `${API_BASE}/api/chat`;

let chatHistory = [];
let enviando = false;

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupFormHandler();
  setupChatHandler();
});

/* ==========================================================================
   1. NAVEGACIÓN ENTRE PESTAÑAS
   ========================================================================== */
function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const pageSections = document.querySelectorAll('.page-section');
  const btnGoSurvey = document.getElementById('btn-go-survey');

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => switchSection(btn.dataset.target));
  });

  if (btnGoSurvey) {
    btnGoSurvey.addEventListener('click', (e) => {
      e.preventDefault();
      switchSection('sec-survey');
    });
  }

  function switchSection(targetId) {
    navButtons.forEach((b) => b.classList.toggle('active', b.dataset.target === targetId));
    pageSections.forEach((s) => s.classList.toggle('active', s.id === targetId));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/* ==========================================================================
   2. ENVÍO DE ENCUESTA AL BACKEND
   ========================================================================== */
function setupFormHandler() {
  const surveyForm = document.getElementById('survey-form');
  const surveySuccessMsg = document.getElementById('survey-success-msg');

  if (!surveyForm) return;

  surveyForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = surveyForm.querySelector('button[type="submit"]');
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

    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        surveyForm.reset();
        surveyForm.classList.add('hidden');
        if (surveySuccessMsg) surveySuccessMsg.classList.remove('hidden');

        // Tras unos segundos se vuelve a mostrar el formulario para que otra persona pueda responder
        setTimeout(() => {
          if (surveySuccessMsg) surveySuccessMsg.classList.add('hidden');
          surveyForm.classList.remove('hidden');
        }, 6000);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Error al guardar la encuesta en el servidor.');
      }
    } catch (err) {
      console.error('Error de conexión:', err);
      alert('No se pudo conectar con el servidor. Confirma que "node server.js" esté activo.');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

/* ==========================================================================
   3. CHAT CON BYTE (la IA se consulta a través del servidor)
   ========================================================================== */
function setupChatHandler() {
  const sendBtn = document.getElementById('send-btn');
  const userInput = document.getElementById('user-input');

  if (sendBtn && userInput) {
    sendBtn.addEventListener('click', enviarMensaje);
    userInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        enviarMensaje();
      }
    });
  }
}

function historialParaEnviar() {
  const h = chatHistory.slice(-20);
  while (h.length && h[0].role !== 'user') h.shift();
  return h;
}

async function enviarMensaje() {
  if (enviando) return;

  const inputEl = document.getElementById('user-input');
  const sendBtn = document.getElementById('send-btn');
  const chatBox = document.getElementById('chat-box');
  const mensaje = inputEl.value.trim();

  if (!mensaje) return;

  enviando = true;
  if (sendBtn) sendBtn.disabled = true;

  // 1. Mostrar mensaje del usuario
  const userDiv = document.createElement('div');
  userDiv.className = 'user-msg';
  userDiv.textContent = mensaje;
  chatBox.appendChild(userDiv);

  inputEl.value = '';
  chatBox.scrollTop = chatBox.scrollHeight;

  // 2. Guardar en el historial
  chatHistory.push({ role: 'user', parts: [{ text: mensaje }] });

  // 3. Indicador de carga
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'bot-msg';
  loadingDiv.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Byte está pensando...';
  chatBox.appendChild(loadingDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const response = await fetch(CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history: historialParaEnviar() })
    });
    const data = await response.json().catch(() => ({}));

    if (response.ok && data.text) {
      const respuesta = data.text.replace(/\*\*/g, '').trim();
      loadingDiv.textContent = respuesta;
      chatHistory.push({ role: 'model', parts: [{ text: respuesta }] });
    } else {
      console.error('Error del servidor:', data);
      loadingDiv.textContent = data.error || 'Byte no pudo responder. Intenta de nuevo.';
      chatHistory.pop(); // se quita el mensaje del usuario para no romper el orden del historial
    }
  } catch (error) {
    console.error('Error de red:', error);
    loadingDiv.textContent = 'No se pudo conectar con el servidor. Confirma que "node server.js" esté activo.';
    chatHistory.pop();
  } finally {
    enviando = false;
    if (sendBtn) sendBtn.disabled = false;
    chatBox.scrollTop = chatBox.scrollHeight;
    inputEl.focus();
  }
}
