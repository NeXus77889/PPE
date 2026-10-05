const API_BASE = window.location.port === '3000' ? '' : 'http://localhost:3000';
const API_URL = `${API_BASE}/api/admin`;

let token = null; // token de sesión (solo en memoria)
let hoursChart = null;
let moodChart = null;
let autoRefreshInterval = null;

const ORDEN_HORAS = ['Menos de 2 horas', 'Entre 2 y 4 horas', 'Entre 4 y 6 horas', 'Más de 6 horas'];
const COLORES_HORAS = {
  'Menos de 2 horas': '#10b981',
  'Entre 2 y 4 horas': '#06b6d4',
  'Entre 4 y 6 horas': '#3b82f6',
  'Más de 6 horas': '#6366f1'
};
const ORDEN_ANIMO = ['Sí', 'A veces', 'No'];

document.addEventListener('DOMContentLoaded', () => {
  const btnLogin = document.getElementById('btn-login');
  const btnLogout = document.getElementById('btn-logout');
  const passInput = document.getElementById('admin-pass');

  if (btnLogin) btnLogin.addEventListener('click', handleLogin);
  if (btnLogout) btnLogout.addEventListener('click', handleLogout);
  if (passInput) {
    passInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
  }

  // Textos legibles sobre el fondo oscuro
  if (window.Chart) {
    Chart.defaults.color = '#cbd5e1';
    Chart.defaults.borderColor = 'rgba(148, 163, 184, 0.2)';
  }
});

function mostrarErrorLogin(texto) {
  const loginError = document.getElementById('login-error');
  loginError.textContent = texto;
  loginError.classList.remove('hidden');
}

async function handleLogin() {
  const passInput = document.getElementById('admin-pass');
  const loginError = document.getElementById('login-error');
  const password = passInput.value.trim();

  if (!password) return;

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    if (res.status === 429) {
      mostrarErrorLogin('Demasiados intentos. Espera unos minutos.');
      return;
    }
    if (!res.ok) {
      mostrarErrorLogin('Contraseña incorrecta.');
      return;
    }

    const data = await res.json();
    token = data.token;

    loginError.classList.add('hidden');
    document.getElementById('admin-login-sec').classList.add('hidden');
    document.getElementById('admin-dashboard-sec').classList.remove('hidden');
    document.getElementById('btn-logout').classList.remove('hidden');
    passInput.value = '';

    await cargarEncuestas();

    // Tiempo real: se consulta al servidor cada 5 segundos
    if (!autoRefreshInterval) {
      autoRefreshInterval = setInterval(cargarEncuestas, 5000);
    }
  } catch (err) {
    console.error('Error al conectar con el servidor backend:', err);
    alert('No se pudo conectar con el servidor. Confirma que "node server.js" esté activo.');
  }
}

async function cargarEncuestas() {
  if (!token) return;
  try {
    const res = await fetch(`${API_URL}/encuestas`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 401) {
      cerrarSesion('Tu sesión expiró. Inicia sesión de nuevo.');
      return;
    }
    if (!res.ok) return;

    const data = await res.json();
    renderDashboard(data.encuestas || []);
  } catch (err) {
    console.error('Error actualizando en tiempo real:', err);
  }
}

function handleLogout() {
  if (token) {
    fetch(`${API_URL}/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => {});
  }
  cerrarSesion();
}

function cerrarSesion(mensaje) {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
  token = null;

  if (hoursChart) { hoursChart.destroy(); hoursChart = null; }
  if (moodChart) { moodChart.destroy(); moodChart = null; }

  document.getElementById('admin-pass').value = '';
  document.getElementById('admin-login-sec').classList.remove('hidden');
  document.getElementById('admin-dashboard-sec').classList.add('hidden');
  document.getElementById('btn-logout').classList.add('hidden');

  if (mensaje) mostrarErrorLogin(mensaje);
  else document.getElementById('login-error').classList.add('hidden');
}

function celda(texto, negrita) {
  const td = document.createElement('td');
  if (negrita) {
    const strong = document.createElement('strong');
    strong.textContent = texto;
    td.appendChild(strong);
  } else {
    td.textContent = texto;
  }
  return td;
}

function renderDashboard(dataList) {
  document.getElementById('total-count').textContent = dataList.length;

  const tbody = document.getElementById('admin-table-body');
  tbody.innerHTML = '';

  dataList.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.appendChild(celda(index + 1));
    tr.appendChild(celda(`${item.age} años`));
    tr.appendChild(celda(item.daily_hours));
    tr.appendChild(celda(item.p3));
    tr.appendChild(celda(item.p4));
    tr.appendChild(celda(item.p7, true));

    const tdAccion = document.createElement('td');
    const btn = document.createElement('button');
    btn.title = 'Eliminar registro';
    btn.style.cssText =
      'background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;';
    btn.innerHTML = '<i class="fa-solid fa-trash"></i>';
    btn.addEventListener('click', () => deleteRecord(item.id));
    tdAccion.appendChild(btn);
    tr.appendChild(tdAccion);

    tbody.appendChild(tr);
  });

  renderCharts(dataList);
}

function renderCharts(dataList) {
  if (!window.Chart) return;

  /* --- Horas de uso diario (pastel) --- */
  const horasConteo = ORDEN_HORAS.map((h) => ({
    label: h,
    total: dataList.filter((i) => i.daily_hours === h).length
  })).filter((h) => h.total > 0);

  const labelsH = horasConteo.length ? horasConteo.map((h) => h.label) : ['Sin datos'];
  const dataH = horasConteo.length ? horasConteo.map((h) => h.total) : [1];
  const coloresH = horasConteo.length ? horasConteo.map((h) => COLORES_HORAS[h.label]) : ['#475569'];

  const ctxHours = document.getElementById('chart-hours');
  if (ctxHours) {
    if (!hoursChart) {
      hoursChart = new Chart(ctxHours.getContext('2d'), {
        type: 'pie',
        data: { labels: labelsH, datasets: [{ data: dataH, backgroundColor: coloresH, borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, animation: false }
      });
    } else {
      hoursChart.data.labels = labelsH;
      hoursChart.data.datasets[0].data = dataH;
      hoursChart.data.datasets[0].backgroundColor = coloresH;
      hoursChart.update();
    }
  }

  /* --- Influencia en el ánimo (barras) --- */
  const dataM = ORDEN_ANIMO.map((op) => dataList.filter((i) => i.p7 === op).length);

  const ctxMood = document.getElementById('chart-mood');
  if (ctxMood) {
    if (!moodChart) {
      moodChart = new Chart(ctxMood.getContext('2d'), {
        type: 'bar',
        data: {
          labels: ORDEN_ANIMO,
          datasets: [{ label: 'Respuestas', data: dataM, backgroundColor: ['#f87171', '#fbbf24', '#34d399'] }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
      });
    } else {
      moodChart.data.datasets[0].data = dataM;
      moodChart.update();
    }
  }
}

async function deleteRecord(id) {
  if (!confirm('¿Eliminar este registro?')) return;

  try {
    const res = await fetch(`${API_URL}/eliminar/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 401) {
      cerrarSesion('Tu sesión expiró. Inicia sesión de nuevo.');
      return;
    }
    if (res.ok) await cargarEncuestas();
  } catch (err) {
    console.error(err);
  }
}
