// ============================================================
// LÓGICA DEL DASHBOARD DE OYENTES — RADIO GRACIA Y PAZ
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('pinModal');
  const pinInput = document.getElementById('pinInput');
  const pinForm = document.getElementById('pinForm');
  const pinError = document.getElementById('pinError');
  const refreshBtn = document.getElementById('refreshBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const clearBtn = document.getElementById('clearBtn');

  // Elementos de métricas
  const totalListenersEl = document.getElementById('totalListeners');
  const activeNowEl = document.getElementById('activeNow');
  const topCityEl = document.getElementById('topCityName');
  const topCityCountEl = document.getElementById('topCityCount');
  const topCitiesList = document.getElementById('topCitiesList');
  const topCountriesList = document.getElementById('topCountriesList');
  const listenersTableBody = document.getElementById('listenersTableBody');

  // Verificar si ya hay sesión de PIN en sessionStorage
  let currentPin = sessionStorage.getItem('GYP_ADMIN_PIN') || '';

  if (currentPin) {
    loadDashboard(currentPin);
  } else {
    showLoginModal();
  }

  // Submit del formulario de PIN
  pinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const enteredPin = pinInput.value.trim();
    if (!enteredPin) return;

    pinError.textContent = '';
    const success = await loadDashboard(enteredPin);
    if (success) {
      currentPin = enteredPin;
      sessionStorage.setItem('GYP_ADMIN_PIN', currentPin);
      hideLoginModal();
    } else {
      pinInput.value = '';
      pinInput.focus();
    }
  });

  // Refrescar datos
  refreshBtn.addEventListener('click', () => {
    if (currentPin) {
      loadDashboard(currentPin);
    }
  });

  // Cerrar sesión
  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('GYP_ADMIN_PIN');
    currentPin = '';
    showLoginModal();
  });

  // Borrar historial
  clearBtn.addEventListener('click', async () => {
    if (!currentPin) return;
    const confirmDelete = confirm('¿Estás seguro de que deseas borrar todo el historial de oyentes? Esta acción no se puede deshacer.');
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/stats.js?pin=${encodeURIComponent(currentPin)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('Historial borrado correctamente.');
        loadDashboard(currentPin);
      } else {
        alert('No se pudo borrar el historial.');
      }
    } catch (err) {
      alert('Error de red: ' + err.message);
    }
  });

  // Función principal para cargar datos del dashboard
  async function loadDashboard(pin) {
    try {
      refreshBtn.textContent = 'Cargando...';
      const res = await fetch(`/api/stats.js?pin=${encodeURIComponent(pin)}`);
      
      if (!res.ok) {
        if (res.status === 404) {
          if (pinError) pinError.textContent = 'Error 404: Ruta /api/stats no encontrada. Vuelve a desplegar con vercel --prod.';
        } else if (res.status === 401) {
          if (pinError) pinError.textContent = 'PIN incorrecto. Acceso denegado.';
        } else {
          if (pinError) pinError.textContent = `Error del servidor (${res.status}). Revisa la consola o logs de Vercel.`;
        }
        refreshBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
            <path d="M16 21v-5h5"></path>
          </svg>
          Actualizar
        `;
        return false;
      }

      const data = await res.json();
      renderMetrics(data.metrics, data.logs);
      await loadAnnouncement();
      hideLoginModal();
      return true;
    } catch (err) {
      if (pinError) pinError.textContent = 'Error de red al conectar: ' + err.message;
      console.error('Error cargando métricas:', err);
      return false;
    } finally {
      refreshBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
          <path d="M3 3v5h5"></path>
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
          <path d="M16 21v-5h5"></path>
        </svg>
        Actualizar
      `;
    }
  }

  // Renderizar las estadísticas en el DOM
  function renderMetrics(metrics, logs) {
    totalListenersEl.textContent = metrics.totalListeners || '0';
    activeNowEl.textContent = metrics.activeNow || '0';

    if (metrics.topCities && metrics.topCities.length > 0) {
      topCityEl.textContent = metrics.topCities[0].name;
      topCityCountEl.textContent = `${metrics.topCities[0].count} conexiones`;
    } else {
      topCityEl.textContent = 'Sin datos';
      topCityCountEl.textContent = '0 conexiones';
    }

    // Renderizar lista de ciudades
    topCitiesList.innerHTML = '';
    (metrics.topCities || []).slice(0, 8).forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'rank-item';
      li.innerHTML = `
        <div class="rank-item__info">
          <span class="rank-item__position">#${index + 1}</span>
          <span class="rank-item__name">${escapeHtml(item.name)}</span>
        </div>
        <span class="rank-item__badge">${item.count} oyentes</span>
      `;
      topCitiesList.appendChild(li);
    });

    if (topCitiesList.children.length === 0) {
      topCitiesList.innerHTML = '<li class="rank-item"><span class="rank-item__name">No hay ciudades registradas</span></li>';
    }

    // Renderizar lista de países
    topCountriesList.innerHTML = '';
    (metrics.topCountries || []).slice(0, 8).forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'rank-item';
      li.innerHTML = `
        <div class="rank-item__info">
          <span class="rank-item__position">#${index + 1}</span>
          <span class="rank-item__name">${escapeHtml(getCountryName(item.name))}</span>
        </div>
        <span class="rank-item__badge">${item.count}</span>
      `;
      topCountriesList.appendChild(li);
    });

    if (topCountriesList.children.length === 0) {
      topCountriesList.innerHTML = '<li class="rank-item"><span class="rank-item__name">No hay países registrados</span></li>';
    }

    // Renderizar tabla de historial reciente
    listenersTableBody.innerHTML = '';
    if (!logs || logs.length === 0) {
      listenersTableBody.innerHTML = `
        <tr class="data-table__row">
          <td class="data-table__cell" colspan="5" style="text-align: center; color: var(--color-text-muted);">
            Aún no se han registrado accesos en la radio
          </td>
        </tr>
      `;
      return;
    }

    logs.forEach(entry => {
      const tr = document.createElement('tr');
      tr.className = 'data-table__row';

      let platformBadgeClass = 'data-table__badge';
      if ((entry.platform || '').includes('Android')) {
        platformBadgeClass += ' data-table__badge--android';
      } else {
        platformBadgeClass += ' data-table__badge--web';
      }

      tr.innerHTML = `
        <td class="data-table__cell">
          <strong>${escapeHtml(entry.city || 'Desconocida')}</strong>
          ${entry.region ? `<span class="data-table__cell--muted">(${escapeHtml(entry.region)})</span>` : ''}
        </td>
        <td class="data-table__cell">${escapeHtml(getCountryName(entry.country || 'AR'))}</td>
        <td class="data-table__cell">
          <span class="${platformBadgeClass}">${escapeHtml(entry.platform || 'Web')}</span>
        </td>
        <td class="data-table__cell data-table__cell--muted">${formatDate(entry.timestamp)}</td>
        <td class="data-table__cell data-table__cell--muted">${escapeHtml(entry.ip || 'Oculta')}</td>
      `;
      listenersTableBody.appendChild(tr);
    });
  }

  function showLoginModal() {
    modal.classList.remove('dashboard-modal--hidden');
    pinInput.focus();
  }

  function hideLoginModal() {
    modal.classList.add('dashboard-modal--hidden');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(isoStr) {
    if (!isoStr) return 'Reciente';
    try {
      const dt = new Date(isoStr);
      return dt.toLocaleString('es-AR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoStr;
    }
  }

  function getCountryName(code) {
    const names = {
      'AR': 'Argentina',
      'ES': 'España',
      'MX': 'México',
      'US': 'Estados Unidos',
      'CO': 'Colombia',
      'CL': 'Chile',
      'PE': 'Perú',
      'UY': 'Uruguay',
      'EC': 'Ecuador',
      'VE': 'Venezuela',
      'PY': 'Paraguay',
      'BO': 'Bolivia',
      'CR': 'Costa Rica',
      'PA': 'Panamá'
    };
    return names[code] || code;
  }

  // ============================================================
  // GESTIÓN DE AVISOS A OYENTES (IN-APP)
  // ============================================================
  const announcementForm = document.getElementById('announcementForm');
  const announcementTitle = document.getElementById('announcementTitle');
  const announcementMessage = document.getElementById('announcementMessage');
  const announcementActive = document.getElementById('announcementActive');
  const announcementStatusBadge = document.getElementById('announcementStatusBadge');
  const announcementFeedback = document.getElementById('announcementFeedback');
  const deleteAnnouncementBtn = document.getElementById('deleteAnnouncementBtn');
  const saveAnnouncementBtn = document.getElementById('saveAnnouncementBtn');

  async function loadAnnouncement() {
    if (!announcementForm) return;
    try {
      const res = await fetch('/api/announcement.js');
      if (!res.ok) return;
      const data = await res.json();

      if (data && data.title) {
        announcementTitle.value = data.title || '';
        announcementMessage.value = data.message || '';
        announcementActive.checked = Boolean(data.active);
      } else {
        announcementActive.checked = false;
      }
      updateAnnouncementBadge(Boolean(data && data.active));
    } catch (e) {
      console.warn('No se pudo cargar el aviso actual:', e);
    }
  }

  function updateAnnouncementBadge(isActive) {
    if (!announcementStatusBadge) return;
    if (isActive) {
      announcementStatusBadge.textContent = 'Activo';
      announcementStatusBadge.className = 'announcement-admin__badge announcement-admin__badge--active';
    } else {
      announcementStatusBadge.textContent = 'Inactivo / Oculto';
      announcementStatusBadge.className = 'announcement-admin__badge announcement-admin__badge--inactive';
    }
  }

  function showAnnouncementFeedback(msg, isSuccess = true) {
    if (!announcementFeedback) return;
    announcementFeedback.textContent = msg;
    announcementFeedback.className = isSuccess
      ? 'announcement-admin__feedback announcement-admin__feedback--success'
      : 'announcement-admin__feedback announcement-admin__feedback--error';

    setTimeout(() => {
      announcementFeedback.textContent = '';
    }, 4500);
  }

  if (announcementForm) {
    announcementForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentPin) {
        showAnnouncementFeedback('Debes ingresar con el PIN para publicar.', false);
        return;
      }

      const title = announcementTitle.value.trim();
      const message = announcementMessage.value.trim();
      const active = announcementActive.checked;

      if (!title || !message) {
        showAnnouncementFeedback('Por favor completa el título y el mensaje.', false);
        return;
      }

      saveAnnouncementBtn.disabled = true;
      saveAnnouncementBtn.textContent = 'Publicando...';

      try {
        const res = await fetch(`/api/announcement.js?pin=${encodeURIComponent(currentPin)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, message, active })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showAnnouncementFeedback('¡Aviso publicado exitosamente para todos los oyentes!');
          updateAnnouncementBadge(active);
        } else {
          showAnnouncementFeedback(data.error || 'Error al guardar el aviso.', false);
        }
      } catch (err) {
        showAnnouncementFeedback('Error de conexión: ' + err.message, false);
      } finally {
        saveAnnouncementBtn.disabled = false;
        saveAnnouncementBtn.textContent = 'Publicar Aviso';
      }
    });
  }

  if (deleteAnnouncementBtn) {
    deleteAnnouncementBtn.addEventListener('click', async () => {
      if (!currentPin) {
        showAnnouncementFeedback('Debes ingresar con el PIN para desactivar.', false);
        return;
      }

      if (!confirm('¿Deseas ocultar y desactivar el aviso para todos los oyentes?')) return;

      deleteAnnouncementBtn.disabled = true;
      try {
        const res = await fetch(`/api/announcement.js?pin=${encodeURIComponent(currentPin)}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (res.ok && data.success) {
          announcementActive.checked = false;
          updateAnnouncementBadge(false);
          showAnnouncementFeedback('El aviso ha sido desactivado.');
        } else {
          showAnnouncementFeedback(data.error || 'Error al desactivar el aviso.', false);
        }
      } catch (err) {
        showAnnouncementFeedback('Error de conexión: ' + err.message, false);
      } finally {
        deleteAnnouncementBtn.disabled = false;
      }
    });
  }
});
