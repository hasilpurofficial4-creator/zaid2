// ZAID BWP WhatsApp Bot - Render Docker Deploy
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

// ==================== STATE ====================
let currentQR = null;
let botStatus = 'initializing';
let linkedPhone = null;
let messageLog = [];

// ==================== CHROMIUM PATH ====================
// Docker: /usr/bin/chromium | Local: system Chrome
const CHROMIUM_PATH = process.env.CHROMIUM_PATH ||
  (process.platform === 'linux' ? '/usr/bin/chromium' :
   process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' :
   '/usr/bin/chromium');

console.log('[INIT] Chromium path:', CHROMIUM_PATH);

// ==================== CLIENT SETUP ====================
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './data/wwebjs_auth' }),
  puppeteer: {
    headless: true,
    executablePath: CHROMIUM_PATH,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ]
  }
});

// ==================== QR CODE ====================
client.on('qr', (qr) => {
  currentQR = qr;
  botStatus = 'awaiting_scan';
  console.log('\n══════════════════════════════════════');
  console.log('  Scan this QR code with WhatsApp:');
  console.log('  WhatsApp > Settings > Linked Devices');
  console.log('══════════════════════════════════════\n');
  qrcode.generate(qr, { small: true });
});

// ==================== READY ====================
client.on('ready', () => {
  botStatus = 'ready';
  console.log('\n══════════════════════════════════════');
  console.log('  ZAID BWP Bot is READY!');
  console.log('══════════════════════════════════════\n');
});

// ==================== AUTH EVENTS ====================
client.on('authenticated', (session) => {
  botStatus = 'authenticated';
  console.log('[AUTH] Authenticated successfully');
});

client.on('auth_failure', (msg) => {
  botStatus = 'auth_failed';
  console.error('[AUTH] Authentication failed:', msg);
});

client.on('disconnected', (reason) => {
  botStatus = 'disconnected';
  console.log('[DISCONNECTED]', reason);
  console.log('[RECONNECTING]...');
  currentQR = null;
  client.initialize();
});

// ==================== MESSAGE HANDLER ====================
client.on('message_create', async (message) => {
  const body = message.body.trim().toLowerCase();
  const from = message.from;

  if (from === 'status@broadcast') return;

  const logEntry = {
    time: new Date().toISOString(),
    from,
    body: message.body,
    fromMe: message.fromMe
  };
  messageLog.push(logEntry);
  if (messageLog.length > 100) messageLog.shift();

  console.log(`[MSG] From: ${from} | Body: ${message.body}`);

  if (body === 'ping' || body === '!ping') {
    await message.reply('🏓 Pong! ZAID BWP Bot is alive.');
  }

  if (body === 'help' || body === '!help') {
    const helpText = [
      '🤖 *ZAID BWP Bot Commands*',
      '━━━━━━━━━━━━━━━━━━',
      '📌 *!ping* — Check if bot is online',
      '📌 *!help* — Show this help menu',
      '📌 *!info* — Bot info',
      '📌 *!time* — Current date & time',
      '📌 *item* — Reply with "items"',
      '📌 *itemsms* — Reply with "items.xlsx"',
      '━━━━━━━━━━━━━━━━━━',
      '👨‍💻 _ZAID BWP DEVELOPER_'
    ].join('\n');
    await message.reply(helpText);
  }

  if (body === 'info' || body === '!info') {
    await message.reply('🤖 *ZAID BWP WhatsApp Bot*\n━━━━━━━━━━━━━━━━━━\n📡 Platform: whatsapp-web.js\n👨‍💻 Developer: ZAID ASHIQ BWP\n🌐 https://zaidbwp.vercel.app');
  }

  if (body === 'time' || body === '!time') {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    await message.reply(`📅 ${dateStr}\n⏰ ${timeStr}`);
  }

  if (body === 'item') {
    await client.sendMessage(message.from, 'items');
  }

  if (body === 'itemsms') {
    await message.reply('items.xlsx');
  }
});

// ==================== EXPRESS SERVER ====================
const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_NUMBER = '923244643714@c.us';

// Health check (Render uses this)
app.get('/api/health', (req, res) => {
  res.json({ status: botStatus, uptime: process.uptime() });
});

// QR code as JSON (for API consumers)
app.get('/api/qr', (req, res) => {
  res.json({ qr: currentQR, status: botStatus });
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: botStatus,
    uptime: process.uptime(),
    messageCount: messageLog.length
  });
});

// Message log (last 50)
app.get('/api/messages', (req, res) => {
  res.json(messageLog.slice(-50));
});

