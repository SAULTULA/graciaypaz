const STORAGE_URL = 'https://api.restful-api.dev/objects';
const RECORD_ID = 'ff808181a09d98f701a1c862c54e032e';
const ADMIN_PIN = process.env.ADMIN_PIN || 'gyp2026';
const PUSHALERT_API_KEY = process.env.PUSHALERT_API_KEY || 'pa_E3KWfepWmzNqIEUEUqxrfzIQg2xmitLf_1RGpYv';
const PUSHALERT_API_URL = 'https://api.pushalert.co/rest/v2/web-push/send';

// Memoria de contingencia en tiempo de ejecución del servidor Vercel
let memoryCache = {
  active: false,
  title: '',
  message: '',
  link: '',
  youtubeLive: 'https://www.youtube.com/watch?v=rlNdDdxES4E',
  updatedAt: new Date().toISOString()
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Obtener el aviso activo (Acceso público para los oyentes y la app Android)
  if (req.method === 'GET') {
    try {
      const response = await fetch(`${STORAGE_URL}/${RECORD_ID}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        if (result && result.data) {
          memoryCache = { ...result.data };
          return res.status(200).json(result.data);
        }
      }

      // Si el registro remoto aún no tiene datos o falló, devolver la memoria caché
      return res.status(200).json(memoryCache);
    } catch (err) {
      return res.status(200).json(memoryCache);
    }
  }

  // Verificar PIN de seguridad para crear, editar o borrar
  const pin = req.query?.pin || req.headers['authorization']?.replace('Bearer ', '').trim();
  if (!pin || pin !== ADMIN_PIN) {
    return res.status(401).json({
      error: 'Acceso No Autorizado. PIN incorrecto o ausente.'
    });
  }

  // POST: Guardar o actualizar aviso y enviar Push si corresponde
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (_) {}
      }

      const { title, message, active, link, youtubeLive, sendPush } = body || {};

      const announcementData = {
        active: active !== undefined ? Boolean(active) : true,
        title: (title || '').trim(),
        message: (message || '').trim(),
        link: (link || '').trim(),
        youtubeLive: (youtubeLive || '').trim() || 'https://www.youtube.com/watch?v=rlNdDdxES4E',
        updatedAt: new Date().toISOString()
      };

      // 1. Guardar aviso en almacenamiento remoto
      let saved = false;
      try {
        const updateRes = await fetch(`${STORAGE_URL}/${RECORD_ID}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'gracia_y_paz_announcement',
            data: announcementData
          })
        });
        if (updateRes.ok) {
          saved = true;
        }
      } catch (e) {
        console.warn('Fallo actualización remota:', e);
      }

      // Actualizar memoria local del servidor
      memoryCache = { ...announcementData };

      // 2. Disparar notificación Push automática a todos los celulares a través de PushAlert
      let pushResult = null;
      const shouldSendPush = (sendPush !== false) && announcementData.active && announcementData.title && announcementData.message;

      if (shouldSendPush) {
        try {
          const pushParams = new URLSearchParams({
            title: announcementData.title.slice(0, 64),
            message: announcementData.message.slice(0, 192),
            url: 'https://gracia-y-paz.vercel.app/',
            icon: 'https://gracia-y-paz.vercel.app/public/logo.png'
          });

          const pushRes = await fetch(PUSHALERT_API_URL, {
            method: 'POST',
            headers: {
              'Authorization': `api_key=${PUSHALERT_API_KEY}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: pushParams.toString()
          });

          if (pushRes.ok) {
            pushResult = await pushRes.json();
          } else {
            const errText = await pushRes.text();
            console.warn('PushAlert respondió con error:', pushRes.status, errText);
          }
        } catch (pushErr) {
          console.warn('Error al conectar con PushAlert:', pushErr);
        }
      }

      const isPushSuccess = Boolean(pushResult && pushResult.success);

      return res.status(200).json({
        success: true,
        message: isPushSuccess
          ? '¡Aviso publicado y notificación push enviada a todos los celulares con éxito!'
          : 'Aviso guardado correctamente en la web.',
        announcement: announcementData,
        storedRemotely: saved,
        pushSent: isPushSuccess,
        pushDetails: pushResult
      });
    } catch (err) {
      return res.status(500).json({ error: 'No se pudo guardar el aviso: ' + err.message });
    }
  }

  // DELETE: Desactivar o borrar aviso
  if (req.method === 'DELETE') {
    try {
      const emptyData = {
        active: false,
        title: '',
        message: '',
        link: '',
        youtubeLive: memoryCache.youtubeLive || '',
        updatedAt: new Date().toISOString()
      };

      try {
        await fetch(`${STORAGE_URL}/${RECORD_ID}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'gracia_y_paz_announcement',
            data: emptyData
          })
        });
      } catch (_) {}

      memoryCache = { ...emptyData };
      return res.status(200).json({ success: true, message: 'Aviso desactivado correctamente.' });
    } catch (err) {
      return res.status(500).json({ error: 'No se pudo desactivar el aviso: ' + err.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido.' });
}
