/**
 * @fileoverview Lógica del Dashboard de Analítica estilo Power BI para Sincronía Digital.
 * Configuración limpia, tarjetas blancas, filtros interactivos y paleta profesional de Chart.js.
 * @module public/js/admin
 */

const ADMIN_API = '/api/admin';

let tokenSesion = sessionStorage.getItem('ppe_admin_token') || null;
let todasLasEncuestas = [];
let encuestasFiltradas = [];

let chartHoras = null;
let chartAnimo = null;
let chartNocturno = null;
let chartInteres = null;

// Paleta Corporativa Limpia de Power BI
const PBI_PALETTE = {
  blue: '#0078d4',
  teal: '#00bcf2',
  amber: '#f59e0b',
  green: '#107c41',
  red: '#d13438',
  purple: '#7c3aed',
  gray: '#94a3b8'
};

document.addEventListener('DOMContentLoaded', () => {
  setupAdminAuth();
  setupFilterSlicers();

  if (tokenSesion) {
    mostrarDashboard();
    cargarDatos();
  }
});

/* ==========================================================================
   1. AUTENTICACIÓN Y SESIÓN
   ========================================================================== */
function setupAdminAuth() {
  const btnLogin = document.getElementById('btn-login');
  const btnLogout = document.getElementById('btn-logout');
  const passInput = document.getElementById('admin-pass');
  const btnRefresh = document.getElementById('btn-refresh-data');

  if (btnLogin) btnLogin.addEventListener('click', ejecutarLogin);
  if (passInput) {
    passInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') ejecutarLogin();
    });
  }

  if (btnLogout) btnLogout.addEventListener('click', ejecutarLogout);
  if (btnRefresh) btnRefresh.addEventListener('click', cargarDatos);
}

async function ejecutarLogin() {
  const passInput = document.getElementById('admin-pass');
  const errorMsg = document.getElementById('login-error');
  if (!passInput) return;

  const password = passInput.value.trim();
  if (!password) {
    mostrarErrorLogin('Por favor ingresa la contraseña.');
    return;
  }

  try {
    const res = await fetch(`${ADMIN_API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.token) {
      tokenSesion = data.token;
      sessionStorage.setItem('ppe_admin_token', tokenSesion);
      passInput.value = '';
      if (errorMsg) errorMsg.classList.add('hidden');

      mostrarDashboard();
      await cargarDatos();
    } else {
      mostrarErrorLogin(data.error || 'Contraseña incorrecta.');
    }
  } catch (error) {
    console.error('Error de login:', error);
    mostrarErrorLogin('No se pudo conectar con el servidor.');
  }
}

function ejecutarLogout() {
  if (tokenSesion) {
    fetch(`${ADMIN_API}/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSesion}` }
    }).catch(() => {});
  }
  tokenSesion = null;
  sessionStorage.removeItem('ppe_admin_token');
  destruirGraficos();

  document.getElementById('admin-login-sec')?.classList.remove('hidden');
  document.getElementById('admin-dashboard-sec')?.classList.add('hidden');
  document.getElementById('btn-logout')?.classList.add('hidden');
  document.getElementById('btn-refresh-data')?.classList.add('hidden');
  document.getElementById('btn-limpiar-todo')?.classList.add('hidden');
}

function mostrarErrorLogin(msg) {
  const errorEl = document.getElementById('login-error');
  if (errorEl) {
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
  }
}

function mostrarDashboard() {
  document.getElementById('admin-login-sec')?.classList.add('hidden');
  document.getElementById('admin-dashboard-sec')?.classList.remove('hidden');
  document.getElementById('btn-logout')?.classList.remove('hidden');
  document.getElementById('btn-refresh-data')?.classList.remove('hidden');
  document.getElementById('btn-limpiar-todo')?.classList.remove('hidden');
}

/* ==========================================================================
   2. CARGA DE DATOS DESDE LA API
   ========================================================================== */
async function cargarDatos() {
  if (!tokenSesion) return;

  const btnRefresh = document.getElementById('btn-refresh-data');
  if (btnRefresh) {
    btnRefresh.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Actualizando...';
  }

  try {
    const res = await fetch(`${ADMIN_API}/encuestas`, {
      headers: { Authorization: `Bearer ${tokenSesion}` }
    });

    if (res.status === 401) {
      ejecutarLogout();
      mostrarErrorLogin('Tu sesión ha expirado.');
      return;
    }

    const data = await res.json();
    if (res.ok && Array.isArray(data.encuestas)) {
      todasLasEncuestas = data.encuestas;
      aplicarFiltros();
      actualizarHoraUltimoSync();
    }
  } catch (error) {
    console.error('Error cargando encuestas:', error);
  } finally {
    if (btnRefresh) {
      btnRefresh.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Actualizar';
    }
  }
}

function actualizarHoraUltimoSync() {
  const syncLabel = document.getElementById('last-sync-time');
  if (syncLabel) {
    const ahora = new Date();
    syncLabel.textContent = `Actualizado: ${ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
}

/* ==========================================================================
   3. FILTROS INTERACTIVOS EN TIEMPO REAL (SLICERS)
   ========================================================================== */
function setupFilterSlicers() {
  const slicerAge = document.getElementById('filter-age');
  const slicerHours = document.getElementById('filter-hours');
  const slicerMood = document.getElementById('filter-mood');
  const slicerBedtime = document.getElementById('filter-bedtime');
  const slicerSearch = document.getElementById('filter-search');
  const btnReset = document.getElementById('btn-reset-filters');

  [slicerAge, slicerHours, slicerMood, slicerBedtime].forEach((el) => {
    if (el) el.addEventListener('change', aplicarFiltros);
  });

  if (slicerSearch) {
    slicerSearch.addEventListener('input', aplicarFiltros);
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (slicerAge) slicerAge.value = 'all';
      if (slicerHours) slicerHours.value = 'all';
      if (slicerMood) slicerMood.value = 'all';
      if (slicerBedtime) slicerBedtime.value = 'all';
      if (slicerSearch) slicerSearch.value = '';
      aplicarFiltros();
    });
  }
}

