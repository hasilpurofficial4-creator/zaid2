// WhatsApp Status API - Check Railway bot health
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' });
  }

  const serviceUrl = process.env.WA_SERVICE_URL;
  const apiSecret = process.env.WA_API_SECRET || 'banu-saeed-secret-2024';

  if (!serviceUrl) {
    return res.status(200).json({
      linked: false,
      error: 'WA_SERVICE_URL not set',
      hint: 'Set WA_SERVICE_URL env var on Vercel to your Railway whatsapp-service URL'
    });
  }

  const targetUrl = serviceUrl.replace(/\/$/, '');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    // Check status endpoint
    const statusRes = await fetch(`${targetUrl}/status`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!statusRes.ok) {
      return res.status(200).json({
        linked: false,
        error: 'Bot returned HTTP ' + statusRes.status,
        serviceUrl: targetUrl
      });
    }

    const status = await statusRes.json();

    return res.status(200).json({
      linked: status.whatsappConnected || false,
      botRunning: status.botRunning || false,
      online: status.online || false,
      pendingMessages: status.pendingMessages || 0,
      sentMessages: status.sentMessages || 0,
      adminNumber: status.adminNumber || 'unknown',
      uptime: status.uptime || 'unknown',
      recentLogs: status.recentLogs || [],
      serviceUrl: targetUrl
    });
  } catch (err) {
    console.error('[WA-STATUS] Error:', err.message);
    return res.status(200).json({
      linked: false,
      error: 'Bot unreachable: ' + err.message,
      serviceUrl: targetUrl,
      hint: 'Is the Railway whatsapp-service running?'
    });
  }
};
