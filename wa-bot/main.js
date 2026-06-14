// ZAID BWP WhatsApp Bot - whatsapp-web.js
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// ==================== CLIENT SETUP ====================
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  }
});

// ==================== QR CODE ====================
client.on('qr', (qr) => {
  console.log('\n══════════════════════════════════════');
  console.log('  Scan this QR code with WhatsApp:');
  console.log('  WhatsApp > Settings > Linked Devices');
  console.log('══════════════════════════════════════\n');
  qrcode.generate(qr, { small: true });
});

// ==================== READY ====================
client.once('ready', () => {
  console.log('\n══════════════════════════════════════');
  console.log('  ZAID BWP Bot is READY!');
  console.log('══════════════════════════════════════\n');
});

// ==================== AUTH EVENTS ====================
client.on('authenticated', () => {
  console.log('[AUTH] Authenticated successfully');
});

client.on('auth_failure', (msg) => {
  console.error('[AUTH] Authentication failed:', msg);
});

client.on('disconnected', (reason) => {
  console.log('[DISCONNECTED]', reason);
  console.log('[RECONNECTING]...');
  client.initialize();
});

// ==================== MESSAGE HANDLER ====================
client.on('message', async (msg) => {
  const body = msg.body.trim().toLowerCase();
  const from = msg.from;

  // Ignore status broadcasts
  if (from === 'status@broadcast') return;

  console.log(`[MSG] From: ${from} | Body: ${msg.body}`);

  // Commands
  if (body === 'ping' || body === '!ping') {
    await msg.reply('🏓 Pong! ZAID BWP Bot is alive.');
  }

  if (body === 'help' || body === '!help') {
    const helpText = [
      '🤖 *ZAID BWP Bot Commands*',
      '━━━━━━━━━━━━━━━━━━',
      '📌 *!ping* — Check if bot is online',
      '📌 *!help* — Show this help menu',
      '📌 *!info* — Bot info',
      '📌 *!time* — Current date & time',
      '━━━━━━━━━━━━━━━━━━',
      '👨‍💻 _ZAID BWP DEVELOPER_'
    ].join('\n');
    await msg.reply(helpText);
  }

  if (body === 'info' || body === '!info') {
    await msg.reply('🤖 *ZAID BWP WhatsApp Bot*\n━━━━━━━━━━━━━━━━━━\n📡 Platform: whatsapp-web.js\n👨‍💻 Developer: ZAID ASHIQ BWP\n🌐 https://zaidbwp.vercel.app');
  }

  if (body === 'time' || body === '!time') {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    await msg.reply(`📅 ${dateStr}\n⏰ ${timeStr}`);
  }
});

// ==================== START ====================
console.log('[INIT] Starting ZAID BWP Bot...');
client.initialize();