function aplicarFiltros() {
  const fAge = document.getElementById('filter-age')?.value || 'all';
  const fHours = document.getElementById('filter-hours')?.value || 'all';
  const fMood = document.getElementById('filter-mood')?.value || 'all';
  const fBedtime = document.getElementById('filter-bedtime')?.value || 'all';
  const fSearch = (document.getElementById('filter-search')?.value || '').toLowerCase().trim();

  encuestasFiltradas = todasLasEncuestas.filter((item) => {
    if (fAge !== 'all') {
      const edad = Number(item.age);
      if (fAge === '10-14' && (edad < 10 || edad > 14)) return false;
      if (fAge === '15-18' && (edad < 15 || edad > 18)) return false;
      if (fAge === '19+' && edad < 19) return false;
    }

    if (fHours !== 'all' && item.daily_hours !== fHours) return false;
    if (fMood !== 'all' && item.p7 !== fMood) return false;
    if (fBedtime !== 'all' && item.p3 !== fBedtime) return false;

    if (fSearch) {
      const textoFila = `${item.id} ${item.age} ${item.daily_hours} ${item.p1} ${item.p3} ${item.p4} ${item.p7} ${item.createdAt || ''}`.toLowerCase();
      if (!textoFila.includes(fSearch)) return false;
    }

    return true;
  });

  renderizarKPIs(encuestasFiltradas, todasLasEncuestas.length);
  renderizarGraficos(encuestasFiltradas);
  renderizarTabla(encuestasFiltradas);
}

/* ==========================================================================
   4. RENDERIZADO DE KPIS
   ========================================================================== */
