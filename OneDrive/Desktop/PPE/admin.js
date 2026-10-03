const API_URL = 'http://localhost:3000/api/admin';

let hoursChart = null;
let moodChart = null;
let autoRefreshInterval = null; // Variable para controlar el temporizador en tiempo real

document.addEventListener('DOMContentLoaded', () => {
  const btnLogin = document.getElementById('btn-login');
  const btnLogout = document.getElementById('btn-logout');

  if (btnLogin) btnLogin.addEventListener('click', handleLogin);
  if (btnLogout) btnLogout.addEventListener('click', handleLogout);
});

async function handleLogin() {
  const passInput = document.getElementById('admin-pass');
  const loginError = document.getElementById('login-error');
  const loginSec = document.getElementById('admin-login-sec');
  const dashboardSec = document.getElementById('admin-dashboard-sec');
  const btnLogout = document.getElementById('btn-logout');

  const password = passInput.value.trim();

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    if (res.ok) {
      const data = await res.json();
      loginError.classList.add('hidden');
      loginSec.classList.add('hidden');
      dashboardSec.classList.remove('hidden');
      btnLogout.classList.remove('hidden');
      
      // 1. Cargar datos iniciales
      renderDashboard(data.encuestas || []);

      // 2. ACTIVAR TIEMPO REAL: Consultar automáticamente al servidor cada 5 segundos (5000 ms)
      if (!autoRefreshInterval) {
        autoRefreshInterval = setInterval(() => {
          fetchEncuestasSilencioso(password);
        }, 5000);
      }

    } else {
      loginError.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Error al conectar con el servidor backend:', err);
    alert('No se pudo conectar con http://localhost:3000. Confirma que node server.js esté activo.');
  }
}

// Función silenciosa que actualiza la data en segundo plano sin parpadear la pantalla
async function fetchEncuestasSilencioso(password) {
  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    if (res.ok) {
      const data = await res.json();
      renderDashboard(data.encuestas || []);
    }
  } catch (err) {
    console.error('Error actualizando en tiempo real:', err);
  }
}

function handleLogout() {
  // Detener la actualización en tiempo real al cerrar sesión
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }

  document.getElementById('admin-pass').value = '';
  document.getElementById('admin-login-sec').classList.remove('hidden');
  document.getElementById('admin-dashboard-sec').classList.add('hidden');
  document.getElementById('btn-logout').classList.add('hidden');
}

function renderDashboard(dataList) {
  document.getElementById('total-count').textContent = dataList.length;

  const tbody = document.getElementById('admin-table-body');
  tbody.innerHTML = '';

  dataList.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.age} años</td>
      <td>${item.daily_hours}</td>
      <td>${item.p3}</td>
      <td>${item.p4}</td>
      <td><strong>${item.p7}</strong></td>
      <td>
        <button onclick="deleteRecord(${item.id})" style="background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  renderCharts(dataList);
}

function renderCharts(dataList) {
  const hoursData = {};
  const moodData = { 'Sí': 0, 'A veces': 0, 'No': 0 };

  dataList.forEach(item => {
    if (item.daily_hours) hoursData[item.daily_hours] = (hoursData[item.daily_hours] || 0) + 1;
    if (moodData[item.p7] !== undefined) moodData[item.p7]++;
  });

  const ctxHours = document.getElementById('chart-hours');
  if (ctxHours) {
    if (hoursChart) hoursChart.destroy();
    hoursChart = new Chart(ctxHours.getContext('2d'), {
      type: 'pie',
      data: {
        labels: Object.keys(hoursData).length ? Object.keys(hoursData) : ['Sin datos'],
        datasets: [{
          data: Object.values(hoursData).length ? Object.values(hoursData) : [1],
          backgroundColor: ['#6366f1', '#3b82f6', '#06b6d4', '#10b981']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, animation: false } // animation: false para que no parpadee al refrescar
    });
  }

  const ctxMood = document.getElementById('chart-mood');
  if (ctxMood) {
    if (moodChart) moodChart.destroy();
    moodChart = new Chart(ctxMood.getContext('2d'), {
      type: 'bar',
      data: {
        labels: Object.keys(moodData),
        datasets: [{
          label: 'Respuestas',
          data: Object.values(moodData),
          backgroundColor: ['#f87171', '#fbbf24', '#34d399']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, animation: false }
    });
  }
}

window.deleteRecord = async function(id) {
  if (confirm('¿Eliminar este registro?')) {
    try {
      const res = await fetch(`${API_URL}/eliminar/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const passInput = document.getElementById('admin-pass');
        fetchEncuestasSilencioso(passInput.value.trim());
      }
    } catch (err) {
      console.error(err);
    }
  }
};