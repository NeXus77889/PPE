const API_URL = 'http://localhost:3000/api/encuestas';
const ADMIN_PASS = 'admin123';

let surveyData = [];
let isAdminLoggedIn = false;

let hoursChartInstance = null;
let diffChartInstance = null;

const navButtons = document.querySelectorAll('.nav-btn');
const pageSections = document.querySelectorAll('.page-section');
const surveyForm = document.getElementById('survey-form');
const tableBody = document.getElementById('survey-table-body');
const emptyState = document.getElementById('empty-state');
const navCount = document.getElementById('nav-count');
const statCount = document.getElementById('stat-count');
const searchInput = document.getElementById('search-input');

const btnGoSurvey = document.getElementById('btn-go-survey');
const btnGoCharts = document.getElementById('btn-go-charts');

const adminAuthCard = document.getElementById('admin-auth-card');
const adminContent = document.getElementById('admin-content');
const adminPassInput = document.getElementById('admin-pass-input');
const btnAdminLogin = document.getElementById('btn-admin-login');
const btnAdminLogout = document.getElementById('btn-admin-logout');
const authError = document.getElementById('auth-error');

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupFormHandler();
  setupResultsActions();
  setupAdminAuth();
  fetchEncuestas();
});

function setupNavigation() {
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => switchSection(btn.dataset.target));
  });

  if (btnGoSurvey) btnGoSurvey.addEventListener('click', () => switchSection('sec-survey'));
  if (btnGoCharts) btnGoCharts.addEventListener('click', () => switchSection('sec-charts'));
}

function switchSection(targetId) {
  navButtons.forEach(b => b.classList.toggle('active', b.dataset.target === targetId));
  pageSections.forEach(s => s.classList.toggle('active', s.id === targetId));

  if (targetId === 'sec-charts') renderCharts();
}

async function fetchEncuestas() {
  try {
    const res = await fetch(API_URL);
    if (res.ok) {
      surveyData = await res.json();
      updateUI();
    }
  } catch (err) {
    console.error('Error al obtener encuestas:', err);
  }
}

function setupFormHandler() {
  if (!surveyForm) return;

  surveyForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      fullName: document.getElementById('fullName').value.trim(),
      course: document.getElementById('course').value.trim(),
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

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('¡Encuesta guardada con éxito!');
        surveyForm.reset();
        await fetchEncuestas();
        switchSection('sec-charts');
      } else {
        alert('Error al guardar en el servidor.');
      }
    } catch (err) {
      alert('Error de conexión con el servidor Node.js.');
    }
  });
}

function setupAdminAuth() {
  if (btnAdminLogin) btnAdminLogin.addEventListener('click', handleLogin);
  if (btnAdminLogout) {
    btnAdminLogout.addEventListener('click', () => {
      isAdminLoggedIn = false;
      if (adminPassInput) adminPassInput.value = '';
      if (adminAuthCard) adminAuthCard.classList.remove('hidden');
      if (adminContent) adminContent.classList.add('hidden');
    });
  }
}

function handleLogin() {
  if (adminPassInput.value === ADMIN_PASS) {
    isAdminLoggedIn = true;
    if (authError) authError.classList.add('hidden');
    if (adminAuthCard) adminAuthCard.classList.add('hidden');
    if (adminContent) adminContent.classList.remove('hidden');
  } else {
    if (authError) authError.classList.remove('hidden');
  }
}

function setupResultsActions() {
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = surveyData.filter(item => 
        item.fullName.toLowerCase().includes(term) || 
        item.course.toLowerCase().includes(term)
      );
      renderTable(filtered);
    });
  }
}

function updateUI() {
  const count = surveyData.length;
  if (navCount) navCount.textContent = count;
  if (statCount) statCount.textContent = count;
  renderTable(surveyData);
}

function renderTable(dataList) {
  if (!tableBody) return;
  tableBody.innerHTML = '';

  if (dataList.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }
  if (emptyState) emptyState.classList.add('hidden');

  dataList.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td><strong>${escapeHTML(item.fullName)}</strong></td>
      <td>${escapeHTML(item.course)}</td>
      <td><span class="badge-rating">${escapeHTML(item.dailyHours)}</span></td>
      <td>${escapeHTML(item.p3)}</td>
      <td>${escapeHTML(item.p4)}</td>
      <td><button class="btn-del" onclick="deleteItem(${item.id})" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button></td>
    `;
    tableBody.appendChild(tr);
  });
}

window.deleteItem = async function(id) {
  if (confirm('¿Eliminar registro?')) {
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      await fetchEncuestas();
      renderCharts();
    } catch (err) {
      console.error(err);
    }
  }
};

function renderCharts() {
  const hoursMap = {};
  const diffMap = {};

  surveyData.forEach(item => {
    hoursMap[item.dailyHours] = (hoursMap[item.dailyHours] || 0) + 1;
    diffMap[item.p4] = (diffMap[item.p4] || 0) + 1;
  });

  
  // Gráfico 1: Horas de Uso (Pie Chart) - Iteración de Colores Byte
  const ctxHours = document.getElementById('chart-hours');
  if (ctxHours) {
    if (hoursChartInstance) hoursChartInstance.destroy();
    hoursChartInstance = new Chart(ctxHours.getContext('2d'), {
      type: 'pie',
      data: {
        labels: Object.keys(hoursMap).length ? Object.keys(hoursMap) : ['Sin datos'],
        datasets: [{
          data: Object.values(hoursMap).length ? Object.values(hoursMap) : [1],
          backgroundColor: ['#0052cc', '#0077ff', '#00b8d9', '#4c8dff']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  // Gráfico 2: Dificultad para Dejar el Celular (Doughnut Chart)
  const ctxDiff = document.getElementById('chart-difficulty');
  if (ctxDiff) {
    if (diffChartInstance) diffChartInstance.destroy();
    diffChartInstance = new Chart(ctxDiff.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: Object.keys(diffMap).length ? Object.keys(diffMap) : ['Sin datos'],
        datasets: [{
          data: Object.values(diffMap).length ? Object.values(diffMap) : [1],
          backgroundColor: ['#e53935', '#fb8c00', '#66bb6a']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}