/**
 * @fileoverview Lógica del asistente conversacional con IA (Byte & Sincro).
 * Maneja historial, peticiones asíncronas, sugerencias rápidas e indicador de escritura.
 * @module public/js/chat
 */

const CHAT_API_URL = '/api/chat';
let chatHistory = [];
let enviandoMensaje = false;

document.addEventListener('DOMContentLoaded', () => {
  setupChatHandlers();
  setupQuickChips();
});

function setupChatHandlers() {
  const sendBtn = document.getElementById('send-btn');
  const userInput = document.getElementById('user-input');

  if (sendBtn && userInput) {
    sendBtn.addEventListener('click', enviarMensaje);
    userInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        enviarMensaje();
      }
    });
  }

  const btnClearChat = document.getElementById('btn-clear-chat');
  if (btnClearChat) {
    btnClearChat.addEventListener('click', reiniciarConversacion);
  }
}

function setupQuickChips() {
  const chips = document.querySelectorAll('.chat-chip');
  const userInput = document.getElementById('user-input');

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const texto = chip.getAttribute('data-prompt') || chip.textContent.trim();
      if (userInput) {
        userInput.value = texto;
        enviarMensaje();
      }
    });
  });
}

function prepararHistorial() {
  const h = chatHistory.slice(-20);
  while (h.length && h[0].role !== 'user') h.shift();
  return h;
}

async function enviarMensaje() {
  if (enviandoMensaje) return;

  const inputEl = document.getElementById('user-input');
  const sendBtn = document.getElementById('send-btn');
  const chatBox = document.getElementById('chat-box');
  if (!inputEl || !chatBox) return;

  const texto = inputEl.value.trim();
  if (!texto) return;

  enviandoMensaje = true;
  if (sendBtn) sendBtn.disabled = true;

  // 1. Mostrar mensaje del usuario
  const userDiv = document.createElement('div');
  userDiv.className = 'user-msg';
  userDiv.textContent = texto;
  chatBox.appendChild(userDiv);

  inputEl.value = '';
  chatBox.scrollTop = chatBox.scrollHeight;

  // 2. Guardar en el historial
  chatHistory.push({ role: 'user', parts: [{ text: texto }] });

  // 3. Indicador animado de espera
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'bot-msg';
  loadingDiv.innerHTML = `
    <span class="typing-dots">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </span>
    Byte está pensando...
  `;
  chatBox.appendChild(loadingDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const respuesta = await fetch(CHAT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history: prepararHistorial() })
    });

    const data = await respuesta.json().catch(() => ({}));
    loadingDiv.remove();

    if (respuesta.ok && data.text) {
      const textoLimpio = data.text.replace(/\*\*/g, '').trim();
      const botDiv = document.createElement('div');
      botDiv.className = 'bot-msg';
      botDiv.textContent = textoLimpio;
      chatBox.appendChild(botDiv);

      chatHistory.push({ role: 'model', parts: [{ text: textoLimpio }] });
    } else {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'bot-msg';
      errorDiv.style.borderLeftColor = '#f87171';
      errorDiv.textContent = data.error || 'Byte no pudo responder en este momento. Inténtalo de nuevo.';
      chatBox.appendChild(errorDiv);
      chatHistory.pop();
    }
  } catch (error) {
    console.error('Error de conexión con el chat:', error);
    loadingDiv.remove();
    const errorDiv = document.createElement('div');
    errorDiv.className = 'bot-msg';
    errorDiv.style.borderLeftColor = '#f87171';
    errorDiv.textContent = 'No se pudo conectar con el servidor. Confirma que el servidor esté activo.';
    chatBox.appendChild(errorDiv);
    chatHistory.pop();
  } finally {
    enviandoMensaje = false;
    if (sendBtn) sendBtn.disabled = false;
    chatBox.scrollTop = chatBox.scrollHeight;
    inputEl.focus();
  }
}

function reiniciarConversacion() {
  chatHistory = [];
  const chatBox = document.getElementById('chat-box');
  if (!chatBox) return;

  chatBox.innerHTML = `
    <div class="bot-msg">
      ¡Hola! Soy <strong>Byte</strong>. ¿Cómo sientes que ha estado tu tiempo en el celular y redes sociales hoy?
    </div>
  `;
}
