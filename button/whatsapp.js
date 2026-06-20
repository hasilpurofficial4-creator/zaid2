const {
  default: makeWASocket,
  proto,
  generateWAMessage,
  generateWAMessageFromContent,
  getContentType,
  prepareWAMessageMedia,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const NodeCache = require("node-cache");
const { loadJSON, saveJSON } = require("./helper/function");
const { logSystem } = require("./helper/logger");
const config = require("./settings");

const msgRetryCounterCache = new NodeCache();
const activeSessions = new Map();
const pairingCodes = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

async function connectToWhatsApp(phoneNumber, telegramUserId) {
  const sessionPath = `./database/sessions/${phoneNumber}`;
  
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }
  
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  
  const conn = makeWASocket({
    version: [2, 3000, 1027934701],
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ["Ubuntu", "Chrome", "20.0.00"],
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
    },
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    msgRetryCounterCache,
    defaultQueryTimeoutMs: undefined,
  });
  
  conn.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === "close") {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      
      if (shouldReconnect) {
        connectToWhatsApp(phoneNumber, telegramUserId);
      } else {
        activeSessions.delete(phoneNumber);
        const sessions = loadJSON('./database/paired.json', []);
        const index = sessions.findIndex(s => s.number === phoneNumber);
        if (index !== -1) {
          sessions[index].active = false;
          saveJSON('./database/paired.json', sessions);
        }
      }
    } else if (connection === "open") {
      console.log(`✅ Connected: ${phoneNumber}`);
      logSystem(`WhatsApp Connected: ${phoneNumber}`, 'success');
      activeSessions.set(phoneNumber, conn);
      
      const sessions = loadJSON('./database/paired.json', []);
      const existing = sessions.find(s => s.number === phoneNumber);
      
      if (existing) {
        existing.active = true;
      } else {
        sessions.push({
          number: phoneNumber,
          userId: telegramUserId,
          active: true,
          createdAt: Date.now()
        });
      }
      
      saveJSON('./database/paired.json', sessions);
      
      const { getBuffer } = require('./helper/function');
      const imageBuffer = await getBuffer(config.connectionImage);
      
      const connectionMsg = `
┏━━━━━━━━━━━━━━
┃ ✅ 𝗖𝗢𝗡𝗡𝗘𝗖𝗧𝗘𝗗!
┃
┃ 𝗕𝗼𝘁: ${config.botName}
┃ 𝗢𝘄𝗻𝗲𝗿: @${config.owner}
┃ 𝗡𝘂𝗺𝗯𝗲𝗿: ${phoneNumber}
┃
┃ 𝗧𝘆𝗽𝗲 .menu 𝘁𝗼 𝘀𝘁𝗮𝗿𝘁!
┗━━━━━━━━━━━━━━
      `;
      
      try {
        if (imageBuffer) {
          await conn.sendMessage(phoneNumber + '@s.whatsapp.net', {
            image: imageBuffer,
            caption: connectionMsg.trim()
          });
        } else {
          await conn.sendMessage(phoneNumber + '@s.whatsapp.net', {
            text: connectionMsg.trim()
          });
        }
      } catch (msgError) {
        console.error('Failed to send connection message:', msgError.message);
      }
      
      if (telegramUserId) {
        try {
          const telegramBot = require('./index');
          const teleMsg = `
✅ <b>WhatsApp Connected!</b>

<b>Number:</b> <code>${phoneNumber}</code>
<b>Status:</b> 🟢 Active
<b>Time:</b> ${new Date().toLocaleString()}

Session is ready to use!
          `;
          
          if (imageBuffer) {
            telegramBot.sendPhoto(telegramUserId, imageBuffer, {
              caption: teleMsg,
              parse_mode: 'HTML'
            });
          } else {
            telegramBot.sendMessage(telegramUserId, teleMsg, { parse_mode: 'HTML' });
          }
        } catch (teleError) {
          console.error('Failed to send telegram notification:', teleError.message);
        }
      }
    }
  });
  
  conn.ev.on("creds.update", saveCreds);
  
  conn.ev.on("messages.upsert", async ({ messages }) => {
    try {
      if (!messages[0]) return;
      
      const m = messages[0];
      if (m.key && m.key.remoteJid === "status@broadcast") return;
      if (!m.message) return;
      
      await require("./case")(conn, m);
    } catch (error) {
      console.error("Message handler error:", error);
    }
  });
  
  if (conn.authState.creds.registered) {
    await saveCreds();
    console.log(`✅ Session reloaded: ${phoneNumber}`);
  } else {
    if (telegramUserId) {
      setTimeout(async () => {
        let code = await conn.requestPairingCode(phoneNumber);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        pairingCodes.set(code, { count: 0, phoneNumber });
        console.log(`Pairing Code for ${phoneNumber}: ${code}`);
        return code;
      }, 3000);
    }
  }
  
  conn.public = true;
  return conn;
}

async function requestPairingCode(phoneNumber, telegramUserId) {
  try {
    const conn = await connectToWhatsApp(phoneNumber, telegramUserId);
    
    return new Promise((resolve) => {
      setTimeout(async () => {
        let code = await conn.requestPairingCode(phoneNumber);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log(`🔐 Pairing code for ${phoneNumber}: ${code}`);
        resolve(code);
      }, 3000);
    });
  } catch (error) {
    console.error('Pairing code error:', error);
    throw error;
  }
}

async function loadExistingSessions() {
  console.log('🔄 Scanning for existing sessions...');
  
  // First, scan actual session folders
  const sessionPath = './database/sessions/';
  const sessionFolders = fs.readdirSync(sessionPath).filter(f => {
    return fs.statSync(path.join(sessionPath, f)).isDirectory();
  });
  
  console.log(`📁 Found ${sessionFolders.length} session folders`);
  
  // Load paired.json to get user IDs
  let sessions = loadJSON('./database/paired.json', []);
  
  // Add any sessions that exist in folders but not in paired.json
  for (const folder of sessionFolders) {
    const existing = sessions.find(s => s.number === folder);
    if (!existing) {
      sessions.push({
        number: folder,
        userId: config.telegramOwner, // Default to owner
        active: true,
        createdAt: Date.now()
      });
    }
  }
  
  // Save updated sessions list
  saveJSON('./database/paired.json', sessions);
  
  // Now reload all sessions
  let loadedCount = 0;
  for (const session of sessions) {
    if (session.active && sessionFolders.includes(session.number)) {
      try {
        console.log(`⏳ Loading session: ${session.number}`);
        await connectToWhatsApp(session.number, session.userId);
        loadedCount++;
      } catch (error) {
        console.error(`❌ Failed to load session ${session.number}:`, error.message);
      }
    }
  }
  
  console.log(`✅ Loaded ${loadedCount} sessions successfully\n`);
}

module.exports = {
  connectToWhatsApp,
  requestPairingCode,
  activeSessions,
  loadExistingSessions
};
