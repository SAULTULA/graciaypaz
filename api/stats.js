const KVDB_BUCKET_URL = 'https://kvdb.io/gyp_radio_listeners_store_2026_x9k2/logs';
const ADMIN_PIN = process.env.ADMIN_PIN || 'gyp2026';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verificar PIN de seguridad ("solo visible para mí")
  const pin = req.query?.pin || req.headers['authorization']?.replace('Bearer ', '').trim();
  if (!pin || pin !== ADMIN_PIN) {
    return res.status(401).json({
      error: 'Acceso No Autorizado. PIN incorrecto o ausente.'
    });
  }

  // Si se solicita borrar el historial
  if (req.method === 'DELETE') {
    try {
      await fetch(KVDB_BUCKET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([])
      });
      return res.status(200).json({ success: true, message: 'Historial borrado con éxito.' });
    } catch (err) {
      return res.status(500).json({ error: 'No se pudo limpiar el historial: ' + err.message });
    }
  }

  // Método GET: obtener métricas y logs
  try {
    let logs = [];
    const resGet = await fetch(KVDB_BUCKET_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (resGet.ok) {
      const data = await resGet.json();
      if (Array.isArray(data)) {
        logs = data;
      }
    }

    // Calcular estadísticas en tiempo real
    const totalListeners = logs.length;
    const citiesCount = {};
    const countriesCount = {};
    const platformsCount = {};
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    let activeNow = 0;

    logs.forEach(entry => {
      // Conteo por ciudad
      const city = entry.city || 'Desconocida';
      citiesCount[city] = (citiesCount[city] || 0) + 1;

      // Conteo por país
      const country = entry.country || 'Desconocido';
      countriesCount[country] = (countriesCount[country] || 0) + 1;

      // Conteo por plataforma
      const platform = entry.platform || 'Web';
      platformsCount[platform] = (platformsCount[platform] || 0) + 1;

      // Oyentes recientes (últimos 30 minutos)
      if (entry.timestamp && new Date(entry.timestamp).getTime() >= thirtyMinutesAgo) {
        activeNow++;
      }
    });

    // Ordenar rankings de mayor a menor
    const topCities = Object.entries(citiesCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const topCountries = Object.entries(countriesCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const topPlatforms = Object.entries(platformsCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return res.status(200).json({
      success: true,
      metrics: {
        totalListeners,
        activeNow,
        topCities,
        topCountries,
        topPlatforms
      },
      logs: logs.slice(0, 150) // Devolver las 150 conexiones más recientes
    });

  } catch (err) {
    return res.status(500).json({
      error: 'Error al consultar la base de datos de oyentes: ' + err.message
    });
  }
}
