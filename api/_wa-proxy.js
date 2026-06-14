// WhatsApp Proxy Helper - forwards requests to Render bot backend
// Set RENDER_WA_URL env var on Vercel to your Render deployment URL

async function proxyToRender(req, res) {
  const botUrl = process.env.RENDER_WA_URL;

  if (!botUrl) {
    return res.status(503).json({
      error: 'WhatsApp bot not configured. Set RENDER_WA_URL env var on Vercel.',
      hint: 'Deploy the whatsapp-bot folder to Render and set the URL as RENDER_WA_URL'
    });
  }

  const targetUrl = botUrl.replace(/\/$/, '') + req.url;

  try {
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json'
    };
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    const fetchOpts = { method: req.method, headers };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOpts.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOpts);
    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (err) {
    console.error('Render proxy error:', err.message);
    return res.status(502).json({
      error: 'WhatsApp bot unreachable: ' + err.message,
      hint: 'Check if Render bot is running at ' + botUrl
    });
  }
}

module.exports = { proxyToRender };
