const ZENO_STREAM_URL = 'https://stream.zeno.fm/mfer4shs398uv';
const KVDB_BUCKET_URL = 'https://kvdb.io/gyp_radio_listeners_store_2026_x9k2/logs';

// Helper para guardar el oyente con timeout y sin bloquear la redirección
async function logListener(req) {
  try {
    const cityHeader = req.headers['x-vercel-ip-city'] || 'Desconocida';
    const city = cityHeader !== 'Desconocida' ? decodeURIComponent(cityHeader) : 'Desconocida';
    const country = req.headers['x-vercel-ip-country'] || 'Desconocido';
    const region = req.headers['x-vercel-ip-country-region'] || '';
    const lat = req.headers['x-vercel-ip-latitude'] || null;
    const lon = req.headers['x-vercel-ip-longitude'] || null;
    const userAgent = req.headers['user-agent'] || 'Desconocido';
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'IP Oculta';

    // Detectar origen de reproducción
    let platform = 'Web / Navegador';
    if (userAgent.includes('ExoPlayer') || userAgent.includes('Dalvik') || userAgent.includes('Android')) {
      platform = 'App Android Nativa';
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      platform = 'iOS / Apple';
    }

    const newEntry = {
      id: Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      city: city,
      country: country,
      region: region,
      lat: lat,
      lon: lon,
      platform: platform,
      userAgent: userAgent,
      ip: ip.split(',')[0].trim()
    };

    // Crear un timeout de 4500ms para garantizar que KVDB complete lectura y escritura
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    // Obtener lista previa
    let logs = [];
    try {
      const resGet = await fetch(KVDB_BUCKET_URL, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      if (resGet.ok) {
        const data = await resGet.json();
        if (Array.isArray(data)) {
          logs = data;
        }
      }
    } catch (e) {
      // Si el bucket es nuevo o no existe clave aún, iniciamos array vacío
    }

    // Insertar al inicio y mantener máximo los últimos 500 registros
    logs.unshift(newEntry);
    if (logs.length > 500) {
      logs = logs.slice(0, 500);
    }

    // Guardar lista actualizada en KVDB
    await fetch(KVDB_BUCKET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(logs),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
  } catch (err) {
    // Silenciar error para no afectar en ningún caso el streaming de la radio
    console.error('Error no crítico registrando oyente:', err.message);
  }
}

export default async function handler(req, res) {
  // Configurar cabeceras CORS por si se consulta via XHR
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Ejecutamos el registro de oyente de manera controlada (con timeout rápido)
  await logListener(req);

  // Redirección HTTP 307 Temporal e inmediata al stream de Zeno
  // (307 evita caché del navegador/reproductor para que futuros cambios de URL surtan efecto enseguida)
  res.writeHead(307, {
    'Location': ZENO_STREAM_URL,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.end();
}