function renderizarKPIs(datos, totalGlobal) {
  const n = datos.length;

  const kpiTotal = document.getElementById('kpi-total-count');
  const kpiTotalSub = document.getElementById('kpi-total-sub');
  if (kpiTotal) kpiTotal.textContent = n;
  if (kpiTotalSub) {
    kpiTotalSub.textContent = n === totalGlobal ? '100% de la muestra' : `${n} de ${totalGlobal} registros filtrados`;
  }

  const intensivos = datos.filter((i) => i.daily_hours === 'Entre 4 y 6 horas' || i.daily_hours === 'Más de 6 horas').length;
  const pctIntensivo = n > 0 ? Math.round((intensivos / n) * 100) : 0;
  const kpiHours = document.getElementById('kpi-hours-pct');
  const kpiHoursSub = document.getElementById('kpi-hours-sub');
  if (kpiHours) kpiHours.textContent = `${pctIntensivo}%`;
  if (kpiHoursSub) kpiHoursSub.textContent = `${intensivos} estudiantes pasan >4h/día`;

  const nocturnos = datos.filter((i) => i.p3 === 'Siempre').length;
  const pctNocturno = n > 0 ? Math.round((nocturnos / n) * 100) : 0;
  const kpiSleep = document.getElementById('kpi-sleep-pct');
  const kpiSleepSub = document.getElementById('kpi-sleep-sub');
  if (kpiSleep) kpiSleep.textContent = `${pctNocturno}%`;
  if (kpiSleepSub) kpiSleepSub.textContent = `${nocturnos} usan cel al dormir`;

  const adictos = datos.filter((i) => i.p4 === 'Sí').length;
  const pctAdictos = n > 0 ? Math.round((adictos / n) * 100) : 0;
  const kpiHard = document.getElementById('kpi-hard-pct');
  const kpiHardSub = document.getElementById('kpi-hard-sub');
  if (kpiHard) kpiHard.textContent = `${pctAdictos}%`;
  if (kpiHardSub) kpiHardSub.textContent = `${adictos} admiten dificultad`;

  const interesados = datos.filter((i) => i.p8 === 'Sí').length;
  const pctInteres = n > 0 ? Math.round((interesados / n) * 100) : 0;
  const kpiInterest = document.getElementById('kpi-interest-pct');
  const kpiInterestSub = document.getElementById('kpi-interest-sub');
  if (kpiInterest) kpiInterest.textContent = `${pctInteres}%`;
  if (kpiInterestSub) kpiInterestSub.textContent = `${interesados} desean aprender hábitos`;
}

/* ==========================================================================
   5. RENDERIZADO DE GRÁFICOS (CHART.JS LIMPIO EN TARJETA BLANCA)
   ========================================================================== */
function destruirGraficos() {
  if (chartHoras) { chartHoras.destroy(); chartHoras = null; }
  if (chartAnimo) { chartAnimo.destroy(); chartAnimo = null; }
  if (chartNocturno) { chartNocturno.destroy(); chartNocturno = null; }
  if (chartInteres) { chartInteres.destroy(); chartInteres = null; }
}

