// WhatsApp Send API - Proxy to whatsapp-service on Render
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const serviceUrl = process.env.WA_SERVICE_URL;
  const apiSecret = process.env.WA_API_SECRET || '';

  if (!serviceUrl) {
    return res.status(503).json({ error: 'WA_SERVICE_URL not configured' });
  }

  const { message, to } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'message required' });
  }

  try {
    const targetUrl = serviceUrl.replace(/\/$/, '') + '/send';
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: apiSecret,
        message: message,
        to: to || process.env.ADMIN_NUMBER || '923244643714'
      })
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    console.error('WA send proxy error:', err.message);
    return res.status(502).json({ error: 'WhatsApp service unreachable: ' + err.message });
  }
};
