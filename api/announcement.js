const KVDB_ANNOUNCEMENT_URL = 'https://kvdb.io/gyp_radio_listeners_store_2026_x9k2/announcement';
const ADMIN_PIN = process.env.ADMIN_PIN || 'gyp2026';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Obtener el aviso activo (Acceso público para los oyentes)
  if (req.method === 'GET') {
    try {
      const response = await fetch(KVDB_ANNOUNCEMENT_URL, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        return res.status(200).json({ active: false });
      }

      const data = await response.json();
      return res.status(200).json(data || { active: false });
    } catch (err) {
      return res.status(200).json({ active: false, error: err.message });
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
      const { title, message, active, link } = req.body || {};

      const announcementData = {
        active: active !== undefined ? Boolean(active) : true,
        title: (title || '').trim(),
        message: (message || '').trim(),
        link: (link || '').trim(),
        updatedAt: new Date().toISOString()
      };

      const response = await fetch(KVDB_ANNOUNCEMENT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(announcementData)
      });

      if (!response.ok) {
        throw new Error('Error al guardar en almacenamiento KVDB.');
      }

      return res.status(200).json({
        success: true,
        message: 'Aviso guardado correctamente.',
        announcement: announcementData
      });
    } catch (err) {
      return res.status(500).json({ error: 'No se pudo guardar el aviso: ' + err.message });
    }
  }

  // DELETE: Desactivar o borrar aviso
  if (req.method === 'DELETE') {
    try {
      const emptyData = { active: false, updatedAt: new Date().toISOString() };
      await fetch(KVDB_ANNOUNCEMENT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emptyData)
      });
      return res.status(200).json({ success: true, message: 'Aviso desactivado correctamente.' });
    } catch (err) {
      return res.status(500).json({ error: 'No se pudo desactivar el aviso: ' + err.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido.' });
}