// Send message API - called from Vercel frontend
app.post('/api/send', async (req, res) => {
  const { message, to } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });
  if (botStatus !== 'ready') return res.status(503).json({ error: 'Bot not ready', status: botStatus });
  try {
    const target = to ? `${to}@c.us` : TARGET_NUMBER;
    await client.sendMessage(target, message);
    console.log(`[API] Sent message to ${target} (${message.length} chars)`);
    res.json({ success: true, to: target });
  } catch (err) {
    console.error('[API] Send failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Dashboard UI
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZAID BWP Bot</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e0e0e0; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { font-size: 24px; color: #25D366; margin-bottom: 4px; }
    .header p { color: #888; font-size: 14px; }
    .status-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; font-size: 14px; }
    .status-dot { width: 10px; height: 10px; border-radius: 50%; }
    .status-dot.ready { background: #25D366; box-shadow: 0 0 8px #25D366; }
    .status-dot.waiting { background: #f0ad4e; animation: pulse 1.5s infinite; }
    .status-dot.offline { background: #e74c3c; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .qr-container { background: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; text-align: center; }
    .qr-container img { width: 280px; height: 280px; }
    .qr-container p { color: #333; margin-top: 12px; font-size: 13px; }
    .ready-msg { text-align: center; color: #25D366; font-size: 18px; padding: 60px 20px; }
    .ready-msg .icon { font-size: 64px; margin-bottom: 16px; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; width: 100%; max-width: 500px; margin-bottom: 24px; }
    .info-card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 16px; text-align: center; }
    .info-card .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
    .info-card .value { font-size: 20px; font-weight: bold; color: #25D366; margin-top: 4px; }
    .msg-log { width: 100%; max-width: 500px; background: #1a1a1a; border-radius: 12px; padding: 16px; }
    .msg-log h3 { font-size: 14px; color: #888; margin-bottom: 12px; }
    .msg-entry { padding: 8px 0; border-bottom: 1px solid #2a2a2a; font-size: 13px; }
    .msg-entry:last-child { border-bottom: none; }
    .msg-from { color: #25D366; font-weight: 600; }
    .msg-time { color: #666; font-size: 11px; }
    .footer { margin-top: 30px; color: #555; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🤖 ZAID BWP Bot</h1>
    <p>whatsapp-web.js on Render</p>
  </div>
  <div class="status-bar">
    <div class="status-dot" id="statusDot"></div>
    <span id="statusText">Loading...</span>
  </div>
  <div id="qrSection"></div>
  <div class="info-grid" id="infoGrid" style="display:none;">
    <div class="info-card"><div class="label">Uptime</div><div class="value" id="uptime">-</div></div>
    <div class="info-card"><div class="label">Messages</div><div class="value" id="msgCount">0</div></div>
    <div class="info-card"><div class="label">Status</div><div class="value" id="statusVal">-</div></div>
  </div>
  <div class="msg-log" id="msgLog" style="display:none;">
    <h3>Recent Messages</h3>
    <div id="msgList"></div>
  </div>
  <div class="footer">👨‍💻 ZAID ASHIQ BWP &bull; https://zaidbwp.vercel.app</div>
  <script>
    async function refresh() {
      try {
        const [qrRes, statusRes, msgRes] = await Promise.all([
          fetch('/api/qr').then(r => r.json()),
          fetch('/api/status').then(r => r.json()),
          fetch('/api/messages').then(r => r.json())
        ]);
        const dot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        const qrSection = document.getElementById('qrSection');
        const infoGrid = document.getElementById('infoGrid');
        const msgLog = document.getElementById('msgLog');

        // Status dot
        if (qrRes.status === 'ready') {
          dot.className = 'status-dot ready';
          statusText.textContent = 'Connected & Ready';
        } else if (qrRes.status === 'awaiting_scan') {
          dot.className = 'status-dot waiting';
          statusText.textContent = 'Waiting for QR scan...';
        } else {
          dot.className = 'status-dot offline';
          statusText.textContent = qrRes.status;
        }

        // QR code
        if (qrRes.qr) {
          qrSection.innerHTML = '<div class="qr-container"><img src="https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=' + encodeURIComponent(qrRes.qr) + '" alt="QR Code"><p>Open WhatsApp &rarr; Linked Devices &rarr; Link a Device</p></div>';
        } else if (qrRes.status === 'ready') {
          qrSection.innerHTML = '<div class="ready-msg"><div class="icon">✅</div>Bot is connected and running!</div>';
        } else {
          qrSection.innerHTML = '<div class="ready-msg"><div class="icon">⏳</div>' + qrRes.status + '...</div>';
        }

        // Info grid
        infoGrid.style.display = 'grid';
        const h = Math.floor(statusRes.uptime / 3600);
        const m = Math.floor((statusRes.uptime % 3600) / 60);
        document.getElementById('uptime').textContent = h + 'h ' + m + 'm';
        document.getElementById('msgCount').textContent = statusRes.messageCount;
        document.getElementById('statusVal').textContent = qrRes.status === 'ready' ? '🟢' : '🟡';

        // Messages
        if (msgRes.length > 0) {
          msgLog.style.display = 'block';
          document.getElementById('msgList').innerHTML = msgRes.slice().reverse().slice(0, 20).map(m =>
            '<div class="msg-entry"><span class="msg-from">' + (m.fromMe ? '→ You' : m.from) + '</span> <span class="msg-time">' + new Date(m.time).toLocaleTimeString() + '</span><br>' + m.body.substring(0, 100) + '</div>'
          ).join('');
        }
      } catch (e) {
        console.error(e);
      }
    }
    refresh();
    setInterval(refresh, 3000);
  </script>
</body>
</html>`);
});

// Start HTTP server
app.listen(PORT, () => {
  console.log(`[HTTP] Dashboard running on port ${PORT}`);
  console.log(`[HTTP] Open: http://localhost:${PORT}`);
});

// ==================== START BOT ====================
console.log('[INIT] Starting ZAID BWP Bot...');
client.initialize();
