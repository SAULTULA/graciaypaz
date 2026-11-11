document.addEventListener('DOMContentLoaded', () => {

  // ─── Sidebar ─────────────────────────────────────────────────────────────────
  const menuBtn         = document.getElementById('menuBtn');
  const closeSidebarBtn = document.getElementById('closeSidebarBtn');
  const sidebar         = document.getElementById('sidebar');
  const sidebarOverlay  = document.getElementById('sidebarOverlay');

  const toggleSidebar = () => {
    const isExpanded = menuBtn.getAttribute('aria-expanded') === 'true';
    menuBtn.setAttribute('aria-expanded', !isExpanded);
    sidebar.setAttribute('aria-hidden', isExpanded);
    sidebar.classList.toggle('sidebar--active');
    sidebarOverlay.classList.toggle('sidebar-overlay--active');
  };

  menuBtn.addEventListener('click', toggleSidebar);
  closeSidebarBtn.addEventListener('click', toggleSidebar);
  sidebarOverlay.addEventListener('click', toggleSidebar);

  // ─── Metadata de Zeno.fm (Now Playing) ────────────────────────────────────────
  const trackElement = document.getElementById('nowPlayingTrack');
  const programElement = document.getElementById('nowPlayingProgram');
  const ZENO_MOUNT_ID = 'mfer4shs398uv';

  if (trackElement && programElement) {
    const eventSource = new EventSource(`https://api.zeno.fm/mounts/metadata/subscribe/${ZENO_MOUNT_ID}`);
    
    eventSource.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.streamTitle) {
          // El formato general suele ser "Programa - Pista" o "Artista - Pista"
          const parts = data.streamTitle.split(' - ');
          if (parts.length >= 2) {
            programElement.textContent = parts[0].trim();
            trackElement.textContent = parts.slice(1).join(' - ').trim();
          } else {
            trackElement.textContent = data.streamTitle;
            programElement.textContent = 'Radio Gracia y Paz';
          }
        }
      } catch (error) {
        console.error('Error parseando metadata de Zeno:', error);
      }
    });

    eventSource.addEventListener('error', (error) => {
      console.error('Error en la conexión EventSource con Zeno:', error);
    });
  }

  // ─── Motor de Programación en Vivo (Hora Argentina UTC-3) ──────────────────────
  const liveModal = document.getElementById('liveModal');
  const liveBannerImg = document.getElementById('liveBannerImg');
  const closeLiveBtn = document.getElementById('closeLiveBtn');
  
  if (closeLiveBtn) {
    closeLiveBtn.addEventListener('click', () => {
      liveModal.classList.remove('live-modal--active');
    });
  }

  const BANNER_SCHEDULE = [
    // --- HORARIOS REALES DEFINITIVOS ---
    { day: 1, hour: 19, minute: 55, bannerSrc: 'public/tcf.png', durationMinutes: 90, text: 'Desde las 20:00hs en Ten Confianza. Conduce: Hno JOSE PASIEKA' }, // Lunes
    { day: 2, hour: 19, minute: 55, bannerSrc: 'public/1+2.png', durationMinutes: 90, text: 'Desde las 20:00hs en 1+2. Conducen: Hno Saul, Hna Marisol' }, // Martes
    { day: 3, hour: 19, minute: 55, bannerSrc: 'public/tcf.png', durationMinutes: 90, text: 'Desde las 20:00hs en Ten Confianza. Conduce: Hno JOSE PASIEKA' }, // Miércoles
    { day: 4, hour: 19, minute: 55, bannerSrc: 'public/tcf.png', durationMinutes: 90, text: 'Desde las 20:00hs en Ten Confianza. Conduce: Hno JOSE PASIEKA' }  // Jueves
  ];

  function checkLiveSchedule() {
    if (!liveModal || !liveBannerImg) return;
    const liveBannerText = document.getElementById('liveBannerText');
    
    // 1. Obtener la hora actual forzada a la zona horaria de Argentina
    const now = new Date();
    const argTimeOptions = { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false };
    
    const formatter = new Intl.DateTimeFormat('en-US', argTimeOptions);
    const parts = formatter.formatToParts(now);
    
    let year, month, dayObj, hour, minute;
    parts.forEach(p => {
      if (p.type === 'year') year = parseInt(p.value);
      if (p.type === 'month') month = parseInt(p.value) - 1; // 0-indexed
      if (p.type === 'day') dayObj = parseInt(p.value);
      if (p.type === 'hour') hour = parseInt(p.value);
      if (p.type === 'minute') minute = parseInt(p.value);
    });

    const argDate = new Date(year, month, dayObj, hour, minute);
    const currentDayOfWeek = argDate.getDay(); 
    const currentMinutes = hour * 60 + minute;

    // 2. Evaluar reglas
    let activeRule = null;

    for (let rule of BANNER_SCHEDULE) {
      if (rule.day === currentDayOfWeek) {
        const ruleStartMinutes = rule.hour * 60 + rule.minute;
        const ruleEndMinutes = ruleStartMinutes + rule.durationMinutes;

        if (currentMinutes >= ruleStartMinutes && currentMinutes < ruleEndMinutes) {
          activeRule = rule;
          break;
        }
      }
    }

    // 3. Mostrar u ocultar banner
    if (activeRule) {
      if (liveBannerImg.getAttribute('src') !== activeRule.bannerSrc) {
        liveBannerImg.setAttribute('src', activeRule.bannerSrc);
        if (liveBannerText) {
          liveBannerText.textContent = activeRule.text || '';
        }
      }
      if (!liveModal.classList.contains('live-modal--active')) {
         liveModal.classList.add('live-modal--active');
      }
    } else {
      liveModal.classList.remove('live-modal--active');
    }
  }

  // Comprobar al iniciar
  checkLiveSchedule();
  // Comprobar cada 1 minuto (60000 ms)
  setInterval(checkLiveSchedule, 60000);

  // ─── Avisos y Comunicados In-App ─────────────────────────────────────────────
  const announcementBanner = document.getElementById('announcementBanner');
  const announcementTitleText = document.getElementById('announcementTitleText');
  const announcementMessageText = document.getElementById('announcementMessageText');
  const announcementCloseBtn = document.getElementById('announcementCloseBtn');

  async function checkAnnouncements() {
    if (!announcementBanner) return;
    try {
      const res = await fetch('/api/announcement.js');
      if (!res.ok) return;
      const data = await res.json();

      if (data && data.active && data.title && data.message) {
        // Si el usuario ya cerró este aviso específico, no volver a molestarlo
        const dismissedAt = localStorage.getItem('gyp_dismissed_announcement');
        if (dismissedAt && dismissedAt === data.updatedAt) {
          announcementBanner.classList.remove('announcement-banner--visible');
          announcementBanner.setAttribute('aria-hidden', 'true');
          return;
        }

        announcementTitleText.textContent = data.title;
        announcementMessageText.textContent = data.message;
        announcementBanner.classList.add('announcement-banner--visible');
        announcementBanner.setAttribute('aria-hidden', 'false');

        if (announcementCloseBtn) {
          announcementCloseBtn.onclick = () => {
            announcementBanner.classList.remove('announcement-banner--visible');
            announcementBanner.setAttribute('aria-hidden', 'true');
            if (data.updatedAt) {
              localStorage.setItem('gyp_dismissed_announcement', data.updatedAt);
            }
          };
        }
      } else {
        announcementBanner.classList.remove('announcement-banner--visible');
        announcementBanner.setAttribute('aria-hidden', 'true');
      }
    } catch (e) {
      // En caso de fallo de red, no interrumpir la experiencia del oyente
    }
  }

  // Comprobar al cargar y cada 2 minutos
  checkAnnouncements();
  setInterval(checkAnnouncements, 120000);

  // ─── Modal de YouTube Live ──────────────────────────────────────────────────
  const openYoutubeBtn = document.getElementById('openYoutubeBtn');
  const closeYoutubeBtn = document.getElementById('closeYoutubeBtn');
  const youtubeModal = document.getElementById('youtubeModal');
  const youtubeModalOverlay = document.getElementById('youtubeModalOverlay');
  const youtubeIframe = document.getElementById('youtubeIframe');

  const YOUTUBE_LIVE_EMBED = 'https://www.youtube-nocookie.com/embed/live_stream?channel=@SaulFernandoTula';

  function openYoutubeModal() {
    if (!youtubeModal || !youtubeIframe) return;
    youtubeModal.classList.add('youtube-modal--active');
    youtubeModal.setAttribute('aria-hidden', 'false');
    // Asignar el src para iniciar la carga únicamente al abrir
    youtubeIframe.src = youtubeIframe.getAttribute('data-src') || YOUTUBE_LIVE_EMBED;
  }

  function closeYoutubeModal() {
    if (!youtubeModal || !youtubeIframe) return;
    youtubeModal.classList.remove('youtube-modal--active');
    youtubeModal.setAttribute('aria-hidden', 'true');
    // Vaciar src para detener la reproducción de video y audio
    youtubeIframe.src = '';
  }

  if (openYoutubeBtn) {
    openYoutubeBtn.addEventListener('click', openYoutubeModal);
  }

  if (closeYoutubeBtn) {
    closeYoutubeBtn.addEventListener('click', closeYoutubeModal);
  }

  if (youtubeModalOverlay) {
    youtubeModalOverlay.addEventListener('click', closeYoutubeModal);
  }

  // Cerrar modal al presionar Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && youtubeModal && youtubeModal.classList.contains('youtube-modal--active')) {
      closeYoutubeModal();
    }
  });
});