function renderizarGraficos(datos) {
  if (!window.Chart) return;

  // Ajustes de estilo limpio para fondo blanco
  Chart.defaults.color = '#334155';
  Chart.defaults.font.family = "'Poppins', sans-serif";
  Chart.defaults.borderColor = '#f1f5f9';

  /* 1. Horas de Uso (Doughnut) */
  const categoriasHoras = ['Menos de 2 horas', 'Entre 2 y 4 horas', 'Entre 4 y 6 horas', 'Más de 6 horas'];
  const dataHoras = categoriasHoras.map((h) => datos.filter((i) => i.daily_hours === h).length);
  const totalHoras = dataHoras.reduce((a, b) => a + b, 0);

  const ctxHoras = document.getElementById('chart-hours-pbi')?.getContext('2d');
  if (ctxHoras) {
    if (chartHoras) chartHoras.destroy();
    chartHoras = new Chart(ctxHoras, {
      type: 'doughnut',
      data: {
        labels: categoriasHoras,
        datasets: [
          {
            data: dataHoras,
            backgroundColor: [PBI_PALETTE.green, PBI_PALETTE.teal, PBI_PALETTE.amber, PBI_PALETTE.red],
            borderWidth: 2,
            borderColor: '#ffffff'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.raw || 0;
                const pct = totalHoras > 0 ? Math.round((val / totalHoras) * 100) : 0;
                return ` ${ctx.label}: ${val} (${pct}%)`;
              }
            }
          }
        },
        cutout: '65%'
      }
    });
  }

  /* 2. Influencia en el Ánimo (P7 - Barras) */
  const categoriasAnimo = ['Sí', 'A veces', 'No'];
  const dataAnimo = categoriasAnimo.map((op) => datos.filter((i) => i.p7 === op).length);
  const totalAnimo = dataAnimo.reduce((a, b) => a + b, 0);

  const ctxAnimo = document.getElementById('chart-mood-pbi')?.getContext('2d');
  if (ctxAnimo) {
    if (chartAnimo) chartAnimo.destroy();
    chartAnimo = new Chart(ctxAnimo, {
      type: 'bar',
      data: {
        labels: categoriasAnimo,
        datasets: [
          {
            label: 'Estudiantes',
            data: dataAnimo,
            backgroundColor: [PBI_PALETTE.red, PBI_PALETTE.amber, PBI_PALETTE.green],
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.raw || 0;
                const pct = totalAnimo > 0 ? Math.round((val / totalAnimo) * 100) : 0;
                return ` ${ctx.label}: ${val} estudiantes (${pct}%)`;
              }
            }
          }
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  /* 3. Hábitos Nocturnos vs Dificultad (P3 vs P4 - Clustered Bar) */
  const nivelesP3 = ['Siempre', 'A veces', 'Nunca'];
  const p4Si = nivelesP3.map((lvl) => datos.filter((i) => i.p3 === lvl && i.p4 === 'Sí').length);
  const p4AVeces = nivelesP3.map((lvl) => datos.filter((i) => i.p3 === lvl && i.p4 === 'A veces').length);
  const p4No = nivelesP3.map((lvl) => datos.filter((i) => i.p3 === lvl && i.p4 === 'No').length);

  const ctxNocturno = document.getElementById('chart-sleep-pbi')?.getContext('2d');
  if (ctxNocturno) {
    if (chartNocturno) chartNocturno.destroy();
    chartNocturno = new Chart(ctxNocturno, {
      type: 'bar',
      data: {
        labels: ['Dormir: Siempre', 'Dormir: A veces', 'Dormir: Nunca'],
        datasets: [
          { label: 'Cuesta dejarlo: Sí', data: p4Si, backgroundColor: PBI_PALETTE.red, borderRadius: 4 },
          { label: 'Cuesta dejarlo: A veces', data: p4AVeces, backgroundColor: PBI_PALETTE.amber, borderRadius: 4 },
          { label: 'Cuesta dejarlo: No', data: p4No, backgroundColor: PBI_PALETTE.green, borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
  }

  /* 4. Interés en Estrategias de Bienestar (P8 - Pastel) */
  const dataInteres = [
    datos.filter((i) => i.p8 === 'Sí').length,
    datos.filter((i) => i.p8 === 'No').length
  ];
  const totalInteres = dataInteres.reduce((a, b) => a + b, 0);

  const ctxInteres = document.getElementById('chart-interest-pbi')?.getContext('2d');
  if (ctxInteres) {
    if (chartInteres) chartInteres.destroy();
    chartInteres = new Chart(ctxInteres, {
      type: 'pie',
      data: {
        labels: ['Desea aprender (Sí)', 'No le interesa (No)'],
        datasets: [
          {
            data: dataInteres,
            backgroundColor: [PBI_PALETTE.blue, PBI_PALETTE.gray],
            borderWidth: 2,
            borderColor: '#ffffff'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.raw || 0;
                const pct = totalInteres > 0 ? Math.round((val / totalInteres) * 100) : 0;
                return ` ${ctx.label}: ${val} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }
}

/* ==========================================================================
   6. RENDERIZADO DE TABLA LIMPIA
   ========================================================================== */
function obtenerBadgeClase(valor) {
  if (valor === 'Sí') return 'badge-clean badge-yes';
  if (valor === 'Siempre') return 'badge-clean badge-always';
  if (valor === 'A veces') return 'badge-clean badge-maybe';
  if (valor === 'No' || valor === 'Nunca') return 'badge-clean badge-no';
  return 'badge-clean badge-hours';
}

function renderizarTabla(datos) {
  const tbody = document.getElementById('admin-table-body');
  const countLabel = document.getElementById('table-count-label');
  if (!tbody) return;

  if (countLabel) {
    countLabel.textContent = `Mostrando ${datos.length} de ${todasLasEncuestas.length} registros`;
  }

  tbody.innerHTML = '';

  if (datos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 25px; color: #64748b;">
          No hay registros que coincidan con los filtros seleccionados.
        </td>
      </tr>
    `;
    return;
  }

  datos.forEach((item, idx) => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td style="color: #64748b; font-weight: 600;">#${item.id || idx + 1}</td>
      <td><strong>${item.age}</strong> años</td>
      <td><span class="badge-clean badge-hours">${item.daily_hours}</span></td>
      <td><span class="${obtenerBadgeClase(item.p3)}">${item.p3}</span></td>
      <td><span class="${obtenerBadgeClase(item.p4)}">${item.p4}</span></td>
      <td><span class="${obtenerBadgeClase(item.p7)}">${item.p7}</span></td>
      <td style="font-size: 0.8rem; color: #64748b;">${item.createdAt || 'Reciente'}</td>
      <td>
        <button class="btn-del-record" title="Eliminar registro" onclick="solicitarEliminar(${item.id})">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

async function solicitarEliminar(id) {
  if (!confirm(`¿Eliminar la encuesta #${id}?`)) return;

  try {
    const res = await fetch(`${ADMIN_API}/eliminar/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenSesion}` }
    });

    if (res.status === 401) {
      ejecutarLogout();
      mostrarErrorLogin('Sesión expirada.');
      return;
    }

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      // Comparamos con Number() pq MySQL retorna ids como número pero el param puede llegar como string
      todasLasEncuestas = todasLasEncuestas.filter((i) => Number(i.id) !== Number(id));
      aplicarFiltros();
    } else {
      // Mostramos el error real del servidor pq ayuda a depurar
      alert(data.error || `Error ${res.status}: No se pudo eliminar el registro.`);
    }
  } catch (error) {
    console.error('Error al eliminar:', error);
    alert('Error de conexión al intentar eliminar.');
  }
}

/* ==========================================================================
   7. LIMPIEZA TOTAL DE ENCUESTAS DE PRUEBA
   ========================================================================== */
async function solicitarLimpiarTodo() {
  // Doble confirmación pq es operación destructiva irreversible
  const paso1 = confirm('⚠️ ¿Estás seguro de que quieres ELIMINAR TODAS las encuestas?\nEsta acción no se puede deshacer.');
  if (!paso1) return;

  const paso2 = prompt('Escribe CONFIRMAR (en mayúsculas) para continuar:');
  if (paso2 !== 'CONFIRMAR') {
    alert('Operación cancelada. Debes escribir exactamente: CONFIRMAR');
    return;
  }

  try {
    const res = await fetch(`${ADMIN_API}/limpiar-todo`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${tokenSesion}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ confirmacion: 'CONFIRMAR' })
    });

    if (res.status === 401) {
      ejecutarLogout();
      mostrarErrorLogin('Sesión expirada.');
      return;
    }

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      // Vaciamos el estado local pq ya no hay registros en la DB
      todasLasEncuestas = [];
      aplicarFiltros();
      alert('✅ Todos los registros fueron eliminados correctamente.');
    } else {
      alert(data.error || 'No se pudo limpiar la tabla.');
    }
  } catch (error) {
    console.error('Error al limpiar encuestas:', error);
    alert('Error de conexión al intentar limpiar.');
  }
}

window.solicitarEliminar    = solicitarEliminar;
window.solicitarLimpiarTodo = solicitarLimpiarTodo;
