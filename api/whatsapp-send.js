// WhatsApp Send API - Proxy to whatsapp-service on Railway
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const serviceUrl = process.env.WA_SERVICE_URL;
  const apiSecret = process.env.WA_API_SECRET || 'banu-saeed-secret-2024';

  if (!serviceUrl) {
    console.error('[WA-PROXY] WA_SERVICE_URL not configured');
    return res.status(503).json({ error: 'WA_SERVICE_URL not configured', success: false });
  }

  const { message, to } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'message required', success: false });
  }

  const targetUrl = serviceUrl.replace(/\/$/, '') + '/send';

  // If specific 'to' number, send to that one; otherwise send to ALL admins
  const targetNumbers = to
    ? [to]
    : (process.env.ADMIN_NUMBER || '923299931199').split(',').map(n => n.trim()).filter(Boolean);

  try {
    const results = [];

    // Send to all admin numbers in parallel
    const sendPromises = targetNumbers.map(async (targetNumber) => {
      try {
        console.log('[WA-PROXY] Sending to +' + targetNumber + ' via ' + targetUrl);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: apiSecret,
            message: message,
            to: targetNumber
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        const data = await response.json();
        console.log('[WA-PROXY] +' + targetNumber + ': ' + (data.success ? 'queued' : data.error || 'failed'));
        results.push({ number: targetNumber, ...data });
      } catch (err) {
        console.error('[WA-PROXY] +' + targetNumber + ' error: ' + err.message);
        results.push({ number: targetNumber, success: false, error: err.message });
      }
    });

    await Promise.all(sendPromises);

    const allSuccess = results.every(r => r.success);
    return res.status(200).json({
      success: allSuccess,
      results,
      message: `Sent to ${results.filter(r => r.success).length}/${results.length} admins`
    });
  } catch (err) {
    console.error('[WA-PROXY] Error: ' + err.message);
    return res.status(502).json({ success: false, error: 'WhatsApp service unreachable: ' + err.message });
  }
};
