const STORAGE_URL = 'https://api.restful-api.dev/objects';
const RECORD_ID = 'ff808181a09d98f701a1c862c54e032e';
const ADMIN_PIN = process.env.ADMIN_PIN || 'gyp2026';

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

  // POST: Guardar o actualizar aviso
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (_) {}
      }

      const { title, message, active, link, youtubeLive } = body || {};

      const announcementData = {
        active: active !== undefined ? Boolean(active) : true,
        title: (title || '').trim(),
        message: (message || '').trim(),
        link: (link || '').trim(),
        youtubeLive: (youtubeLive || '').trim() || 'https://www.youtube.com/watch?v=rlNdDdxES4E',
        updatedAt: new Date().toISOString()
      };

      // Intentar actualizar vía PUT
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

      // Siempre actualizar memoria caché del servidor
      memoryCache = { ...announcementData };

      return res.status(200).json({
        success: true,
        message: 'Aviso guardado correctamente.',
        announcement: announcementData,
        storedRemotely: saved
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
