// WhatsApp Link API - Pairing Code method for reliable linking
const { validateAuth, unauthorized } = require('./_auth-middleware');
const { loadSession, saveSession, saveConfig, loadConfig } = require('./_whatsapp-session');
const { writeFile, readFile } = require('./_github');
const fs = require('fs');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!validateAuth(req)) return unauthorized(res);

  const { action } = req.query;

  // ============ GET STATUS ============
  if (req.method === 'GET' && action === 'status') {
    try {
      const config = await loadConfig();
      const session = await loadSession();
      const linked = !!(session && session.creds);
      return res.status(200).json({
        linked,
        phone: config.linkedPhone || null,
        linkedAt: config.linkedAt || null,
        sessionId: config.sessionId || null
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ============ REQUEST PAIRING CODE ============
  if (req.method === 'POST' && action === 'pair') {
    const { phone } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (!phone || !/^\d{8,15}$/.test(phone.replace(/\D/g, ''))) {
      return res.status(400).json({ error: 'Valid phone number required (digits only, with country code, no + sign). Example: 923001234567' });
    }

    const cleanPhone = phone.replace(/\D/g, '');

    try {
      // Clean up /tmp session dir
      const sessionDir = '/tmp/wa-pair-' + Date.now();
      try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch {}
      fs.mkdirSync(sessionDir, { recursive: true });

      // Dynamic ESM imports
      const baileys = await import('@whiskeysockets/baileys');
      const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers } = baileys;

      const pinoMod = await import('pino');
      const pino = pinoMod.default;

      // Get Baileys version with fallback
      let version;
      try {
        const v = await fetchLatestBaileysVersion();
        version = v.version;
      } catch {
        version = [2, 3000, 1021221121];
      }

      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
      const logger = pino({ level: 'silent' });
      const browser = (Browsers && Browsers.ubuntu) ? Browsers.ubuntu('ZAID BWP') : ['ZAID BWP', 'Chrome', '1.0.0'];

      console.log('Creating socket for pairing, phone:', cleanPhone, 'version:', version);

      const sock = makeWASocket({
        version,
        logger,
        auth: state,
        browser,
        printQRInTerminal: false
      });

      // Request pairing code
      let pairingCode;
      try {
        pairingCode = await sock.requestPairingCode(cleanPhone);
        console.log('Pairing code received:', pairingCode);
      } catch (pairErr) {
        console.error('requestPairingCode error:', pairErr.message);
        try { sock.end(new Error('pair-failed')); } catch {}
        try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch {}
        return res.status(500).json({
          error: 'Failed to get pairing code: ' + pairErr.message,
          hint: 'Make sure the phone number is correct and includes country code (e.g., 923001234567)'
        });
      }

      // Format code as XXXX-XXXX for display
      const displayCode = pairingCode.length === 8
        ? pairingCode.slice(0, 4) + '-' + pairingCode.slice(4)
        : pairingCode;

      // Now wait for the user to enter the code in WhatsApp (up to 55 seconds)
      const result = await new Promise((resolve) => {
        let resolved = false;

        sock.ev.on('connection.update', async (update) => {
          const { connection, lastDisconnect } = update;

          if (connection === 'open' && !resolved) {
            resolved = true;
            const linkedPhone = sock.user?.id?.split(':')[0] || cleanPhone;
            console.log('Pairing successful! Phone:', linkedPhone);

            try { saveCreds(); } catch {}

            // Generate session ID
            const sessionId = 'zaidashiq_' + crypto.randomBytes(8).toString('hex');

            // Save auth state to GitHub
            const authState = {
              creds: state.creds,
              keys: serializeKeys(state.keys),
              linkedAt: new Date().toISOString(),
              phone: linkedPhone
            };

            try {
              const existing = await readFile_safe('whatsapp-session');
              await writeFile('whatsapp-session', authState, existing.sha);
            } catch {
              try { await writeFile('whatsapp-session', authState, null); } catch {}
            }

            await saveConfig({
              linked: true,
              linkedPhone: linkedPhone,
              linkedAt: new Date().toISOString(),
              sessionId: sessionId
            });

            // Send session ID to the paired WhatsApp number
            try {
              const waJid = linkedPhone + '@s.whatsapp.net';
              const sidMessage = `╔═══════════════════════╗\n`
                + `  🏢 *ZAID BWP MANAGEMENT*\n`
                + `  📱 03299931199\n`
                + `╚═══════════════════════╝\n\n`
                + `✅ *WhatsApp Successfully Linked!*\n\n`
                + `🔑 *Your Session ID:*\n`
                + `\`${sessionId}\`\n\n`
                + `━━━━━━━━━━━━━━━━━━\n`
                + `📋 *Setup Instructions:*\n`
                + `1. Go to Vercel Dashboard\n`
                + `2. Select your project\n`
                + `3. Go to Settings → Environment Variables\n`
                + `4. Add variable:\n`
                + `   Name: \`WA_SESSION_ID\`\n`
                + `   Value: \`${sessionId}\`\n`
                + `5. Redeploy the project\n\n`
                + `━━━━━━━━━━━━━━━━━━\n`
                + `📌 _Powered by ZAID BWP_\n`
                + `📞 _03299931199_`;

              await sock.sendMessage(waJid, { text: sidMessage });
              console.log('Session ID sent to', linkedPhone);
            } catch (sendErr) {
              console.error('Failed to send session ID message:', sendErr.message);
            }

            resolve({ status: 'linked', phone: linkedPhone, sessionId });

            setTimeout(() => { try { sock.end(new Error('done')); } catch {} }, 2000);
          }

          if (connection === 'close' && !resolved) {
            resolved = true;
            const err = lastDisconnect?.error?.message || 'Connection closed';
            console.log('Pairing connection closed:', err);
            resolve({ status: 'error', message: 'Connection closed during pairing: ' + err + '. Please try again.' });
          }
        });

        // Safety timeout at 55 seconds
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve({ status: 'timeout', message: 'Pairing timed out (55s). The code was not entered in WhatsApp. Please try again.' });
          }
          try { sock.end(new Error('timeout')); } catch {}
        }, 55000);
      });

      // Clean up
      try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch {}

      // Return pairing code + result
      return res.status(200).json({
        ...result,
        pairingCode: displayCode
      });

    } catch (err) {
      console.error('WhatsApp pair error:', err);
      console.error('Stack:', err.stack);
      return res.status(500).json({ error: err.message });
    }
  }

  // ============ UNLINK ============
  if (req.method === 'DELETE' && action === 'unlink') {
    try {
      try {
        const { sha } = await readFile('whatsapp-session');
        await writeFile('whatsapp-session', null, sha);
      } catch {}
      await saveConfig({ linked: false, linkedPhone: null, linkedAt: null, sessionId: null });
      return res.status(200).json({ success: true, message: 'WhatsApp unlinked' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(400).json({ error: 'Invalid action. Use ?action=status|pair|unlink' });
};

// Helpers
function serializeKeys(keys) {
  const result = {};
  for (const [k, v] of Object.entries(keys)) {
    if (v && typeof v === 'object') result[k] = v;
  }
  return result;
}

async function readFile_safe(section) {
  try { return await readFile(section); } catch { return { data: null, sha: null }; }
}
